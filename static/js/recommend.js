(function () {
  const form = document.getElementById("rec-form");
  const gpsBtn = document.getElementById("use-gps");
  const placeInput = document.getElementById("place-input");
  const placeList = document.getElementById("place-list");
  const placeChosen = document.getElementById("place-chosen");
  const climateStatus = document.getElementById("climate-status");
  const formError = document.getElementById("form-error");
  const submitBtn = document.getElementById("submit-btn");
  const results = document.getElementById("results");

  let farmLocation = null; // { lat, lon, label }

  const season = () => form.querySelector("input[name=season]:checked").value;

  function setStatus(text, kind) {
    climateStatus.textContent = text;
    climateStatus.className = "climate-status" + (kind ? " " + kind : "");
  }

  // ---------- Climate auto-fill ----------
  async function loadClimate() {
    if (!farmLocation) return;
    setStatus("Loading climate…", "loading");
    try {
      const params = new URLSearchParams({ lat: farmLocation.lat, lon: farmLocation.lon, season: season() });
      const res = await fetch("/api/climate?" + params);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load climate");
      form.temperature.value = data.temperature;
      form.humidity.value = data.humidity;
      form.rainfall.value = data.rainfall;
      setStatus("Filled for " + data.season_label, "ok");
    } catch (err) {
      setStatus(err.message + ". Enter the values by hand.", "error");
    }
  }

  function chooseLocation(lat, lon, label) {
    farmLocation = { lat, lon, label };
    placeChosen.textContent = "📍 " + label;
    placeChosen.hidden = false;
    loadClimate();
  }

  form.querySelectorAll("input[name=season]").forEach((r) =>
    r.addEventListener("change", loadClimate)
  );

  // ---------- GPS ----------
  gpsBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Your browser can't share location. Search instead.", "error");
      return;
    }
    setStatus("Getting your location…", "loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        chooseLocation(latitude, longitude,
          "Your location (" + latitude.toFixed(3) + ", " + longitude.toFixed(3) + ")");
      },
      () => setStatus("Location permission denied. Search for your place instead.", "error"),
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
        const places = await res.json();
        if (!res.ok) throw new Error(places.error);
        renderPlaces(places);
      } catch {
        placeList.innerHTML = "<li class='empty'>Search is unavailable right now</li>";
        placeList.hidden = false;
      }
    }, 300);
  });

  function renderPlaces(places) {
    placeList.innerHTML = "";
    if (!places.length) {
      placeList.innerHTML = "<li class='empty'>No places found</li>";
    }
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
  const FIELDS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const missing = FIELDS.filter((f) => form[f].value.trim() === "");
    if (missing.length) {
      const names = { ph: "pH", temperature: "Temperature", humidity: "Humidity", rainfall: "Rainfall" };
      formError.textContent = "Please fill in: " + missing.map((f) => names[f] || f).join(", ");
      formError.hidden = false;
      return;
    }

    const body = {};
    FIELDS.forEach((f) => (body[f] = Number(form[f].value)));

    submitBtn.disabled = true;
    submitBtn.textContent = "Thinking…";
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction failed");
      renderResults(data);
    } catch (err) {
      formError.textContent = err.message;
      formError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Recommend Crop";
    }
  });

  function renderResults(data) {
    const cards = document.getElementById("result-cards");
    const warnings = document.getElementById("result-warnings");
    cards.innerHTML = "";
    warnings.innerHTML = "";

    data.top.forEach((item, i) => {
      const pct = Math.round(item.confidence * 100);
      const card = document.createElement("article");
      card.className = "result-card" + (i === 0 ? " best" : "");
      card.innerHTML =
        "<span class='rank'></span><h3></h3>" +
        "<div class='bar'><div></div></div><p class='pct'></p>";
      card.querySelector(".rank").textContent = i === 0 ? "Best match" : "#" + (i + 1);
      card.querySelector("h3").textContent = item.crop;
      card.querySelector(".bar div").style.width = pct + "%";
      card.querySelector(".pct").textContent = pct + "% match";
      cards.appendChild(card);
    });

    if (data.top[0].confidence < 0.5) {
      data.warnings.unshift("The model is not very confident. These conditions don't closely match any crop in the dataset.");
    }
    data.warnings.forEach((w) => {
      const li = document.createElement("li");
      li.textContent = w;
      warnings.appendChild(li);
    });

    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
