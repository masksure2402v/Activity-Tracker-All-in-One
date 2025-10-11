# routes/analytics.py
from flask import Blueprint, jsonify, request
from models.top_applications import get_top_applications
from models.screen_time import get_total_minutes
from models.sunBurst_Chart import LogAnalyzer
from datetime import datetime

analytics_bp = Blueprint("analytics", __name__)
analyzer = LogAnalyzer()

# Top applications by date
@analytics_bp.route("/<date>/top-applications", methods=["GET"])
def top_applications_by_date(date):
    return jsonify(get_top_applications(date))

# Total screen time by date
@analytics_bp.route("/<date>/total-screen-time", methods=["GET"])
def total_screen_time(date):
    return jsonify(get_total_minutes(date))

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