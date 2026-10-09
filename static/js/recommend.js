(function () {
  const L = window.I18N || {};
  const form = document.getElementById("rec-form");
  if (!form) return;

  const card = form.querySelector(".card");
  const tabs = form.querySelectorAll(".mode-tab");
  const modeNotice = document.getElementById("mode-notice");
  const gpsBtn = document.getElementById("use-gps");
  const placeInput = document.getElementById("place-input");
  const placeList = document.getElementById("place-list");
  const placeChosen = document.getElementById("place-chosen");
  const climateStatus = document.getElementById("climate-status");
  const formError = document.getElementById("form-error");
  const submitBtn = document.getElementById("submit-btn");
  const results = document.getElementById("results");

  const CLIMATE = ["temperature", "humidity", "rainfall"];
  const FIELDS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];
  const FIELD_LABEL = {
    N: L.lbl_N, P: L.lbl_P, K: L.lbl_K, ph: L.lbl_ph,
    temperature: L.lbl_temperature, humidity: L.lbl_humidity, rainfall: L.lbl_rainfall,
  };

  let farmLocation = null; // { lat, lon, label }

  const season = () => form.querySelector("input[name=season]:checked").value;

  function setStatus(text, kind) {
    climateStatus.textContent = text;
    climateStatus.className = "climate-status auto-only" + (kind ? " " + kind : "");
  }

  // ---------- Auto / manual mode ----------
  function setMode(mode, notice) {
    card.classList.toggle("is-manual", mode === "manual");
    tabs.forEach((t) => t.setAttribute("aria-selected", t.dataset.mode === mode));
    modeNotice.textContent = notice || "";
    modeNotice.hidden = !notice;
    if (mode === "manual" && notice) form.temperature.focus({ preventScroll: true });
  }

  tabs.forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));

  // When auto-fill fails, fall back to typing the values in
  function fallBackToManual(reason) {
    setStatus(reason, "error");
    setMode("manual", reason + " " + L.switched_manual);
  }

  // ---------- Climate auto-fill ----------
  async function loadClimate() {
    if (!farmLocation) return;
    setStatus(L.status_loading, "loading");
    try {
      const params = new URLSearchParams({ lat: farmLocation.lat, lon: farmLocation.lon, season: season() });
      const res = await fetch("/api/climate?" + params);
      if (!res.ok) throw new Error();
      const data = await res.json();
      CLIMATE.forEach((f) => (form[f].value = data[f]));
      setStatus(L.status_ok + " " + L["season_" + data.season], "ok");
    } catch {
      fallBackToManual(L.err_weather);
    }
  }

  function chooseLocation(lat, lon, label) {
    farmLocation = { lat, lon, label };
    placeChosen.textContent = "📍 " + label;
    placeChosen.hidden = false;
    loadClimate();
  }

  form.querySelectorAll("input[name=season]").forEach((r) => r.addEventListener("change", loadClimate));

  // ---------- GPS ----------
  gpsBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      fallBackToManual(L.err_no_gps);
      return;
    }
    setStatus(L.status_locating, "loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        chooseLocation(latitude, longitude,
          L.your_location + " (" + latitude.toFixed(3) + ", " + longitude.toFixed(3) + ")");
      },
      (err) => fallBackToManual(err.code === 1 ? L.err_denied : L.err_no_gps),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });

  // ---------- Place search ----------
  let searchTimer;
  placeInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = placeInput.value.trim();
    if (q.length < 2) {
      placeList.hidden = true;
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const res = await fetch("/api/places?q=" + encodeURIComponent(q));
        if (!res.ok) throw new Error();
        renderPlaces(await res.json());
      } catch {
        showPlaceMessage(L.search_unavailable);
      }
    }, 300);
  });

  function showPlaceMessage(text) {
    placeList.innerHTML = "";
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = text;
    placeList.appendChild(li);
    placeList.hidden = false;
  }

  function renderPlaces(places) {
    if (!places.length) {
      showPlaceMessage(L.no_places);
      return;
    }
    placeList.innerHTML = "";
    places.forEach((p) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.tabIndex = 0;
      li.innerHTML = "<strong></strong> <span></span>";
      li.querySelector("strong").textContent = p.name;
      li.querySelector("span").textContent = p.region;
      const pick = () => {
        placeInput.value = p.name;
        placeList.hidden = true;
        chooseLocation(p.lat, p.lon, p.name + ", " + p.region);
      };
      li.addEventListener("click", pick);
      li.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), pick()));
      placeList.appendChild(li);
    });
    placeList.hidden = false;
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".place-search")) placeList.hidden = true;
  });

  // ---------- Sample soil values ----------
  document.getElementById("fill-sample").addEventListener("click", () => {
    form.N.value = 90;
    form.P.value = 42;
    form.K.value = 43;
    form.ph.value = 6.5;
  });

  // ---------- Submit ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const missing = FIELDS.filter((f) => form[f].value.trim() === "");
    if (missing.length) {
      formError.textContent = L.missing + " " + missing.map((f) => FIELD_LABEL[f]).join(", ");
      formError.hidden = false;
      form[missing[0]].focus();
      return;
    }

    const body = {};
    FIELDS.forEach((f) => (body[f] = Number(form[f].value)));

    submitBtn.disabled = true;
    submitBtn.textContent = L.thinking;
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      renderResults(await res.json());
    } catch {
      formError.textContent = L.predict_failed;
      formError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = L.submit;
    }
  });

  function renderResults(data) {
    const cards = document.getElementById("result-cards");
    const warnings = document.getElementById("result-warnings");
    cards.innerHTML = "";
    warnings.innerHTML = "";

    data.top.forEach((item, i) => {
      const pct = Math.round(item.confidence * 100);
      const el = document.createElement("article");
      el.className = "result-card" + (i === 0 ? " best" : "");
      el.innerHTML =
        "<img alt='' width='640' height='480'><div class='result-body'>" +
        "<span class='rank'></span><h4></h4><div class='bar'><div></div></div><p class='pct'></p></div>";
      el.querySelector("img").src = "/static/images/crops/" + item.crop + ".webp";
      el.querySelector(".rank").textContent = i === 0 ? L.best_match : "#" + (i + 1);
      el.querySelector("h4").textContent = (L.crops && L.crops[item.crop]) || item.crop;
      el.querySelector(".bar div").style.width = pct + "%";
      el.querySelector(".pct").textContent = pct + "% " + L.match;
      cards.appendChild(el);
    });

    const notes = [];
    if (data.top[0].confidence < 0.5) notes.push(L.low_conf);
    data.warnings.forEach((w) =>
      notes.push(FIELD_LABEL[w.field] + " " + L.out_of_range + " " + w.min + "–" + w.max)
    );
    notes.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      warnings.appendChild(li);
    });

    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
