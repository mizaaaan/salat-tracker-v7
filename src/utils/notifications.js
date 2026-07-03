import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { calculatePrayerTimes } from './prayerTimes';

const ARABIC = {
  Fajr:    'الفجر',
  Dhuhr:   'الظهر',
  Asr:     'العصر',
  Maghrib: 'المغرب',
  Isha:    'العشاء',
};

// Durud / Salawat texts — rotated for a little variety
const DURUD_MESSAGES = [
  { title: '🌿 Durud Reminder', body: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ' },
  { title: '🌿 Durud Reminder', body: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ ﷺ' },
  { title: '🌿 Durud Reminder', body: 'اللَّهُمَّ صَلِّ عَلَىٰ سَیِّدِنَا مُحَمَّدٍ ﷺ' },
];

/** Request permission to show notifications. Returns true if granted. */
export const requestNotificationPermission = async () => {
  if (!Device.isDevice) return false; // Skip on simulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/** Cancel only notifications scheduled with the given data.type tag. */
const cancelByType = async (type) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(n => n.content?.data?.type === type);
    await Promise.all(
      toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // ignore
  }
};

// iOS caps a single app at 64 pending local notifications. We reserve a
// couple slots for the Durud reminder and stay comfortably under that limit.
const SCHEDULE_DAYS_AHEAD = 10; // 5 prayers × 10 days = 50 notifications

/**
 * Schedule local notifications for all 5 trackable prayers across the next
 * `SCHEDULE_DAYS_AHEAD` days (starting today), computed from a single
 * lat/lng. This is what lets reminders keep firing for ~10 days even if the
 * app isn't reopened in between.
 * Cancels any previously scheduled *prayer* notifications first
 * (leaves Durud reminders untouched).
 */
export const schedulePrayerNotifications = async (latitude, longitude) => {
  await cancelByType('prayer');

  const now = new Date();

  for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS_AHEAD; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const times = calculatePrayerTimes(latitude, longitude, date);

    const trackable = {
      Fajr:    times.Fajr,
      Dhuhr:   times.Dhuhr,
      Asr:     times.Asr,
      Maghrib: times.Maghrib,
      Isha:    times.Isha,
    };

    for (const [name, time] of Object.entries(trackable)) {
      if (!time || time <= now) continue; // Skip past prayers

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${name} — ${ARABIC[name]}`,
          body:  `It's time for ${name} prayer. Allahu Akbar! 🤲`,
          sound: true,
          data:  { type: 'prayer', prayer: name },
        },
        trigger: { date: time },
      });
    }
  }
};

/**
 * Fetches the current location and (re)schedules all upcoming prayer
 * notifications for the next `SCHEDULE_DAYS_AHEAD` days.
 * Use this any time notification settings change outside of the Home
 * screen (e.g. toggling the setting on from Settings), or from the
 * background task, so reminders keep extending automatically.
 * Returns true on success, false if permission/location could not be obtained.
 */
export const refreshPrayerNotifications = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await schedulePrayerNotifications(loc.coords.latitude, loc.coords.longitude);
    return true;
  } catch {
    return false;
  }
};

/** Cancel all scheduled prayer notifications (Durud reminders are untouched). */
export const cancelAllNotifications = async () => {
  await cancelByType('prayer');
};

/**
 * Returns true if the given hour (0-23, on-the-hour) falls inside the quiet
 * window. Handles windows that wrap past midnight (e.g. 22:00 → 08:00).
 */
const isWithinQuietHours = (hour, quiet) => {
  if (!quiet || !quiet.enabled) return false;

  const start = quiet.startHour;
  const end   = quiet.endHour;

  if (start === end) return false; // zero-length window = never quiet

  if (start < end) {
    // Same-day window, e.g. 01:00 → 05:00
    return hour >= start && hour < end;
  }
  // Wraps past midnight, e.g. 22:00 → 08:00
  return hour >= start || hour < end;
};

const DEFAULT_QUIET_HOURS = { enabled: true, startHour: 22, endHour: 8 };

/**
 * Schedules a Durud / Salawat reminder every `intervalHours` hours,
 * skipping any hour that falls within the given quiet-hours window
 * (e.g. 10 PM – 8 AM) so the user isn't woken up overnight.
 *
 * Implementation note: rather than one repeating "every N seconds" trigger
 * (which can't skip specific hours), this schedules one native *daily
 * calendar* trigger — { hour, minute: 0, repeats: true } — for every active
 * hour-of-day in the cycle. Each one is a true OS-level repeating alarm, so
 * it keeps firing forever without the app ever needing to reopen, exactly
 * like the previous approach, but now quiet hours are simply the hours we
 * never schedule. Messages rotate across the scheduled hours for variety.
 *
 * Cancels any previously scheduled Durud reminders first.
 */
export const scheduleDurudReminder = async (intervalHours = 1, quiet = DEFAULT_QUIET_HOURS) => {
  await cancelByType('durud');

  const step = Math.max(1, Math.min(12, Math.round(intervalHours)));

  let msgIndex = 0;
  for (let hour = 0; hour < 24; hour += step) {
    if (isWithinQuietHours(hour, quiet)) continue;

    const msg = DURUD_MESSAGES[msgIndex % DURUD_MESSAGES.length];
    msgIndex++;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body:  msg.body,
        sound: true,
        data:  { type: 'durud' },
      },
      trigger: {
        hour,
        minute:  0,
        repeats: true,
      },
    });
  }
};

/** Cancel only the scheduled Durud reminder (prayer notifications are untouched). */
export const cancelDurudReminder = async () => {
  await cancelByType('durud');
};