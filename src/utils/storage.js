import AsyncStorage from '@react-native-async-storage/async-storage';

const PRAYERS_PREFIX       = 'prayers_';
const COMPLETE_DAYS_KEY    = 'complete_days';
const NOTIFICATIONS_KEY    = 'notifications_enabled';
const DURUD_ENABLED_KEY    = 'durud_notifications_enabled';
const DURUD_INTERVAL_KEY   = 'durud_notifications_interval_hours';

// ─── Date helpers ────────────────────────────────────────────────────────────

export const todayKey = () => new Date().toISOString().split('T')[0];

const keyForOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

// ─── Prayer completion ────────────────────────────────────────────────────────

/** Returns array of completed prayer names for a given date key (YYYY-MM-DD). */
export const getCompletedPrayers = async (date = todayKey()) => {
  try {
    const raw = await AsyncStorage.getItem(PRAYERS_PREFIX + date);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Toggle a prayer done / undone. Returns updated array. */
export const togglePrayer = async (prayer, date = todayKey()) => {
  const list = await getCompletedPrayers(date);
  const idx  = list.indexOf(prayer);

  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(prayer);
  }

  await AsyncStorage.setItem(PRAYERS_PREFIX + date, JSON.stringify(list));

  // A day is "complete" when all 5 trackable prayers are done
  await _updateCompleteDays(date, list.length >= 5);

  return list;
};

// ─── Complete-days ledger ─────────────────────────────────────────────────────

const _getCompleteDays = async () => {
  try {
    const raw = await AsyncStorage.getItem(COMPLETE_DAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const _updateCompleteDays = async (date, isDone) => {
  const days = await _getCompleteDays();
  const idx  = days.indexOf(date);

  if (isDone && idx < 0) {
    days.push(date);
    days.sort(); // keep chronological
  } else if (!isDone && idx >= 0) {
    days.splice(idx, 1);
  }

  await AsyncStorage.setItem(COMPLETE_DAYS_KEY, JSON.stringify(days));
};

// ─── Streak calculation ───────────────────────────────────────────────────────

/**
 * Returns { currentStreak, longestStreak, totalDays }.
 */
export const getStreakData = async () => {
  const days = await _getCompleteDays();
  if (days.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  }

  const today     = todayKey();
  const yesterday = keyForOffset(1);

  // ── Longest streak ──
  let longest = 1;
  let run     = 1;
  for (let i = 1; i < days.length; i++) {
    const diff =
      (new Date(days[i]) - new Date(days[i - 1])) / 86_400_000;
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // ── Current streak (streak is alive if last complete day is today or yesterday) ──
  let currentStreak = 0;
  const lastDay = days[days.length - 1];

  if (lastDay === today || lastDay === yesterday) {
    currentStreak = 1;
    for (let i = days.length - 2; i >= 0; i--) {
      const diff =
        (new Date(days[i + 1]) - new Date(days[i])) / 86_400_000;
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak: longest,
    totalDays:     days.length,
  };
};

// ─── Notification preference ──────────────────────────────────────────────────

/** Returns true if notifications are enabled (default: true). */
export const getNotificationsEnabled = async () => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return raw === null ? true : JSON.parse(raw);
  } catch {
    return true;
  }
};

/** Persists the user's notification preference. */
export const setNotificationsEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(enabled));
  } catch {
    // ignore
  }
};

// ─── Durud (Salawat) reminder preference ──────────────────────────────────────

/** Returns true if the Durud reminder is enabled (default: false). */
export const getDurudEnabled = async () => {
  try {
    const raw = await AsyncStorage.getItem(DURUD_ENABLED_KEY);
    return raw === null ? false : JSON.parse(raw);
  } catch {
    return false;
  }
};

/** Persists the user's Durud reminder on/off preference. */
export const setDurudEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(DURUD_ENABLED_KEY, JSON.stringify(enabled));
  } catch {
    // ignore
  }
};

/** Returns the Durud reminder interval in hours, 1–12 (default: 1). */
export const getDurudIntervalHours = async () => {
  try {
    const raw = await AsyncStorage.getItem(DURUD_INTERVAL_KEY);
    return raw === null ? 1 : JSON.parse(raw);
  } catch {
    return 1;
  }
};

/** Persists the user's Durud reminder interval in hours (1–12). */
export const setDurudIntervalHours = async (hours) => {
  try {
    await AsyncStorage.setItem(DURUD_INTERVAL_KEY, JSON.stringify(hours));
  } catch {
    // ignore
  }
};

/**
 * Returns an array of 7 objects (Mon-today) each with:
 * { date, dayName, completed, allDone }
 */
export const getWeeklyData = async () => {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date();
    d.setDate(d.getDate() - i);
    const key  = d.toISOString().split('T')[0];
    const done = await getCompletedPrayers(key);
    result.push({
      date:      key,
      dayName:   d.toLocaleDateString('en', { weekday: 'short' }),
      completed: done.length,
      allDone:   done.length >= 5,
    });
  }
  return result;
};
