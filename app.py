from flask import Flask, jsonify, render_template, request

from predict import recommend_top_k
from weather import SEASONS, current_season, get_climate, search_places

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    # TODO: accounts are not set up yet; this only shows the page
    notice = None
    if request.method == "POST":
        notice = "Accounts aren't set up yet. Login will work once we add a user database."
    return render_template("login.html", notice=notice)


@app.route("/recommend")
def recommend():
    return render_template("recommend.html", seasons=SEASONS,
                           default_season=current_season())


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
