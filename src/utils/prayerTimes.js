import { Coordinates, CalculationMethod, PrayerTimes, Qibla } from 'adhan';

// The 5 trackable prayers (Sunrise is display-only, not marked done)
export const TRACKABLE_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// ALL_PRAYERS includes Sunrise and Sunset as display-only cards (not trackable).
// PrayerCard handles isTrackable=false automatically (no checkbox, reduced opacity).
export const ALL_PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Sunset', 'Maghrib', 'Isha'];

export const PRAYER_META = {
  Fajr:    { icon: '🌅', image: require('../../assets/prayers/fajr.png'),    arabic: 'الفجر',   color: '#7B8CDE' },
  Sunrise: { icon: '🌄', image: require('../../assets/prayers/sunrise.png'), arabic: 'الشروق',  color: '#F9A825' },
  Dhuhr:   { icon: '☀️', image: require('../../assets/prayers/dhuhr.png'),   arabic: 'الظهر',   color: '#FFD600' },
  Asr:     { icon: '🌤️', image: require('../../assets/prayers/asr.png'),    arabic: 'العصر',   color: '#FF8F00' },
  Sunset:  { icon: '🌅', image: require('../../assets/prayers/maghrib.png'), arabic: 'الغروب',  color: '#E65100' },
  Maghrib: { icon: '🌇', image: require('../../assets/prayers/maghrib.png'), arabic: 'المغرب',  color: '#FF7043' },
  Isha:    { icon: '🌙', image: require('../../assets/prayers/isha.png'),    arabic: 'العشاء',  color: '#5C6BC0' },
};

/**
 * Calculate prayer times for a given location and date.
 * Uses Karachi method (standard in South/Southeast Asia).
 */
export const calculatePrayerTimes = (latitude, longitude, date = new Date()) => {
  const coordinates = new Coordinates(latitude, longitude);
  const params      = CalculationMethod.Karachi();
  const times       = new PrayerTimes(coordinates, date, params);

  return {
    Fajr:    times.fajr,
    Sunrise: times.sunrise,
    Dhuhr:   times.dhuhr,
    Asr:     times.asr,
    Sunset:  times.sunset,
    Maghrib: times.maghrib,
    Isha:    times.isha,
  };
};

/**
 * Returns the Qibla bearing (degrees clockwise from North) for a location.
 */
export const calculateQibla = (latitude, longitude) => {
  const coordinates = new Coordinates(latitude, longitude);
  return Qibla(coordinates);
};

/**
 * Finds the next upcoming prayer after now.
 * Iterates TRACKABLE_PRAYERS only — Sunrise is not a prayer to "count down to".
 * After all today's prayers pass (post-Isha), rolls over to tomorrow's Fajr.
 */
export const getNextPrayer = (prayerTimes, latitude, longitude) => {
  const now = new Date();
  for (const name of TRACKABLE_PRAYERS) {
    if (prayerTimes[name] && prayerTimes[name] > now) {
      return { name, time: prayerTimes[name] };
    }
  }

  // All of today's prayers have passed — roll over to tomorrow's Fajr
  if (latitude != null && longitude != null) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = calculatePrayerTimes(latitude, longitude, tomorrow);
    return { name: 'Fajr', time: tomorrowTimes.Fajr };
  }

  return null;
};

/**
 * Returns tomorrow's Fajr time for a given location.
 */
export const getTomorrowFajr = (latitude, longitude) => {
  if (latitude == null || longitude == null) return null;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return calculatePrayerTimes(latitude, longitude, tomorrow).Fajr;
};

/**
 * Formats a Date object to a 12-hour time string, e.g. "4:23 AM"
 */
export const formatTime = (date) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Returns a countdown string "HH:MM:SS" for the difference between
 * a future Date and now.
 */
export const getCountdown = (targetDate) => {
  const diff = targetDate - new Date();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

/**
 * Returns the CURRENT active prayer and the Date when it ends.
 */
export const getCurrentPrayer = (prayerTimes, tomorrowFajr = null) => {
  const now   = new Date();
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (let i = order.length - 1; i >= 0; i--) {
    const name      = order[i];
    const startTime = prayerTimes[name];
    if (startTime && now >= startTime) {
      const nextName  = order[i + 1];
      const nextStart = nextName ? prayerTimes[nextName] : null;
      const endsAt    = nextStart ?? tomorrowFajr ?? null;
      return { name, endsAt };
    }
  }
  return null;
};