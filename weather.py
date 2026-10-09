"""Climate values for a location, from the free Open-Meteo API (no key needed).

The model was trained on seasonal climate, not on today's weather (today's
rainfall is usually 0 mm). So we average the chosen season's months over the
last 3 years of Open-Meteo's historical data:
  temperature -> mean daily temperature (°C)
  humidity    -> mean daily relative humidity (%)
  rainfall    -> average rainfall per month of the season (mm)
"""
import json
from datetime import date
from functools import lru_cache
from urllib.parse import urlencode
from urllib.request import urlopen

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
YEARS = 3
TIMEOUT = 10  # seconds

# Indian cropping seasons and their months
SEASONS = {
    "kharif": {"label": "Kharif (Jun–Sep)", "months": [6, 7, 8, 9]},
    "rabi": {"label": "Rabi (Nov–Feb)", "months": [11, 12, 1, 2]},
    "zaid": {"label": "Zaid (Mar–May)", "months": [3, 4, 5]},
}


def current_season(today=None):
    """The season a farmer would be planning for right now."""
    m = (today or date.today()).month
    if m in (3, 4, 5):
        return "zaid"
    if m in (6, 7, 8, 9):
        return "kharif"
    return "rabi"


def _get_json(url, params, retries=1):
    full_url = f"{url}?{urlencode(params)}"
    for attempt in range(retries + 1):
        try:
            with urlopen(full_url, timeout=TIMEOUT) as r:
                return json.load(r)
        except OSError:
            if attempt == retries:
                raise


@lru_cache(maxsize=256)
def _daily_history(lat, lon):
    """3 years of daily data for one location; shared by all seasons."""
    today = date.today()
    # The archive lags a few days behind today, so stop at the end of last year
    end = date(today.year - 1, 12, 31)
    start = date(end.year - YEARS + 1, 1, 1)

    data = _get_json(ARCHIVE_URL, {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum",
        "timezone": "auto",
    })
    return data["daily"]


@lru_cache(maxsize=512)
def _seasonal_climate(lat, lon, season):
    months = SEASONS[season]["months"]
    daily = _daily_history(lat, lon)

    temps, hums, rain_total = [], [], 0.0
    for day, t, h, p in zip(daily["time"], daily["temperature_2m_mean"],
                            daily["relative_humidity_2m_mean"],
                            daily["precipitation_sum"]):
        if int(day[5:7]) not in months:
            continue
        if t is not None:
            temps.append(t)
        if h is not None:
            hums.append(h)
        if p is not None:
            rain_total += p

    if not temps or not hums:
        raise ValueError("No climate data for this location")

    return {
        "temperature": round(sum(temps) / len(temps), 1),
        "humidity": round(sum(hums) / len(hums), 1),
        "rainfall": round(rain_total / (len(months) * YEARS), 1),
    }


def get_climate(lat, lon, season=None):
    season = season or current_season()
    if season not in SEASONS:
        raise ValueError(f"Unknown season: {season}")
    # Round to ~10 km so nearby requests share the cache
    climate = _seasonal_climate(round(float(lat), 1), round(float(lon), 1), season)
    return {**climate, "season": season, "season_label": SEASONS[season]["label"]}


def search_places(query, count=5):
    data = _get_json(GEOCODE_URL, {"name": query, "count": count,
                                   "language": "en", "countryCode": "IN"})
    return [
        {
            "name": p["name"],
            "region": ", ".join(x for x in (p.get("admin1"), p.get("country")) if x),
            "lat": p["latitude"],
            "lon": p["longitude"],
        }
        for p in data.get("results", [])
    ]
