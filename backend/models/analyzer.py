# analyzer.py
import re
import os
import json
from datetime import datetime, timedelta
from collections import defaultdict
from config import Config

class LogAnalyzer:
    """Analyzes app usage data from JSON files"""
    
    def __init__(self, json_file=None):
        self.json_file = json_file or Config.JSON_FILE
        self.parsed_data = []
        self.last_modified = None

    def is_file_updated(self):
        """Check if the JSON file has been modified since last read"""
        if not os.path.exists(self.json_file):
            return False
        
        current_modified = os.path.getmtime(self.json_file)
        if self.last_modified != current_modified:
            self.last_modified = current_modified
            return True
        return False
    
    def parse_log_file(self):
        """Parse the JSON log file and cache the data"""
        if not os.path.exists(self.json_file):
            return False
        
        if not self.is_file_updated() and self.parsed_data:
            return True

        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
                
            # Convert new format to the format expected by the rest of the code
            self.parsed_data = []
            for entry in raw_data:
                # Handle both old and new formats
                if 'timestamp' in entry:
                    # Old format - use as is
                    self.parsed_data.append(entry)
                else:
                    # New format - convert to old format
                    start_datetime = f"{entry['date']} {entry['time']['start']}"
                    converted_entry = {
                        'timestamp': start_datetime,
                        'app_name': entry['app_name'],
                        'window_title': entry.get('window_title', ''),
                        'duration': entry['duration'],
                        'session_end_reason': entry.get('session_end_reason', 'unknown'),
                        # Keep original fields for reference
                        'original_date': entry['date'],
                        'start_time': entry['time']['start'],
                        'end_time': entry['time']['end']
                    }
                    self.parsed_data.append(converted_entry)
                    
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing JSON file: {e}")
            self.parsed_data = []
            return False

        return True

    def get_logged_sessions(self, days=None):
        """Get logged sessions, optionally filtered by days"""
        sessions = self.parsed_data
        if days:
            cutoff_date = datetime.now() - timedelta(days=days)
            sessions = [
                s for s in sessions 
                if datetime.strptime(s['timestamp'], '%Y-%m-%d %H:%M:%S') >= cutoff_date
            ]
        return sessions
    
    def get_summary_stats(self, days=None):
        """Get overall summary statistics"""
        sessions = self.get_logged_sessions(days)
        
        if not sessions:
            return {
                'total_sessions': 0,
                'total_time_hours': 0,
                'average_session_minutes': 0,
                'unique_apps': 0,
                'date_range': None
            }
        
        total_duration = sum(s['duration'] for s in sessions)
        timestamps = [datetime.strptime(s['timestamp'], '%Y-%m-%d %H:%M:%S') for s in sessions]
        
        return {
            'total_sessions': len(sessions),
            'total_time_hours': round(total_duration / 3600, 2),
            'average_session_minutes': round(total_duration / len(sessions) / 60, 1),
            'unique_apps': len(set(s['app_name'] for s in sessions)),
            'date_range': {
                'start': min(timestamps).strftime('%Y-%m-%d'),
                'end': max(timestamps).strftime('%Y-%m-%d')
            }
        }
    
    def get_app_usage(self, days=None, limit=None):
        """Get app usage statistics"""
        sessions = self.get_logged_sessions(days)
        
        app_stats = defaultdict(lambda: {'sessions': 0, 'total_time': 0})
        
        for session in sessions:
            app = session['app_name']
            app_stats[app]['sessions'] += 1
            app_stats[app]['total_time'] += session['duration']
        
        # Convert to list and sort by total time
        result = []
        for app, stats in app_stats.items():
            result.append({
                'app_name': app,
                'sessions': stats['sessions'],
                'total_time_seconds': stats['total_time'],
                'total_time_hours': round(stats['total_time'] / 3600, 2),
                'average_session_minutes': round(stats['total_time'] / stats['sessions'] / 60, 1)
            })
        
        result.sort(key=lambda x: x['total_time_seconds'], reverse=True)
        
        if limit:
            result = result[:limit]
        
        return result
    
    def get_daily_usage(self, days=30):
        """Get daily usage patterns"""
        sessions = self.get_logged_sessions(days)
        
        daily_usage = defaultdict(float)
        
        for session in sessions:
            date = session['timestamp'][:10]  # Extract date part
            daily_usage[date] += session['duration']
        
        # Fill in missing dates with 0
        if sessions:
            start_date = datetime.now() - timedelta(days=days-1)
            result = []
            
            for i in range(days):
                current_date = start_date + timedelta(days=i)
                date_str = current_date.strftime('%Y-%m-%d')
                result.append({
                    'date': date_str,
                    'total_hours': round(daily_usage[date_str] / 3600, 2)
                })
            
            return result
        
        return []
    
    def get_hourly_usage(self, days=7):
        """Get hourly usage patterns"""
        sessions = self.get_logged_sessions(days)
        
        hourly_usage = defaultdict(float)
        
        for session in sessions:
            hour = int(session['timestamp'][11:13])  # Extract hour
            hourly_usage[hour] += session['duration']
        
        result = []
        for hour in range(24):
            result.append({
                'hour': hour,
                'total_minutes': round(hourly_usage[hour] / 60, 1)
            })
        
        return result

    def get_productivity_stats(self, days=7):
        """Get productivity insights"""
        sessions = self.get_logged_sessions(days)
        
        if not sessions:
            return None
        
        # Calculate various productivity metrics
        category_usage = defaultdict(float)
        total_time = sum(s['duration'] for s in sessions)
        
        for session in sessions:
            app = session['app_name']
            duration = session['duration']
            
            categorized = False
            for category, apps in Config.APP_CATEGORIES.items():
                if any(productive_app.lower() in app.lower() for productive_app in apps):
                    category_usage[category] += duration
                    categorized = True
                    break
            
            if not categorized:
                category_usage['other'] += duration
        
        # Convert to percentages
        productivity_breakdown = {}
        for category, time_spent in category_usage.items():
            productivity_breakdown[category] = {
                'hours': round(time_spent / 3600, 2),
                'percentage': round((time_spent / total_time) * 100, 1) if total_time > 0 else 0
            }
        
        return {
            'total_time_hours': round(total_time / 3600, 2),
            'breakdown': productivity_breakdown,
            'productivity_score': round(productivity_breakdown.get('productive', {}).get('percentage', 0), 1)
        }

    def get_detailed_sessions(self, days=None, limit=None):
        """Get detailed session information with window titles"""
        sessions = self.get_logged_sessions(days)
        
        # Add additional details for the new format
        detailed_sessions = []
        for session in sessions:
            detailed_session = {
                'timestamp': session['timestamp'],
                'app_name': session['app_name'],
                'window_title': session.get('window_title', ''),
                'duration_seconds': session['duration'],
                'duration_minutes': round(session['duration'] / 60, 1),
                'session_end_reason': session.get('session_end_reason', 'unknown')
            }
            
            # Add original timing info if available
            if 'original_date' in session:
                detailed_session.update({
                    'date': session['original_date'],
                    'start_time': session['start_time'],
                    'end_time': session['end_time']
                })
            
            detailed_sessions.append(detailed_session)
        
        # Sort by timestamp (newest first)
        detailed_sessions.sort(key=lambda x: x['timestamp'], reverse=True)
        
        if limit:
            detailed_sessions = detailed_sessions[:limit]
        
        return detailed_sessions
    
    def get_merged_sessions(self, days=None, date_filter=None):
        """Return merged sessions grouped by app for a given day or range"""
        if not self.parse_log_file():
            return {}

        # Apply filter
        if days:
            sessions = self.get_logged_sessions(days)
        elif date_filter:
            sessions = [
                s for s in self.parsed_data 
                if s.get("original_date") == date_filter
            ]
        else:
            sessions = self.parsed_data

        if not sessions:
            return {}

        # Parse datetime for sorting and merging
        for entry in sessions:
            entry["start_dt"] = datetime.strptime(f'{entry["original_date"]} {entry["start_time"]}', "%Y-%m-%d %H:%M:%S")
            entry["end_dt"] = datetime.strptime(f'{entry["original_date"]} {entry["end_time"]}', "%Y-%m-%d %H:%M:%S")

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
                merged.append({
                    "app_name": current_app.lower(),
                    "start": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "end": end_time.strftime("%Y-%m-%d %H:%M:%S")
                })
                current_app = entry["app_name"]
                start_time = entry["start_dt"]
                end_time = entry["end_dt"]

        # Add last session
        merged.append({
            "app_name": current_app.lower(),
            "start": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end": end_time.strftime("%Y-%m-%d %H:%M:%S")
        })

        # Group by app
        grouped = {}
        for session in merged:
            app = session["app_name"]
            line = f'{session["start"]} - {session["end"]}'
            if app not in grouped:
                grouped[app] = []
            grouped[app].append(line)

        return grouped

