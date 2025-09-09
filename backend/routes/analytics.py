# analytics.py
from flask import Blueprint, jsonify, request
from models.analyzer import LogAnalyzer
from config import Config
from datetime import datetime
from pathlib import Path
from models.analyzer import db, SiteVisit


analytics_bp = Blueprint('analytics', __name__)
analyzer = LogAnalyzer()

@analytics_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get overall summary statistics"""
    days = request.args.get('days', type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    summary = analyzer.get_summary_stats(days)
    return jsonify(summary)

@analytics_bp.route('/apps', methods=['GET'])
def get_app_usage():
    """Get app usage statistics"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    apps = analyzer.get_app_usage(days, limit)
    return jsonify(apps)

@analytics_bp.route('/daily', methods=['GET'])
def get_daily_usage():
    """Get daily usage patterns"""
    days = request.args.get('days', default=Config.DEFAULT_DAYS, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    daily_data = analyzer.get_daily_usage(days)
    return jsonify(daily_data)

@analytics_bp.route('/hourly', methods=['GET'])
def get_hourly_usage():
    """Get hourly usage patterns"""
    days = request.args.get('days', default=7, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    hourly_data = analyzer.get_hourly_usage(days)
    return jsonify(hourly_data)

@analytics_bp.route('/raw-sessions', methods=['GET'])
def get_raw_sessions():
    """Get raw session data (backward compatibility)"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=Config.DEFAULT_LIMIT, type=int)
    
    if limit > Config.MAX_LIMIT:
        limit = Config.MAX_LIMIT
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    sessions = analyzer.get_logged_sessions(days)
    
    # Sort by timestamp (newest first) and limit
    sessions.sort(key=lambda x: x['timestamp'], reverse=True)
    sessions = sessions[:limit]
    
    return jsonify(sessions)

@analytics_bp.route('/sessions', methods=['GET'])
def get_detailed_sessions():
    """Get detailed session data with window titles and timing info"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=Config.DEFAULT_LIMIT, type=int)
    
    if limit > Config.MAX_LIMIT:
        limit = Config.MAX_LIMIT
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    sessions = analyzer.get_detailed_sessions(days, limit)
    return jsonify(sessions)

@analytics_bp.route('/window-titles', methods=['GET'])
def get_window_titles():
    """Get window titles for a specific app"""
    app_name = request.args.get('app', required=True)
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=50, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404
    
    sessions = analyzer.get_logged_sessions(days)
    
    # Filter by app name and get unique window titles
    app_sessions = [s for s in sessions if s['app_name'].lower() == app_name.lower()]
    
    window_titles = []
    seen_titles = set()
    
    for session in app_sessions:
        title = session.get('window_title', '')
        if title and title not in seen_titles:
            window_titles.append({
                'window_title': title,
                'app_name': session['app_name'],
                'last_seen': session['timestamp'],
                'duration': session['duration']
            })
            seen_titles.add(title)
    
    # Sort by last seen (newest first) and limit
    window_titles.sort(key=lambda x: x['last_seen'], reverse=True)
    window_titles = window_titles[:limit]
    
    return jsonify({
        'app_name': app_name,
        'window_titles': window_titles,
        'total_unique_titles': len(window_titles)
    })

@analytics_bp.route('/sunBurst-Chart', methods=['GET'])
def get_merged_sessions():
    """Return merged app usage sessions by app"""
    days = request.args.get('days', type=int)

    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404

    merged_data = analyzer.get_merged_sessions(days)
    return jsonify(merged_data)

@analytics_bp.route('/<date>/sunBurst-Chart', methods=['GET'])
def get_merged_sessions_by_date(date):
    """Return merged sessions for a specific date (format: YYYY-MM-DD)"""
    try:
        datetime.strptime(date, "%Y-%m-%d")  # Validate date format
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found or invalid'}), 404

    merged_data = analyzer.get_merged_sessions(date_filter=date)
    return jsonify(merged_data)



# site_visits_bp = Blueprint("site_visits", __name__)

# @site_visits_bp.route("/site_visits", methods=["POST"])
# def add_site_visit():
#     data = request.get_json()

#     if not data or "domain" not in data or "url" not in data or "start_time" not in data:
#         return jsonify({"error": "Missing required fields"}), 400

#     visit = SiteVisit(
#         domain=data["domain"],
#         url=data["url"],
#         start_time=datetime.fromisoformat(data["start_time"]),
#         end_time=datetime.fromisoformat(data["end_time"]) if data.get("end_time") else None
#     )

#     db.session.add(visit)
#     db.session.commit()

#     return jsonify({"message": "Site visit logged"}), 201


# @site_visits_bp.route("/site_visits", methods=["GET"])
# def get_site_visits():
#     visits = SiteVisit.query.order_by(SiteVisit.start_time.desc()).all()
#     return jsonify([v.to_dict() for v in visits])

