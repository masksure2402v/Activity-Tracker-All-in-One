# main.py
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from routes.analytics import analytics_bp
from routes.chrome_activity import chrome_activity_bp

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")

# Enable CORS for all routes to allow extension requests
CORS(app, resources={r"/*": {"origins": "*"}})

app.register_blueprint(analytics_bp, url_prefix="/api")
app.register_blueprint(chrome_activity_bp, url_prefix="/api")

@app.route("/")
def main_app():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(
        debug=Config.DEBUG,
        host=Config.HOST,
        port=Config.PORT,
    )
