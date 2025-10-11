# routes/chrome_activity.py
from flask import Blueprint, request, jsonify
import json
import os
from config import Config

chrome_activity_bp = Blueprint("chrome_activity", __name__)
DATA_FILE = Config.CHROME_JSON_FILE

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

@chrome_activity_bp.route("/chrome-activity", methods=["GET", "POST"])
def chrome_activity():
    if request.method == "POST":
        entry = request.json
        if not entry:
            return jsonify({"error": "No JSON provided"}), 400
        data = load_data()
        data.append(entry)
        save_data(data)
        return jsonify({"message": "Saved"}), 201

    if request.method == "GET":
        data = load_data()
        return jsonify(data)
