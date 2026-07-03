/**
 * Background task that periodically re-extends the prayer notification
 * schedule (see SCHEDULE_DAYS_AHEAD in notifications.js) without requiring
 * the app to be opened.
 *
 * IMPORTANT — real-world limits (this is a hard OS rule, not a bug):
 *  - iOS/Android decide WHEN this task actually runs — it is NOT guaranteed
 *    to fire on a fixed schedule. Frequently-used apps get run more often;
 *    rarely-opened apps get deprioritized.
 *  - If the app is force-quit (swiped away in the app switcher on iOS),
 *    background tasks stop entirely until the app is reopened.
 *  - This task must be defined at module scope (not inside a component) so
 *    the native background runtime can find it.
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getNotificationsEnabled } from './storage';
import { refreshPrayerNotifications } from './notifications';

export const PRAYER_BACKGROUND_TASK = 'salat-tracker-prayer-refresh';

TaskManager.defineTask(PRAYER_BACKGROUND_TASK, async () => {
  try {
    const enabled = await getNotificationsEnabled();
    if (!enabled) return BackgroundFetch.BackgroundFetchResult.NoData;

    const ok = await refreshPrayerNotifications();
    return ok
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registers the background task. Safe to call multiple times (e.g. on every
 * app launch) — re-registering with the same name is a no-op if already
 * registered.
 */
export const registerPrayerBackgroundTask = async () => {
  try {
    const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(PRAYER_BACKGROUND_TASK);
    if (alreadyRegistered) return;

    await BackgroundFetch.registerTaskAsync(PRAYER_BACKGROUND_TASK, {
      minimumInterval: 60 * 60 * 12, // ask the OS for ~every 12h (advisory only)
      stopOnTerminate:  false,        // Android: keep trying after app is backgrounded
      startOnBoot:      true,         // Android: resume after device restart
    });
  } catch {
    // Background fetch may be unavailable (e.g. restricted by parental
    // controls, or user disabled it in system settings) — fail silently,
    // the foreground refresh (on Home tab focus) still covers normal use.
  }
};
