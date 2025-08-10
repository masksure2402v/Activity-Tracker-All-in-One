from flask import Blueprint, jsonify, request
from models.analyzer import LogAnalyzer
from config import Config

stats_bp = Blueprint('stats', __name__)
analyzer = LogAnalyzer()

@stats_bp.route('/top-apps', methods=['GET'])
def get_top_apps():
    """Get top apps by usage time"""
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=10, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    apps = analyzer.get_app_usage(days, limit)
    return jsonify(apps)

@stats_bp.route('/productivity', methods=['GET'])
def get_productivity_stats():
    """Get productivity insights"""
    days = request.args.get('days', default=7, type=int)
    
    if not analyzer.parse_log_file():
        return jsonify({'error': 'Log file not found'}), 404
    
    productivity_data = analyzer.get_productivity_stats(days)
    
    if productivity_data is None:
        return jsonify({'error': 'No data available'}), 404
    
    return jsonify(productivity_data) 