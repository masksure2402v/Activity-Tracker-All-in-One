# utils.py 
import win32gui
import win32process
import psutil
from datetime import datetime

def get_active_window_info():
    """Get information about the currently active window"""
    try:
        hwnd = win32gui.GetForegroundWindow()
        window_title = win32gui.GetWindowText(hwnd)
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process = psutil.Process(pid)
        app_name = process.name()
        return {
            'app_name': app_name,
            'window_title': window_title,
            'pid': pid,
            'timestamp': datetime.now()
        }
    except Exception as e:
        print(f"Error getting window info: {e}")
        return None

def should_log_session(app_name, duration, min_duration, ignore_apps):
    """Determine if a session should be logged based on duration and app type"""
    if duration >= min_duration:
        return True
    if app_name.lower() in [app.lower() for app in ignore_apps]:
        return False
    return True