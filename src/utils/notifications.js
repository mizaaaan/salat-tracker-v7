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
 * Schedule a true, infinitely-repeating Durud / Salawat reminder every
 * `intervalHours` hours, using the OS's native repeat trigger.
 *
 * NOTE: a native repeating notification is locked to ONE fixed message —
 * the OS fires it forever without the app ever needing to be reopened.
 * Rotating between multiple messages would require rescheduling on each
 * firing, which only happens while the app is open — so to guarantee the
 * reminder keeps firing even if the app is never reopened, we use just the
 * first message here.
 * Cancels any previously scheduled Durud reminder first.
 */
export const scheduleDurudReminder = async (intervalHours = 1) => {
  await cancelByType('durud');

  const msg = DURUD_MESSAGES[0];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body:  msg.body,
      sound: true,
      data:  { type: 'durud' },
    },
    trigger: {
      seconds:  Math.max(1, Math.round(intervalHours * 3600)),
      repeats:  true,
    },
  });
};

/** Cancel only the scheduled Durud reminder (prayer notifications are untouched). */
export const cancelDurudReminder = async () => {
  await cancelByType('durud');
};