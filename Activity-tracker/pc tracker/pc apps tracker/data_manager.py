# data_manager.py
import json
import os

class DataManager:
    """Save sessions grouped by date:
    {
      "2025-08-15": [
        { "start":"01:58:01", "end":"01:58:11", "app":"Code.exe",
          "title":"app_usage.json - Code - Visual Studio Code",
          "duration":10, "end_reason":"app_switch" }
      ]
    }
    """

    def __init__(self, json_file):
        self.json_file = json_file

    def log_app_change(self, app_info, start_time, end_time, duration=None, end_reason="app_switch"):
        date_str = start_time.strftime('%Y-%m-%d')
        entry = {
            "start": start_time.strftime('%H:%M:%S'),
            "end": end_time.strftime('%H:%M:%S'),
            "app": app_info.get('app_name', ''),
            "title": app_info.get('window_title', ''),
            "duration": int(round(duration)) if duration is not None else 0,
            "end_reason": end_reason
        }
        self._append_entry(date_str, entry)

    def _append_entry(self, date_str, entry):
        try:
            data = {}
            if os.path.exists(self.json_file):
                try:
                    with open(self.json_file, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        if content:
                            loaded = json.loads(content)
                            # If file already uses the desired dict-by-date format
                            if isinstance(loaded, dict):
                                data = loaded
                            # Convert legacy list-of-sessions format to dict-by-date if possible
                            elif isinstance(loaded, list):
                                grouped = {}
                                for item in loaded:
                                    if not isinstance(item, dict):
                                        continue
                                    d = item.get('date')
                                    t = item.get('time', {})
                                    start = t.get('start', '')
                                    end = t.get('end', '')
                                    app = item.get('app_name', '')
                                    title = item.get('window_title', '')
                                    dur = int(round(item.get('duration', 0)))
                                    reason = item.get('session_end_reason', '')
                                    new = {
                                        "start": start,
                                        "end": end,
                                        "app": app,
                                        "title": title,
                                        "duration": dur,
                                        "end_reason": reason
                                    }
                                    if d:
                                        grouped.setdefault(d, []).append(new)
                                data = grouped
                            else:
                                data = {}
                except json.JSONDecodeError:
                    print(f"Warning: JSON file {self.json_file} is corrupted, creating new structure")
                    data = {}

            # ensure date key exists and append
            data.setdefault(date_str, [])
            data[date_str].append(entry)

            with open(self.json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

        except Exception as e:
            print(f"Error saving JSON data: {e}")
            self._save_backup(date_str, entry)

    def _save_backup(self, date_str, entry):
        try:
            backup_file = f"{self.json_file}.backup"
            backup_data = {}
            if os.path.exists(backup_file):
                try:
                    with open(backup_file, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        if content:
                            backup_data = json.loads(content)
                except Exception:
                    backup_data = {}
            backup_data.setdefault(date_str, []).append(entry)
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            print(f"Session data saved to backup file: {backup_file}")
        except Exception:
            print("Could not save backup data")
