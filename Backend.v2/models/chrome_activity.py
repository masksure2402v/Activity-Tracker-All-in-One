# models/chrome_activity_model.py
from config import Config
import json
from datetime import datetime


def process_chrome_activity(data):
    """Process and save Chrome extension activity data to JSON file"""
    try:
        # Load existing data
        try:
            with open(Config.CHROME_JSON_FILE, 'r') as f:
                existing_data = json.load(f)
        except FileNotFoundError:
            existing_data = []

        # Append new records with timestamp processing
        for record in data:
            record['received_at'] = datetime.now().isoformat()
            existing_data.append(record)

        # Save back to JSON file
        with open(Config.CHROME_JSON_FILE, 'w') as f:
            json.dump(existing_data, f, indent=4)

        return {'added_records': len(data)}

    except Exception as e:
        raise RuntimeError(f"Failed to process data: {str(e)}")
