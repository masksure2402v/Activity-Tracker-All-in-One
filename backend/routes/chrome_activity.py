# chrome_activity.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from config import Config
import json
import os

chrome_bp = Blueprint("chrome_activity", __name__)

os.makedirs(os.path.dirname(Config.CHROME_JSON_FILE), exist_ok=True)

@chrome_bp.route("/chrome-activity", methods=["POST", "GET"])
def chrome_activity():
    """
    POST = Save Chrome activity data
    GET  = Return stored Chrome activity logs
    """
    try:
        if request.method == "GET":
            # Return existing Chrome activity logs
            if not os.path.exists(Config.CHROME_JSON_FILE):
                return jsonify([])  # No data yet

            with open(Config.CHROME_JSON_FILE, "r", encoding="utf-8") as f:
                try:
                    logs = json.load(f)
                except json.JSONDecodeError:
                    logs = []
            return jsonify(logs)

        elif request.method == "POST":
            data = request.get_json()

            if not data or "sessions" not in data:
                return jsonify({"error": "Invalid data format"}), 400

            # Load existing logs or create file if missing
            if os.path.exists(Config.CHROME_JSON_FILE):
                with open(Config.CHROME_JSON_FILE, "r", encoding="utf-8") as f:
                    try:
                        logs = json.load(f)
                    except json.JSONDecodeError:
                        logs = []
            else:
                logs = []
                with open(Config.CHROME_JSON_FILE, "w", encoding="utf-8") as f:
                    json.dump(logs, f)

            # Append new sessions
            for session in data["sessions"]:
                logs.append({
                    "app": "chrome.exe",
                    "domain": session.get("domain"),
                    "url": session.get("url"),
                    "start_time": session.get("start_time"),
                    "end_time": session.get("end_time"),
                    "recorded_at": datetime.utcnow().isoformat()
                })

            # Save back to file
            with open(Config.CHROME_JSON_FILE, "w", encoding="utf-8") as f:
                json.dump(logs, f, indent=2)

            return jsonify({"status": "success", "saved": len(data["sessions"])}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
