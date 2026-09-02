const SUPABASE_URL = "https://cebgyyairqctbgrocxgl.supabase.co";
const SUPABASE_KEY = "sb_publishable_VFT7GrL1rJtmV0hv0CPrlg_qjZXq4PT";

const el = (id) => document.getElementById(id);

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

  if (!response.ok) {
    throw new Error("Unable to connect. Please try again.");
  }

  return response.json();
}

const rpc = (name, body) =>
  api(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body)
  });

function setMessage(message, success = false) {
  const target = el("entry-message");
  target.textContent = message;
  target.classList.toggle("success", success);
  target.classList.toggle("hidden", !message);
}

el("entry-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const button = el("entry-button");
  button.disabled = true;
  button.textContent = "CHECKING LOCATION…";
  setMessage("Checking that you’re at One7One…");

  if (!navigator.geolocation) {
    setMessage("Location services aren’t available on this phone.");
    button.disabled = false;
    button.textContent = "ENTER DRAW";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const result = await rpc("promotion_submit_entry", {
          p_full_name: el("full-name").value,
          p_phone: el("phone").value,
          p_latitude: position.coords.latitude,
          p_longitude: position.coords.longitude,
          p_accuracy_m: position.coords.accuracy,
          p_consent: el("consent").checked
        });

        setMessage(
          result.message || "Please try again.",
          result.success === true
        );

        if (result.success) {
          el("entry-form").reset();
        }
      } catch (error) {
        setMessage(error.message);
      } finally {
        button.disabled = false;
        button.textContent = "ENTER DRAW";
      }
    },
    () => {
      setMessage(
        "Please allow location access to enter while you’re at One7One."
      );
      button.disabled = false;
      button.textContent = "ENTER DRAW";
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
});
