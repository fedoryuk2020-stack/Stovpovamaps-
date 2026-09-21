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
                "average_minutes": 0,
                "today_alerts": 0,
                "today_minutes": 0
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
def belongs_to_odessa(item):
    values = [
        item.get("name"),
        item.get("oblast"),
        item.get("region"),
        item.get("region_name"),
        item.get("oblast_name")
    ]
    for value in values:
        if value and str(value).strip().lower() == REGION_NAME.lower():
            return True
    return False
def item_is_active(item):
    # Явные поля активности
    for key in (
        "active",
        "is_active",
        "isActive"
    ):
        if key in item:
            value = item.get(key)
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                value = value.lower().strip()
                if value in (
                    "true",
                    "1",
                    "active",
                    "alert",
                    "тривога"
                ):
                    return True
                if value in (
                    "false",
                    "0",
                    "inactive",
                    "safe",
                    "ended",
                    "finished",
                    "відбій"
                ):
                    return False
    # status / state
    for key in (
        "status",
        "state"
    ):
        if key in item:
            value = item.get(key)
            if isinstance(value, str):
                value = value.lower().strip()
                if value in (
                    "alert",
                    "active",
                    "alarm",
                    "тривога"
                ):
                    return True
                if value in (
                    "safe",
                    "inactive",
                    "ended",
                    "finished",
                    "відбій"
                ):
                    return False
    # Наличие даты окончания
    for key in (
        "finished_at",
        "finishedAt",
        "ended_at",
        "endedAt",
        "end",
        "ended"
    ):
        if item.get(key):
            return False
    # Если есть since — считаем активной
    if item.get("since"):
        return True
    return False
def odessa_alert_active(data):
    oblasts = data.get(
        "oblasts",
        []
    )
    raions = data.get(
        "raions",
        []
    )
    # Проверяем область
    for item in oblasts:
        if belongs_to_odessa(item):
            active = item_is_active(item)
            print(
                "Oblast:",
                item.get("name"),
                "active:",
                active
            )
            if active:
                return True
    # Проверяем районы
    for item in raions:
        if belongs_to_odessa(item):
            active = item_is_active(item)
            print(
                "Raion:",
                item.get("name"),
                "active:",
                active
            )
            if active:
                return True
    return False
def get_started_time(data):
    dates = []
    for item in data.get("oblasts", []):
        if (
            belongs_to_odessa(item)
            and item_is_active(item)
        ):
            parsed = parse_date(
                item.get("since")
            )
            if parsed:
                dates.append(parsed)
    for item in data.get("raions", []):
        if (
            belongs_to_odessa(item)
            and item_is_active(item)
        ):
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
    completed = []
    for item in history:
        if (
            item.get("type") == "alert"
            and item.get("duration_minutes") is not None
        ):
            completed.append(item)
    total_minutes = sum(
        int(
            item.get(
                "duration_minutes",
                0
            )
        )
        for item in completed
    )
    alerts = len(completed)
    average_minutes = (
        round(total_minutes / alerts)
        if alerts
        else 0
    )
    # Сегодня по UTC
    today = now_utc().date()
    today_alerts = 0
    today_minutes = 0
    for item in completed:
        started = parse_date(
            item.get("time")
        )
        if not started:
            continue
        if started.astimezone(timezone.utc).date() == today:
            today_alerts += 1
            today_minutes += int(
                item.get(
                    "duration_minutes",
                    0
                )
            )
    data["stats"] = {
        "alerts": alerts,
        "total_minutes": total_minutes,
        "average_minutes": average_minutes,
        "today_alerts": today_alerts,
        "today_minutes": today_minutes
    }
def main():
    # ==========================================
    # Предыдущий статус
    # ==========================================
    data = load_status()
    previous_status = data.get(
        "status",
        "safe"
    )
    previous_started = parse_date(
        data.get(
            "alert_started_at"
        )
    )
    # ==========================================
    # NEPTUN
    # ==========================================
    neptun = get_neptun()
    print(
        "NEPTUN data received successfully"
    )
    # ==========================================
    # Текущий статус
    # ==========================================
    active = odessa_alert_active(
        neptun
    )
    current_time = now_utc()
    new_status = (
        "alert"
        if active
        else "safe"
    )
    print(
        "Previous status:",
        previous_status
    )
    print(
        "Current status:",
        new_status
    )
    # ==========================================
    # НОВАЯ ТРЕВОГА
    # ==========================================
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
        data.setdefault(
            "history",
            []
        )
        data["history"].insert(
            0,
            {
                "type": "alert",
                "time": iso(started),
                "duration_minutes": None
            }
        )
        print(
            "NEW ALERT detected"
        )
    # ==========================================
    # ТРЕВОГА ПРОДОЛЖАЕТСЯ
    # ==========================================
    elif (
        new_status == "alert"
        and previous_status == "alert"
    ):
        if previous_started:
            data["alert_started_at"] = iso(
                previous_started
            )
        print(
            "Alert is still active"
        )
    # ==========================================
    # ОТБОЙ
    # ==========================================
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
        data.setdefault(
            "history",
            []
        )
        # Находим последнюю незавершённую тревогу
        found = False
        for item in data["history"]:
            if (
                item.get("type") == "alert"
                and item.get("duration_minutes") is None
            ):
                item["duration_minutes"] = duration
                found = True
                break
        # Если начало почему-то потерялось,
        # создаём полноценную запись
        if not found:
            data["history"].insert(
                0,
                {
                    "type": "alert",
                    "time": iso(started),
                    "duration_minutes": duration
                }
            )
        # Отдельное событие отбоя
        data["history"].insert(
            0,
            {
                "type": "end",
                "time": iso(current_time),
                "duration_minutes": duration
            }
        )
        data["alert_started_at"] = None
        print(
            "ALERT ENDED"
        )
        print(
            "Duration:",
            duration,
            "minutes"
        )
    # ==========================================
    # Сохраняем
    # ==========================================
    data["status"] = new_status
    data["region"] = REGION_NAME
    data["updated_at"] = iso(
        current_time
    )
    data["source"] = "NEPTUN"
    data.setdefault(
        "history",
        []
    )
    data["history"] = data[
        "history"
    ][:100]
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
    print(
        "Statistics:",
        data["stats"]
    )
if __name__ == "__main__":
    main()
