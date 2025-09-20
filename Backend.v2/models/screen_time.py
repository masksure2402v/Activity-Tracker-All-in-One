# models/screen_time.py
import json
from pathlib import Path
from config import Config

LOG_FILE = Path(Config.JSON_FILE)

def load_logs():
    if not LOG_FILE.exists():
        return {}
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_total_minutes(date: str):
    logs = load_logs()
    sessions = logs.get(date, [])
    total_seconds = sum(int(entry.get("duration", 0)) for entry in sessions)
    return {"total_minutes": round(total_seconds / 60, 2)}
