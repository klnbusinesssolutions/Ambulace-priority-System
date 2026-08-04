/**
 * Utility to parse client device, OS, browser, and resolve real physical location
 * using Browser Geolocation with IP geolocation fallback.
 * Never fabricates hardcoded locations or fake IPs.
 */

export function parseUserAgent() {
  if (typeof navigator === "undefined") {
    return { browser: "Unknown Browser", os: "Unknown OS", device: "Desktop" };
  }

  const ua = navigator.userAgent;
  let browser = "Chrome";
  let os = "Windows";
  let device = "Desktop";

  // Browser detection
  if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("Chrome/")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${match ? match[1].split(".")[0] : ""}`.trim();
  }

  // OS detection
  if (ua.includes("Win")) {
    os = ua.includes("Windows NT 10.0") ? "Windows 10/11" : "Windows";
  } else if (ua.includes("Mac")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
    device = "Mobile";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    device = ua.includes("iPad") ? "Tablet" : "Mobile";
  }

  return { browser, os, device: `${os} ${device}` };
}

/**
 * Resolves current client location and public IP.
 * Priority:
 * 1. Browser Geolocation (if granted) + Reverse Geocoding
 * 2. IP Geolocation API fallback (labeled as Approx. IP)
 * 3. Fallback: "Location unavailable"
 */
export async function getClientLocationAndIp() {
  let ip = "Unavailable";
  let location = "Location unavailable";

  // Attempt to fetch public IP and IP-based geolocation first (fast & reliable)
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) ip = data.ip;
      if (data.city && (data.region || data.country_name)) {
        const regionCode = data.region_code || data.region || "";
        const countryCode = data.country_code || data.country_name || "";
        const locParts = [data.city, regionCode, countryCode].filter(Boolean).join(", ");
        location = `${locParts} (Approx. IP)`;
      }
    }
  } catch (e) {
    // If ipapi fails, try alternative IP provider
    try {
      const resAlt = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
      if (resAlt.ok) {
        const altData = await resAlt.json();
        if (altData.ip) ip = altData.ip;
      }
    } catch (_) {
      // Ignored
    }
  }

  // Next, try Browser Geolocation API if available for higher accuracy
  if (typeof navigator !== "undefined" && "geolocation" in navigator) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      // Reverse geocode via OpenStreetMap Nominatim
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: { "User-Agent": "AmbuGridAdminConsole/2.4" },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const address = geoData.address || {};
        const city = address.city || address.town || address.village || address.suburb || address.county;
        const state = address.state;
        const country = address.country_code ? address.country_code.toUpperCase() : address.country;

        if (city || state) {
          const locParts = [city, state, country].filter(Boolean).join(", ");
          location = locParts; // High-accuracy browser geolocation
        }
      }
    } catch (geoError) {
      // Geolocation denied or timed out — keep IP location or "Location unavailable"
      console.log("Browser Geolocation note:", geoError.message || geoError.code);
    }
  }

  return { ip, location };
}
