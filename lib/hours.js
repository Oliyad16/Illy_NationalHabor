/* Café open-hours config + availability logic.
 *
 * This is the FALLBACK source of truth for "are we accepting online orders right
 * now?" used until the Toast Configuration API is enabled (currently 403). Once
 * Toast access is granted, /api/availability prefers live Toast hours and only
 * falls back to this.
 *
 * Times are local café time. Edit HOURS to match real hours; days not listed are
 * treated as CLOSED. Use 24h "HH:MM". Overnight ranges (close < open) are not
 * needed for a café and are not supported here.
 */

const TIMEZONE = "America/New_York"; // National Harbor, MD

// day index: 0=Sun ... 6=Sat
const HOURS = {
  0: { open: "08:00", close: "18:00" }, // Sun
  1: { open: "08:00", close: "18:00" }, // Mon
  2: { open: "08:00", close: "18:00" }, // Tue
  3: { open: "08:00", close: "18:00" }, // Wed
  4: { open: "08:00", close: "18:00" }, // Thu
  5: { open: "08:00", close: "18:00" }, // Fri
  6: { open: "08:00", close: "18:00" }  // Sat
};

// Last online order is cut off this many minutes before close (kitchen wind-down).
const LAST_ORDER_BEFORE_CLOSE_MIN = 20;

// Specific closed dates (holidays), "YYYY-MM-DD" in café local time.
const CLOSED_DATES = [];

function pad(n) { return n < 10 ? "0" + n : "" + n; }

/* Get {y,m,d,day,minutes} for an epoch ms in the café timezone, without pulling
 * in a tz library. Uses Intl to format parts in the target zone. */
function partsInZone(epochMs) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  });
  const map = {};
  fmt.formatToParts(new Date(epochMs)).forEach(function (p) { map[p.type] = p.value; });
  const dayNames = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // some environments emit 24 for midnight
  return {
    y: map.year, m: map.month, d: map.day,
    dateStr: map.year + "-" + map.month + "-" + map.day,
    day: dayNames[map.weekday],
    minutes: hour * 60 + parseInt(map.minute, 10)
  };
}

function toMin(hhmm) {
  const a = hhmm.split(":");
  return parseInt(a[0], 10) * 60 + parseInt(a[1], 10);
}

function fmtTime(min) {
  let h = Math.floor(min / 60), m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return h + ":" + pad(m) + " " + ampm;
}

/* Returns { open, reason, opensAt, lastOrder } for the given time (default now).
 * `open` is true only when within hours AND before the last-order cutoff. */
function availabilityAt(epochMs) {
  const p = partsInZone(epochMs);

  if (CLOSED_DATES.indexOf(p.dateStr) !== -1) {
    return { open: false, reason: "Closed today (holiday).", opensAt: null };
  }

  const todays = HOURS[p.day];
  if (!todays) {
    return { open: false, reason: "Closed today.", opensAt: null };
  }

  const openMin = toMin(todays.open);
  const closeMin = toMin(todays.close);
  const lastOrderMin = closeMin - LAST_ORDER_BEFORE_CLOSE_MIN;

  if (p.minutes < openMin) {
    return {
      open: false,
      reason: "Online ordering opens at " + fmtTime(openMin) + ".",
      opensAt: fmtTime(openMin)
    };
  }
  if (p.minutes >= lastOrderMin) {
    return {
      open: false,
      reason: "Online ordering is closed for today (last order " + fmtTime(lastOrderMin) + ").",
      opensAt: null
    };
  }
  return {
    open: true,
    reason: "Accepting online orders until " + fmtTime(lastOrderMin) + ".",
    opensAt: fmtTime(openMin),
    lastOrder: fmtTime(lastOrderMin)
  };
}

module.exports = { availabilityAt, HOURS, TIMEZONE, LAST_ORDER_BEFORE_CLOSE_MIN, partsInZone, fmtTime };
