# models/sunBurst_Chart.py
import os
import json
from datetime import datetime
from config import Config

class LogAnalyzer:
    def __init__(self, json_file=None):
        self.json_file = json_file or Config.JSON_FILE
        self.parsed_data = {}
        self.last_modified = None

    def is_file_updated(self):
        if not os.path.exists(self.json_file):
            return False
        current_modified = os.path.getmtime(self.json_file)
        if self.last_modified != current_modified:
            self.last_modified = current_modified
            return True
        return False

    def parse_log_file(self):
        """Parse the JSON log file grouped by date"""
        if not os.path.exists(self.json_file):
            return False

        if not self.is_file_updated() and self.parsed_data:
            return True

        try:
            with open(self.json_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)

            self.parsed_data = {}
            for date, sessions in raw_data.items():
                self.parsed_data[date] = []
                for entry in sessions:
                    converted_entry = {
                        "original_date": date,
                        "start_time": entry["start"],
                        "end_time": entry["end"],
                        "app_name": entry["app"],
                        "window_title": entry.get("title", ""),
                        "duration": entry.get("duration", 0),
                        "session_end_reason": entry.get("end_reason", "unknown"),
                    }
                    self.parsed_data[date].append(converted_entry)

        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing JSON file: {e}")
            self.parsed_data = {}
            return False

        return True

    def get_merged_sessions(self, days=None, date_filter=None):
        """Return merged sessions grouped by app for a given date"""
        if not self.parse_log_file():
            return {}

        if date_filter:
            sessions = self.parsed_data.get(date_filter, [])
        else:
            # Flatten all dates if no filter
            sessions = [s for d in self.parsed_data.values() for s in d]

        if not sessions:
            return {}

        # Parse datetime for sorting and merging
        for entry in sessions:
            entry["start_dt"] = datetime.strptime(
                f'{entry["original_date"]} {entry["start_time"]}', "%Y-%m-%d %H:%M:%S"
            )
            entry["end_dt"] = datetime.strptime(
                f'{entry["original_date"]} {entry["end_time"]}', "%Y-%m-%d %H:%M:%S"
            )

        sessions.sort(key=lambda x: x["start_dt"])

        # Merge logic
        merged = []
        current_app = sessions[0]["app_name"]
        start_time = sessions[0]["start_dt"]
        end_time = sessions[0]["end_dt"]

        for i in range(1, len(sessions)):
            entry = sessions[i]
            if entry["app_name"] == current_app and entry["start_dt"] <= end_time:
                end_time = max(end_time, entry["end_dt"])
            else:
                merged.append(
                    {
                        "app_name": current_app.lower(),
                        "start": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "end": end_time.strftime("%Y-%m-%d %H:%M:%S"),
                    }
                )
                current_app = entry["app_name"]
                start_time = entry["start_dt"]
                end_time = entry["end_dt"]

        merged.append(
            {
                "app_name": current_app.lower(),
                "start": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "end": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        )

        # Group by app
        grouped = {}
        for session in merged:
            app = session["app_name"]
            line = f'{session["start"]} - {session["end"]}'
            grouped.setdefault(app, []).append(line)

        return grouped
