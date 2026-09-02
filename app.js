const SUPABASE_URL = "https://cebgyyairqctbgrocxgl.supabase.co";
const SUPABASE_URL = "https://cebgyyairqctbgrocxgl.supabase.co";
const SUPABASE_KEY = "sb_publishable_VFT7GrL1rJtmV0hv0CPrlg_qjZXq4PT";
let managerToken = "";
let managerName = "";

const el = (id) => document.getElementById(id);
const show = (id) => el(id).classList.remove("hidden");
const hide = (id) => el(id).classList.add("hidden");

async function api(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error("Unable to connect. Please try again.");
  return response.json();
}

const rpc = (name, body) => api(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
const formatDate = (value) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));

function setMessage(id, message, success = false) {
  const target = el(id);
  target.textContent = message;
  target.classList.toggle("success", success);
  target.classList.toggle("hidden", !message);
}

el("entry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const button = el("entry-button");
  buttn.disabled = true;
  button.textContent = "Checking your location…";
  setMessage("entry-message", "Checking that you’re at One7One…");
  if (!navigator.geolocation) {
    setMessage("entry-message", "Location services aren’t available on this phone.");
    button.disabled = false; button.textContent = "🎉 Enter the draw"; return;
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const result = await rpc("promotion_submit_entry", {
        p_full_name: el("full-name").value,
        p_phone: el("phone").value,
        p_latitude: position.coords.latitude,
        p_longitude: position.coords.longitude,
        p_accuracy_m: position.coords.accuracy,
        p_consent: el("consent").checked
      });
      setMessage("entry-message", result.message || "Please try again.", result.success === true);
      if (result.success) el("entry-form").reset();
    } catch (error) { setMessage("entry-message", error.message); }
    finally { button.disabled = false; button.textContent = "🎉 Enter the draw"; }
  }, () => {
    setMessage("entry-message", "Please allow location access to enter while you’re at One7One.");
    button.disabled = false; button.textContent = "🎉 Enter the draw";
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
});

async function loadManagers() {
  try {
    const managers = await api("staff_members?select=id,name&role=eq.manager&active=eq.true&order=display_order.asc");
    el("manager").innerHTML = managers.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");
  } catch { setMessage("login-message", "Unable to load manager access."); }
}

el("pin").addEventListener("input", (event) => event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4));
el("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  el("login-button").disabled = true;
  try {
    const result = await rpc("manager_login_with_pin", {
      p_staff_id: el("manager").value, p_pin: el("pin").value, p_device_id: "one7one-promotion"
    });
    if (!result.success) { setMessage("login-message", result.message || "Incorrect PIN."); return; }
    managerToken = result.token; managerName = result.manager_name || "Manager";
    el("pin").value = ""; await loadDashboard();
  } catch (error) { setMessage("login-message", error.message); }
  finally { el("login-button").disabled = false; }
});

async function loadDashboard() {
  const data = await rpc("promotion_admin_dashboard", { p_token: managerToken });
  if (!data.success) { managerToken = ""; show("admin-login"); hide("dashboard"); setMessage("login-message", "Your manager session has expired."); return; }
  hide("admin-login"); show("dashboard");
  el("week-label").textContent = `${formatDate(data.week_start)} – ${formatDate(data.week_end)}`;
  el("entry-count").textContent = data.entry_count;
  el("customer-count").textContent = data.unique_customers;
  el("entry-badge").textContent = data.entries.length;
  el("signed-in").textContent = `Signed in as ${managerName}`;
  el("entries-empty").classList.toggle("hidden", data.entries.length > 0);
  el("entries").innerHTML = data.entries.map((entry) => `<tr><td>${escapeHtml(entry.full_name)}</td><td>${escapeHtml(entry.phone)}</td><td>${formatDate(entry.entry_date)}</tr>`).join("");
  el("history").innerHTML = data.draws.length ? data.draws.map((draw) => `<div class="history-item"><span>🏆</span><div><strong>${escapeHtml(draw.winner_name)}</strong><span>${escapeHtml(draw.winner_phone)}</span><small>Week ending ${formatDate(draw.week_end)}</small></div></div>`).join("") : '<p class="empty">No completed draws yet.</p>';
  const alreadyDrawn = data.draws.some((draw) => draw.week_start === data.week_start);
  el("draw-button").disabled = alreadyDrawn || data.entries.length === 0;
  el("draw-button").textContent = alreadyDrawn ? "🏆 Winner already drawn" : "🏆 Draw winner";
}

el("draw-button").addEventListener("click", async () => {
  if (!confirm("Randomly select and permanently record this week’s winner?")) return;
  el("draw-button").disabled = true;
  try {
    const result = await rpc("promotion_draw_winner", { p_token: managerToken });
    setMessage("draw-message", result.success ? `🎉 Winner: ${result.winner_name} — ${result.winner_phone}` : result.message);
    if (result.success) await loadDashboard();
  } catch (error) { setMessage("draw-message", error.message); }
});

el("sign-out").addEventListener("click", () => { managerToken = ""; hide("dashboard"); show("admin-login"); });
function escapeHtml(value) { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; }

if (new URLSearchParams(location.search).has("admin")) {
  hide("customer"); show("admin-login"); loadManagers();
}
