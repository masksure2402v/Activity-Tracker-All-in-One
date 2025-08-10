from flask import Blueprint, jsonify
from datetime import datetime
import os
from models.analyzer import LogAnalyzer
from config import Config

health_bp = Blueprint('health', __name__)
analyzer = LogAnalyzer()

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'log_file_exists': os.path.exists(analyzer.json_file)
    }) 