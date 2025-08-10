# config.py
import os

class TrackerConfig:
    """Configuration settings for the activity tracker"""
    
    # JSON file path - save to specific location
    JSON_FILE = r"C:\Users\Ujjwal\Desktop\Code\Activity tracker\activity tracker 4.0\app_usage.json"
    
    # Minimum duration (in seconds) to log an app session
    MIN_DURATION = 1
    
    # How often to check for active window changes (in seconds)
    CHECK_INTERVAL = 1
    
    # Apps to ignore for short session filtering
    DEFAULT_IGNORE_APPS = [
        'explorer.exe',
        'dwm.exe',
        'winlogon.exe',
        'csrss.exe',
        'System',
        'Registry',
        'searchhost.exe'
    ]
    
    @classmethod
    def ensure_directory_exists(cls):
        """Ensure the directory for JSON file exists"""
        directory = os.path.dirname(cls.JSON_FILE)
        if not os.path.exists(directory):
            try:
                os.makedirs(directory, exist_ok=True)
                print(f"Created directory: {directory}")
            except Exception as e:
                print(f"Error creating directory {directory}: {e}")
                # Fallback to current directory
                cls.JSON_FILE = "app_usage.json"
                print(f"Fallback: Using current directory - {os.path.abspath(cls.JSON_FILE)}")
    
    @classmethod
    def get_json_file_path(cls):
        """Get the JSON file path, ensuring directory exists"""
        cls.ensure_directory_exists()
        return cls.JSON_FILE