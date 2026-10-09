(function () {
  const L = window.I18N || {};
  const form = document.getElementById("rec-form");
  if (!form) return;

  const formError = document.getElementById("form-error");
  const submitBtn = document.getElementById("submit-btn");
  const results = document.getElementById("results");

  const FIELDS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];
  const FIELD_LABEL = {
    N: L.lbl_N, P: L.lbl_P, K: L.lbl_K, ph: L.lbl_ph,
    temperature: L.lbl_temperature, humidity: L.lbl_humidity, rainfall: L.lbl_rainfall,
  };

  // ---------- Try sample values ----------
  document.querySelectorAll(".sample-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const values = JSON.parse(btn.dataset.values);
      FIELDS.forEach((f) => (form[f].value = values[f]));
      document.querySelectorAll(".sample-btn").forEach((b) => b.classList.toggle("active", b === btn));
      formError.hidden = true;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );

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
