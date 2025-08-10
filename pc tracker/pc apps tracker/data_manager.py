# data_manager.py
import json
import os
from datetime import datetime

class DataManager:
    """Manages data persistence for app usage tracking"""
    
    def __init__(self, json_file):
        self.json_file = json_file
        self.session_data = []
    
    def log_app_change(self, app_info, start_time, end_time, duration=None, end_reason="app_switch"):
        """Log an app change to the session data with start and end times"""
        date_str = start_time.strftime('%Y-%m-%d')
        start_time_str = start_time.strftime('%H:%M:%S')
        end_time_str = end_time.strftime('%H:%M:%S')
        
        session_entry = {
            'date': date_str,
            'time': {
                'start': start_time_str,
                'end': end_time_str
            },
            'app_name': app_info['app_name'],
            'window_title': app_info['window_title'],
            'duration': duration if duration else 0,
            'session_end_reason': end_reason
        }
        
        self.session_data.append(session_entry)
        self.save_json_data()
    
    def save_json_data(self):
        """Save session data to JSON file with error handling"""
        try:
            existing_data = []
            if os.path.exists(self.json_file):
                try:
                    with open(self.json_file, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        if content:
                            existing_data = json.loads(content)
                except json.JSONDecodeError:
                    print(f"Warning: JSON file {self.json_file} is corrupted, creating new one")
                    existing_data = []
            
            existing_data.extend(self.session_data)
            
            with open(self.json_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, indent=2, ensure_ascii=False)
            
            self.session_data = []
            
        except Exception as e:
            print(f"Error saving JSON data: {e}")
            self._save_backup()
    
    def _save_backup(self):
        """Save data to backup file if main save fails"""
        try:
            backup_file = f"{self.json_file}.backup"
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(self.session_data, f, indent=2, ensure_ascii=False)
            print(f"Session data saved to backup file: {backup_file}")
        except:
            print("Could not save backup data")