# main.py
from tracker import AppTracker
from config import TrackerConfig

def main():
    """Main entry point for the activity tracker"""
    tracker = AppTracker(
        json_file=TrackerConfig.get_json_file_path(),
        min_duration=TrackerConfig.MIN_DURATION,
        ignore_apps=TrackerConfig.DEFAULT_IGNORE_APPS
    )
    tracker.start_tracking(check_interval=TrackerConfig.CHECK_INTERVAL)

if __name__ == "__main__":
    main()