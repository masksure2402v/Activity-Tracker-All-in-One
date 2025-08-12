# config.py
import os

class Config:
    """Configuration settings for the Activity Tracker Backend"""
    
    # Flask settings
    DEBUG = True
    HOST = '0.0.0.0'
    PORT = 5000
    
    # Data file settings
    JSON_FILE = r"C:\Users\Ujjwal\Desktop\Code\Activity tracker\activity tracker 4.0\app_usage.json"
    CHROME_JSON_FILE = r"C:\Users\Ujjwal\Desktop\Code\Activity tracker\activity tracker 4.0\chrome_usage.json"

    # API settings
    DEFAULT_DAYS = 30
    DEFAULT_LIMIT = 100
    MAX_LIMIT = 1000
    
    # App categories for productivity analysis
    APP_CATEGORIES = {
        'productive': ['Code.exe', 'notepad.exe', 'winword.exe', 'excel.exe', 'powerpnt.exe'],
        'browsers': ['chrome.exe', 'firefox.exe', 'msedge.exe', 'iexplore.exe'],
        'communication': ['Teams.exe', 'Slack.exe', 'Discord.exe', 'Zoom.exe'],
        'entertainment': ['spotify.exe', 'vlc.exe', 'Steam.exe', 'Games']
    }
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000',"http://localhost:8080"] 

    