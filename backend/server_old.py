from flask import Flask, jsonify, request
from flask_cors import CORS
import re
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for web frontend

class LogAnalyzer:
    def __init__(self, json_file="app_usage.json"):
        self.json_file = json_file
        self.parsed_data = []
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
        if not os.path.exists(self.json_file):
            return False
        
        if not self.is_file_updated() and self.parsed_data:
            return True

        with open(self.json_file, 'r', encoding='utf-8') as f:
            try:
                self.parsed_data = json.load(f)
            except json.JSONDecodeError:
                self.parsed_data = []
                return False

        return True

    
    def parse_log_line(self, line):
        """Parse individual log line and extract information"""
        timestamp_pattern = r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (\w+)\s+ \| (.+)$'
        match = re.match(timestamp_pattern, line)
        
        if not match:
            return None
        
        timestamp_str, log_level, message = match.groups()
        
        entry = {
            'timestamp': timestamp_str,
            'log_level': log_level,
            'raw_message': message,
            'entry_type': 'unknown',
            'app_name': None,
            'window_title': None,
            'duration': None,
            'reason': None
        }
        
        # Parse LOGGED entries
        logged_pattern = r'LOGGED: (.+?) \| Duration: ([\d.]+)s \| Reason: (\w+) \| Window: (.+)'
        logged_match = re.match(logged_pattern, message)
        if logged_match:
            entry.update({
                'entry_type': 'session_logged',
                'app_name': logged_match.group(1),
                'duration': float(logged_match.group(2)),
                'reason': logged_match.group(3),
                'window_title': logged_match.group(4)
            })
            return entry
        
        # Parse SKIPPED entries
        skipped_pattern = r'SKIPPED: (.+?) - ([\d.]+)s \((\w+)\) - (.+)'
        skipped_match = re.match(skipped_pattern, message)
        if skipped_match:
            entry.update({
                'entry_type': 'session_skipped',
                'app_name': skipped_match.group(1),
                'duration': float(skipped_match.group(2)),
                'reason': skipped_match.group(3)
            })
            return entry
        
        # Parse SWITCH entries
        switch_pattern = r'SWITCH: Now using (.+?) - (.+)'
        switch_match = re.match(switch_pattern, message)
        if switch_match:
            entry.update({
                'entry_type': 'app_switch',
                'app_name': switch_match.group(1),
                'window_title': switch_match.group(2)
            })
            return entry
        
        return entry
    
    def get_logged_sessions(self, days=None):
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

# Global analyzer instance
analyzer = LogAnalyzer()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'log_file_exists': os.path.exists(analyzer.json_file)
    })

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """Get overall summary statistics"""
    days = request.args.get('days', type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    summary = analyzer.get_summary_stats(days)
    return jsonify(summary)

@app.route('/api/apps', methods=['GET'])
def get_app_usage():
    """Get app usage statistics"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    apps = analyzer.get_app_usage(days, limit)
    return jsonify(apps)

@app.route('/api/daily', methods=['GET'])
def get_daily_usage():
    """Get daily usage patterns"""
    days = request.args.get('days', default=30, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    daily_data = analyzer.get_daily_usage(days)
    return jsonify(daily_data)

@app.route('/api/hourly', methods=['GET'])
def get_hourly_usage():
    """Get hourly usage patterns"""
    days = request.args.get('days', default=7, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    hourly_data = analyzer.get_hourly_usage(days)
    return jsonify(hourly_data)

@app.route('/api/raw-sessions', methods=['GET'])
def get_raw_sessions():
    """Get raw session data"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=100, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    sessions = analyzer.get_logged_sessions(days)
    
    # Sort by timestamp (newest first) and limit
    sessions.sort(key=lambda x: x['timestamp'], reverse=True)
    sessions = sessions[:limit]
    
    return jsonify(sessions)

@app.route('/api/stats/top-apps', methods=['GET'])
def get_top_apps():
    """Get top apps by usage time"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=10, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    apps = analyzer.get_app_usage(days, limit)
    return jsonify(apps)

@app.route('/api/stats/productivity', methods=['GET'])
def get_productivity_stats():
    """Get productivity insights"""
    days = request.args.get('days', default=7, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    sessions = analyzer.get_logged_sessions(days)
    
    if not sessions:
        return jsonify({'error': 'No data available'}), 404
    
    # Calculate various productivity metrics
    app_categories = {
        'productive': ['Code.exe', 'notepad.exe', 'winword.exe', 'excel.exe', 'powerpnt.exe'],
        'browsers': ['chrome.exe', 'firefox.exe', 'msedge.exe', 'iexplore.exe'],
        'communication': ['Teams.exe', 'Slack.exe', 'Discord.exe', 'Zoom.exe'],
        'entertainment': ['spotify.exe', 'vlc.exe', 'Steam.exe', 'Games']
    }
    
    category_usage = defaultdict(float)
    total_time = sum(s['duration'] for s in sessions)
    
    for session in sessions:
        app = session['app_name']
        duration = session['duration']
        
        categorized = False
        for category, apps in app_categories.items():
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
    
    return jsonify({
        'total_time_hours': round(total_time / 3600, 2),
        'breakdown': productivity_breakdown,
        'productivity_score': round(productivity_breakdown.get('productive', {}).get('percentage', 0), 1)
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting Flask Backend for App Usage Analytics")
    print("📊 Available endpoints:")
    print("   GET /api/health          - Health check")
    print("   GET /api/summary         - Overall statistics")
    print("   GET /api/apps            - App usage data")
    print("   GET /api/daily           - Daily usage patterns")
    print("   GET /api/hourly          - Hourly usage patterns")
    print("   GET /api/raw-sessions    - Raw session data")
    print("   GET /api/stats/top-apps  - Top applications")
    print("   GET /api/stats/productivity - Productivity insights")
    print("\n📝 Query parameters:")
    print("   ?days=7     - Filter by last N days")
    print("   ?limit=10   - Limit number of results")
    print("\n🌐 Server running on: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 