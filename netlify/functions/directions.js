// netlify/functions/directions.js
//
// Server-side gate for the private directions to Mas Sitjar.
// The address / coordinates are NEVER shipped in the static bundle — they live
// in environment variables and are only returned after a correct password.
//
// Required environment variables (set in Netlify UI → Site configuration →
// Environment variables, or in a local .env for `netlify dev`):
//   DIRECTIONS_PASSWORD  the shared passphrase you give to guests
//   MASIA_QUERY          map target: "lat,lng" (e.g. "42.123,2.456") or an address
//   MASIA_ADDRESS        human-readable address shown above the map
//
// Endpoint (default): POST /.netlify/functions/directions   body: { "password": "..." }

const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const secret = process.env.DIRECTIONS_PASSWORD;
  if (!secret) {
    // Misconfigured: don't leak details, but don't pretend the password was wrong.
    return json(500, { error: "Directions aren’t configured yet." });
  }

  let password = "";
  try {
    password = String(JSON.parse(event.body || "{}").password || "");
  } catch {
    return json(400, { error: "Malformed request." });
  }
  if (!password) return json(400, { error: "Password required." });

  if (!safeEqual(password, secret)) {
    await sleep(700); // small speed bump against brute-forcing a shared password
    return json(401, { error: "Incorrect password." });
  }

  // Authorized — hand back the location.
  const query = process.env.MASIA_QUERY || "41.3874,2.1686"; // placeholder: Barcelona
  const address = process.env.MASIA_ADDRESS || "Mas Sitjar";
  const q = encodeURIComponent(query);

  return json(200, {
    address,
    embedUrl: `https://www.google.com/maps?q=${q}&z=15&output=embed`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  });
};

// Hash both sides to a fixed length so timingSafeEqual gets equal-length buffers
// and the comparison can't leak the secret's length.
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}
