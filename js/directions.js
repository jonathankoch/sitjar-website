// Directions gate: opens a password modal, asks the Netlify function to verify
// the password, and reveals the returned map. The map data only ever arrives
// from the server after a correct password — nothing sensitive is in this file.
(function () {
  const openBtn = document.getElementById("directions-open");
  const modal = document.getElementById("directions-modal");
  if (!openBtn || !modal) return;

  const form = document.getElementById("directions-form");
  const input = document.getElementById("directions-password");
  const errorEl = document.getElementById("directions-error");
  const submitBtn = form.querySelector(".modal__submit");
  const viewPassword = document.getElementById("view-password");
  const viewMap = document.getElementById("view-map");
  const mapAddress = document.getElementById("map-address");
  const mapEmbed = document.getElementById("map-embed");
  const mapLink = document.getElementById("map-link");

  const ENDPOINT = "/.netlify/functions/directions";
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKeydown);
    // Focus the field if we're still on the password step.
    if (!viewPassword.hidden) {
      window.setTimeout(() => input.focus(), 50);
    }
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  openBtn.addEventListener("click", openModal);
  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", closeModal)
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const password = input.value;
    if (!password) return;

    const label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking…";

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.status === 200) {
        renderMap(await res.json());
      } else if (res.status === 401) {
        showError("That password didn’t match — check your invitation.");
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      showError("Couldn’t reach the directions service. (Is the site running through Netlify?)");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = label;
      input.value = "";
    }
  });

  function renderMap(data) {
    mapAddress.textContent = data.address || "";

    // Build the iframe via the DOM (never inject server text as HTML).
    const iframe = document.createElement("iframe");
    iframe.title = "Map to Mas Sitjar";
    iframe.src = data.embedUrl;
    iframe.loading = "lazy";
    iframe.allow = "fullscreen";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    mapEmbed.replaceChildren(iframe);

    if (data.directionsUrl) mapLink.href = data.directionsUrl;

    viewPassword.hidden = true;
    viewMap.hidden = false;
  }
})();
