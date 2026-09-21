import json
import os
from datetime import datetime, timezone

import requests


API_URL = "https://neptun.in.ua/api/v1/alerts"
STATUS_FILE = "status.json"

REGION_NAME = "Одеська область"


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def parse_date(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    except Exception:
        return None


def minutes_between(start, end):
    if not start or not end:
        return 0

    seconds = (end - start).total_seconds()

    return max(0, round(seconds / 60))


def load_status():

    if not os.path.exists(STATUS_FILE):
        return {
            "status": "safe",
            "region": REGION_NAME,
            "updated_at": None,
            "alert_started_at": None,
            "history": [],
            "stats": {
                "alerts": 0,
                "total_minutes": 0,
                "average_minutes": 0
            },
            "source": "NEPTUN"
        }

    with open(
        STATUS_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


def save_status(data):

    with open(
        STATUS_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2
        )


def get_neptun():

    response = requests.get(
        API_URL,
        timeout=20,
        headers={
            "User-Agent": "OdesaAlert/1.0"
        }
    )

    response.raise_for_status()

    return response.json()


def odessa_alert_active(data):

    oblasts = data.get(
        "oblasts",
        []
    )

    raions = data.get(
        "raions",
        []
    )

    # Тривога по всій області
    for item in oblasts:

        if (
            item.get("name") == REGION_NAME
            or item.get("oblast") == REGION_NAME
        ):
            return True

    # Тривога хоча б в одному районі області
    for item in raions:

        if item.get("oblast") == REGION_NAME:
            return True

    return False


def get_started_time(data):

    oblasts = data.get(
        "oblasts",
        []
    )

    raions = data.get(
        "raions",
        []
    )

    dates = []

    for item in oblasts:

        if (
            item.get("name") == REGION_NAME
            or item.get("oblast") == REGION_NAME
        ):

            parsed = parse_date(
                item.get("since")
            )

            if parsed:
                dates.append(parsed)

    for item in raions:

        if item.get("oblast") == REGION_NAME:

            parsed = parse_date(
                item.get("since")
            )

            if parsed:
                dates.append(parsed)

    if not dates:
        return None

    return min(dates)


def update_statistics(data):

    history = data.get(
        "history",
        []
    )

    completed = [
        item
        for item in history
        if (
            item.get("type") == "alert"
            and item.get("duration_minutes") is not None
        )
    ]

    total = sum(
        int(item.get("duration_minutes", 0))
        for item in completed
    )

    count = len(completed)

    average = (
        round(total / count)
        if count
        else 0
    )

    data["stats"] = {
        "alerts": count,
        "total_minutes": total,
        "average_minutes": average
    }


def main():

    data = load_status()

    previous_status = data.get(
        "status",
        "safe"
    )

    previous_started = parse_date(
        data.get("alert_started_at")
    )

    neptun = get_neptun()

    active = odessa_alert_active(
        neptun
    )

    current_time = now_utc()

    new_status = (
        "alert"
        if active
        else "safe"
    )

    # =========================
    # НОВА ТРИВОГА
    # =========================

    if (
        new_status == "alert"
        and previous_status != "alert"
    ):

        started = (
            get_started_time(neptun)
            or current_time
        )

        data["alert_started_at"] = iso(
            started
        )

        data["history"].insert(
            0,
            {
                "type": "alert",
                "time": iso(started),
                "duration_minutes": None
            }
        )


    # =========================
    # ПРОДОВЖЕННЯ ТРИВОГИ
    # =========================

    elif (
        new_status == "alert"
        and previous_status == "alert"
    ):

        if previous_started:
            data["alert_started_at"] = iso(
                previous_started
            )


    # =========================
    # ВІДБІЙ
    # =========================

    elif (
        new_status == "safe"
        and previous_status == "alert"
    ):

        started = (
            previous_started
            or current_time
        )

        duration = minutes_between(
            started,
            current_time
        )

        for item in data["history"]:

            if (
                item.get("type") == "alert"
                and item.get("duration_minutes") is None
            ):

                item["duration_minutes"] = duration

                break

        data["history"].insert(
            0,
            {
                "type": "end",
                "time": iso(current_time),
                "duration_minutes": duration
            }
        )

        data["alert_started_at"] = None


    # =========================
    # ОБНОВЛЕННЯ
    # =========================

    data["status"] = new_status

    data["region"] = REGION_NAME

    data["updated_at"] = iso(
        current_time
    )

    data["source"] = "NEPTUN"


    # Оставляем последние 50 событий
    data["history"] = data[
        "history"
    ][:50]


    update_statistics(
        data
    )


    save_status(
        data
    )


    print(
        "Odesa Alert:",
        new_status
    )

    print(
        "Updated:",
        data["updated_at"]
    )


if __name__ == "__main__":
    main()
