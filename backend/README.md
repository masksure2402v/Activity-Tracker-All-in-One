# Activity Tracker Backend

A Flask-based backend API for analyzing and serving app usage data from the Windows Activity Tracker.

## Project Structure

```
backend/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── models/
│   ├── __init__.py
│   └── analyzer.py        # LogAnalyzer class for data processing
├── routes/
│   ├── __init__.py
│   ├── health.py          # Health check endpoints
│   ├── analytics.py       # Core analytics endpoints
│   └── stats.py           # Statistics and insights endpoints
└── activity tracker logic/
    └── main.py            # Windows activity tracking logic
```

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the backend server:
   ```bash
   python app.py
   ```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Analytics
- `GET /api/summary` - Overall usage statistics
- `GET /api/apps` - App usage data
- `GET /api/daily` - Daily usage patterns
- `GET /api/hourly` - Hourly usage patterns
- `GET /api/raw-sessions` - Raw session data

### Statistics
- `GET /api/stats/top-apps` - Top applications by usage
- `GET /api/stats/productivity` - Productivity insights

## Query Parameters

- `days` - Filter data by last N days (e.g., `?days=7`)
- `limit` - Limit number of results (e.g., `?limit=10`)

## Configuration

Edit `config.py` to customize:
- Server settings (host, port, debug mode)
- Data file path
- App categories for productivity analysis
- CORS origins
- API limits and defaults

## Data Format

The backend expects a JSON file (`app_usage.json`) with the following structure:
```json
[
  {
    "timestamp": "2024-01-01 10:00:00",
    "app_name": "chrome.exe",
    "window_title": "Google Chrome",
    "duration": 300.5,
    "session_end_reason": "app_switch"
  }
]
``` 