# tracker.py
import time
from datetime import datetime
from config import TrackerConfig
from utils import get_active_window_info, should_log_session
from data_manager import DataManager

class AppTracker:
    """Main class for tracking Windows application usage"""
    
    def __init__(self, json_file=None, min_duration=None, ignore_apps=None):
        self.json_file = json_file or TrackerConfig.JSON_FILE
        self.min_duration = min_duration or TrackerConfig.MIN_DURATION
        self.ignore_apps = ignore_apps or TrackerConfig.DEFAULT_IGNORE_APPS
        
        # Tracking state
        self.current_app = None
        self.start_time = None
        self.is_running = True
        
        # Data management
        self.data_manager = DataManager(self.json_file)
    
    def log_app_change(self, app_info, start_time, end_time, duration=None, end_reason="app_switch"):
        """Log an app change if it meets the criteria"""
        if duration is not None and not should_log_session(
            app_info['app_name'], duration, self.min_duration, self.ignore_apps
        ):
            print(f"Skipped short session: {app_info['app_name']} - {duration:.1f}s")
            return
        
        self.data_manager.log_app_change(app_info, start_time, end_time, duration, end_reason)
    
    def start_tracking(self, check_interval=None):
        """Start the tracking process"""
        check_interval = check_interval or TrackerConfig.CHECK_INTERVAL
        
        print("Starting Windows app usage tracking...")
        print(f"JSON data: {self.json_file}")
        print(f"Minimum duration to log: {self.min_duration} seconds")
        print(f"Ignoring short sessions for: {', '.join(self.ignore_apps)}")
        print("Press Ctrl+C to stop tracking")
        
        try:
            while self.is_running:
                current_info = get_active_window_info()
                if current_info:
                    current_app_id = f"{current_info['app_name']}|{current_info['window_title']}"
                    
                    if self.current_app != current_app_id:
                        end_time = datetime.now()
                        
                        # Log the previous app session
                        if self.current_app and self.start_time:
                            duration = (end_time - self.start_time).total_seconds()
                            prev_info = {
                                'app_name': self.current_app.split('|')[0],
                                'window_title': self.current_app.split('|', 1)[1]
                            }
                            self.log_app_change(prev_info, self.start_time, end_time, duration, "app_switch")
                            
                            if should_log_session(prev_info['app_name'], duration, self.min_duration, self.ignore_apps):
                                print(f"Logged: {prev_info['app_name']} - {duration:.1f}s (switched)")
                        
                        # Start tracking new app
                        self.current_app = current_app_id
                        self.start_time = end_time
                        print(f"Switched to: {current_info['app_name']} - {current_info['window_title']}")
                
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            self._handle_shutdown("tracking_stopped")
        except Exception as e:
            print(f"Unexpected error: {e}")
            self._handle_shutdown("error_occurred")
    
    def _handle_shutdown(self, end_reason):
        """Handle graceful shutdown and save final session"""
        print("\nStopping tracker...")
        self.is_running = False
        
        if self.current_app and self.start_time:
            try:
                end_time = datetime.now()
                duration = (end_time - self.start_time).total_seconds()
                final_info = {
                    'app_name': self.current_app.split('|')[0],
                    'window_title': self.current_app.split('|', 1)[1]
                }
                self.log_app_change(final_info, self.start_time, end_time, duration, end_reason)
                
                if should_log_session(final_info['app_name'], duration, self.min_duration, self.ignore_apps):
                    print(f"Final app logged: {final_info['app_name']} - {duration:.1f}s ({end_reason})")
            except Exception as e:
                print(f"Could not save final session due to error: {e}")
        
        print("Tracking stopped. Data saved.")