# main.py
from flask import Flask, send_from_directory
from config import Config
from flask_cors import CORS
from routes.analytics import analytics_bp


app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")

CORS(app)

app.register_blueprint(analytics_bp, url_prefix="/api")

@app.route("/")
def main_app():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(
        debug=Config.DEBUG,
        host=Config.HOST,
        port=Config.PORT
    )
