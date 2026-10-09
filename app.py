import json
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from crops import GROUPS, STATS
from i18n import DEFAULT_LANG, FONTS, LANGUAGES, crop_name, js_strings, translate
from predict import recommend_top_k
from weather import SEASONS, current_season, get_climate, search_places

app = Flask(__name__)

CREDITS_FILE = Path(app.static_folder) / "images" / "crops" / "credits.json"


def current_lang():
    lang = request.args.get("lang") or request.cookies.get("lang")
    return lang if lang in LANGUAGES else DEFAULT_LANG


@app.context_processor
def inject_i18n():
    lang = current_lang()
    return {
        "lang": lang,
        "languages": LANGUAGES,
        "lang_font": FONTS.get(lang),
        "t": lambda key: translate(key, lang),
        "crop_name": lambda crop: crop_name(crop, lang),
        "js_strings": js_strings(lang),
    }


@app.after_request
def remember_lang(response):
    lang = request.args.get("lang")
    if lang in LANGUAGES:
        response.set_cookie("lang", lang, max_age=60 * 60 * 24 * 365, samesite="Lax")
    return response


def predict_context():
    return {"seasons": SEASONS, "default_season": current_season()}


@app.route("/")
def home():
    return render_template("index.html", groups=GROUPS, stats=STATS, **predict_context())


@app.route("/recommend")
def recommend():
    return render_template("recommend.html", **predict_context())


@app.route("/login", methods=["GET", "POST"])
def login():
    # TODO: accounts are not set up yet; this only shows the page
    show_notice = request.method == "POST"
    return render_template("login.html", show_notice=show_notice)


@app.route("/credits")
def credits():
    data = json.loads(CREDITS_FILE.read_text(encoding="utf-8"))
    return render_template("credits.html", credits=data)


@app.get("/api/places")
def api_places():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify([])
    try:
        return jsonify(search_places(q))
    except OSError:
        return jsonify({"error": "Place search is unavailable right now"}), 503


@app.get("/api/climate")
def api_climate():
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
    except (KeyError, ValueError):
        return jsonify({"error": "lat and lon are required"}), 400
    try:
        return jsonify(get_climate(lat, lon, request.args.get("season")))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except OSError:
        return jsonify({"error": "Weather service is unavailable right now"}), 503


@app.post("/api/predict")
def api_predict():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(recommend_top_k(data, k=3))
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
