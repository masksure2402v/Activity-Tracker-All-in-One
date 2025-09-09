# main.py
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import blueprints
from routes.health import health_bp
from routes.analytics import analytics_bp
from routes.stats import stats_bp
from routes.chrome_activity import chrome_bp

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, origins=Config.CORS_ORIGINS)
    
    # Register blueprints
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(chrome_bp, url_prefix='/api')
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

# Create the app instance
app = create_app()

if __name__ == '__main__':
    print("🚀 Starting Flask Backend for App Usage Analytics")
    print("📊 Available endpoints:")
    print("   GET /api/health                       - Health check")
    print("   GET /api/summary                      - Overall statistics")
    print("   GET /api/apps                         - App usage data")
    print("   GET /api/daily                        - Daily usage patterns")
    print("   GET /api/hourly                       - Hourly usage patterns")
    print("   GET /api/raw-sessions                 - Raw session data (legacy)")
    print("   GET /api/raw-sessions/chrome-activity - Raw data of chrome")
    print("   GET /api/sunBurst-Chart               - sunBurst-Chart data")
    print("   GET /api/<date>/sunBurst-Chart        - sunBurst-Chart data by date")
    print("   GET /api/sessions                     - Detailed session data with window titles")
    print("   GET /api/window-titles?app=X          - Window titles for specific app")
    print("   GET /api/stats/top-apps               - Top applications")
    print("   GET /api/stats/productivity           - Productivity insights")
    print("\n📝 Query parameters:")
    print("   ?days=7     - Filter by last N days")
    print("   ?limit=10   - Limit number of results")
    print("   ?app=name   - Filter by app name (for window-titles endpoint)")
    print("\n🌐 Server running on: http://localhost:5000")
    print("\n📋 New JSON format support:")
    print("   ✅ Supports both old and new JSON formats")
    print("   ✅ Window title tracking enabled")
    print("   ✅ Session end reason tracking")
    
    app.run(
        debug=Config.DEBUG, 
        host=Config.HOST, 
        port=Config.PORT
    )