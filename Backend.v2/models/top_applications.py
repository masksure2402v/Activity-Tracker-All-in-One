# models/analyzer.py
import json
from collections import defaultdict
from pathlib import Path
from config import Config

LOG_FILE = Path(Config.JSON_FILE)  

def load_logs():
    if not LOG_FILE.exists():
        return {}
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_top_applications(date: str = None):
    logs = load_logs()
    app_durations = defaultdict(int)

    if date:  # filter by specific date
        sessions = logs.get(date, [])
        logs_to_process = {date: sessions}
    else:  # use all dates
        logs_to_process = logs

    # sum durations
    for sessions in logs_to_process.values():
        for entry in sessions:
            app = str(entry.get("app", "")).lower()
            duration = entry.get("duration", 0)
            try:
                duration = int(duration)
            except (ValueError, TypeError):
                duration = 0
            app_durations[app] += duration

    total = sum(app_durations.values())
    if total == 0:
        return []

    # convert to minutes + percentage
    result = []
    for app, duration in sorted(app_durations.items(), key=lambda x: x[1], reverse=True):
        app_name = app.split(".")[0].capitalize() if app else "Unknown"
        minutes = round(duration / 60, 1)
        percent = round((duration / total) * 100)
        result.append({
            "name": app_name,
            "time": minutes,
            "percentage": percent
        })
    return result


