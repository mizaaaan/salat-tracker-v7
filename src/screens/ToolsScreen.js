/**
 * ToolsScreen — Tools, Streak, and Settings with Tasbih, Calendar & Hajj modals.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Switch, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../constants/ThemeContext';
import {
  getStreakData, getWeeklyData,
  getCompletedPrayers,
  getNotificationsEnabled, setNotificationsEnabled,
  getDurudEnabled, setDurudEnabled,
  getDurudIntervalHours, setDurudIntervalHours,
  getDurudQuietHoursEnabled, setDurudQuietHoursEnabled,
  getDurudQuietStart, setDurudQuietStart,
  getDurudQuietEnd, setDurudQuietEnd,
} from '../utils/storage';
import {
  cancelAllNotifications,
  requestNotificationPermission,
  refreshPrayerNotifications,
  scheduleDurudReminder, cancelDurudReminder,
} from '../utils/notifications';
import { TRACKABLE_PRAYERS } from '../utils/prayerTimes';

// ── Feature screens (modal) ────────────────────────────────────────────────────
import TasbihScreen         from './TasbihScreen';
import IslamicCalendarScreen from './IslamicCalendarScreen';
import HajjUmrahScreen       from './HajjUmrahScreen';
import AsmaulHusnaScreen     from './AsmaulHusnaScreen';

// ── Quotes ────────────────────────────────────────────────────────────────────
const QUOTES = [
  { text: 'Indeed, prayer has been decreed upon the believers a decree of specified times.', ref: 'Quran 4:103' },
  { text: 'The first matter that the servant will be brought to account for on the Day of Judgement is the prayer.', ref: 'Tirmidhi' },
  { text: 'Guard strictly the prayers, and the middle prayer, and stand before Allah devoutly obedient.', ref: 'Quran 2:238' },
];

const getStreakMessage = (n) => {
  if (n === 0) return 'Start your journey today 🌱';
  if (n < 3)   return 'Great start! Keep going! 💪';
  if (n < 7)   return "Masha Allah! You're consistent! ✨";
  if (n < 14)  return 'SubhanAllah! One week+ streak! 🌟';
  if (n < 30)  return 'Incredible consistency! ⭐⭐';
  return 'Allahu Akbar! You are truly dedicated! 👑';
};

/** Formats an on-the-hour value (0-23) as a 12-hour clock label, e.g. 22 → "10:00 PM". */
const formatHour12 = (hour) => {
  const period = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
};

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionCard({ icon, title, children, styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>{icon}</Text>
        <Text style={styles.cardHeaderTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const HR = ({ styles }) => <View style={styles.hr} />;

const StatChip = ({ value, label, icon, styles }) => (
  <View style={styles.statChip}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DayCell = ({ dayName, completed, allDone, styles, Colors }) => (
  <View style={styles.dayCol}>
    <Text style={styles.dayName}>{dayName}</Text>
    <View style={[styles.dayCircle, allDone && styles.dayCircleDone]}>
      {allDone
        ? <Text style={styles.dayCheck}>✓</Text>
        : <Text style={[styles.dayCount, completed > 0 && { color: Colors.primary }]}>{completed}</Text>
      }
    </View>
  </View>
);

// ── Tool row (tappable) ───────────────────────────────────────────────────────
function ToolRow({ icon, title, sub, color, onPress, isLast, styles }) {
  return (
    <>
      <TouchableOpacity style={styles.toolRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.toolIconBox, { backgroundColor: color + '22' }]}>
          <Text style={styles.toolIcon}>{icon}</Text>
        </View>
        <View style={styles.toolMeta}>
          <Text style={styles.toolTitle}>{title}</Text>
          <Text style={styles.toolSub}>{sub}</Text>
        </View>
        <View style={[styles.toolArrowBox, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <Text style={[styles.toolArrow, { color }]}>›</Text>
        </View>
      </TouchableOpacity>
      {!isLast && <HR styles={styles} />}
    </>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ToolsScreen() {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  // Streak state
  const [streak,       setStreak]       = useState({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
  const [weekly,       setWeekly]       = useState([]);
  const [todayPrayers, setTodayPrayers] = useState([]);
  // Settings state
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [durudEnabled, setDurudEnabledState] = useState(false);
  const [durudInterval, setDurudIntervalState] = useState(1);
  const [intervalPickerOpen, setIntervalPickerOpen] = useState(false);
  const [quietEnabled, setQuietEnabledState] = useState(true);
  const [quietStartHour, setQuietStartHourState] = useState(22);
  const [quietEndHour, setQuietEndHourState] = useState(8);
  const [quietPickerFor, setQuietPickerFor] = useState(null); // null | 'start' | 'end'
  // Loading
  const [loading, setLoading] = useState(true);
  // Quote
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Modal visibility
  const [tasbihOpen,   setTasbihOpen]   = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hajjOpen,     setHajjOpen]     = useState(false);
  const [namesOpen,    setNamesOpen]    = useState(false);

  // Load data when tab gains focus
  const loadData = useCallback(async () => {
    setLoading(true);
    const todayKey = new Date().toISOString().split('T')[0];
    const [s, w, todayDone, notif, durudOn, durudHrs, quietOn, quietStart, quietEnd] = await Promise.all([
      getStreakData(),
      getWeeklyData(),
      getCompletedPrayers(todayKey),
      getNotificationsEnabled(),
      getDurudEnabled(),
      getDurudIntervalHours(),
      getDurudQuietHoursEnabled(),
      getDurudQuietStart(),
      getDurudQuietEnd(),
    ]);
    setStreak(s);
    setWeekly(w);
    setTodayPrayers(todayDone);
    setNotifEnabled(notif);
    setDurudEnabledState(durudOn);
    setDurudIntervalState(durudHrs);
    setQuietEnabledState(quietOn);
    setQuietStartHourState(quietStart.hour);
    setQuietEndHourState(quietEnd.hour);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleNotifToggle = async (value) => {
    setNotifEnabled(value);
    await setNotificationsEnabled(value);
    if (value) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await refreshPrayerNotifications();
      } else {
        setNotifEnabled(false);
        await setNotificationsEnabled(false);
      }
    } else {
      await cancelAllNotifications();
    }
  };

  // Builds the { enabled, startHour, endHour } object scheduleDurudReminder expects,
  // optionally overriding one field with a value not yet committed to state.
  const buildQuietParam = (overrides = {}) => ({
    enabled:   quietEnabled,
    startHour: quietStartHour,
    endHour:   quietEndHour,
    ...overrides,
  });

  const handleDurudToggle = async (value) => {
    setDurudEnabledState(value);
    await setDurudEnabled(value);
    if (value) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDurudReminder(durudInterval, buildQuietParam());
      } else {
        setDurudEnabledState(false);
        await setDurudEnabled(false);
      }
    } else {
      await cancelDurudReminder();
    }
  };

  const handleSelectInterval = async (hours) => {
    setDurudIntervalState(hours);
    await setDurudIntervalHours(hours);
    setIntervalPickerOpen(false);
    if (durudEnabled) {
      await scheduleDurudReminder(hours, buildQuietParam());
    }
  };

  const handleQuietToggle = async (value) => {
    setQuietEnabledState(value);
    await setDurudQuietHoursEnabled(value);
    if (durudEnabled) {
      await scheduleDurudReminder(durudInterval, buildQuietParam({ enabled: value }));
    }
  };

  const handleSelectQuietHour = async (hour) => {
    if (quietPickerFor === 'start') {
      setQuietStartHourState(hour);
      await setDurudQuietStart({ hour, minute: 0 });
    } else if (quietPickerFor === 'end') {
      setQuietEndHourState(hour);
      await setDurudQuietEnd({ hour, minute: 0 });
    }
    const which = quietPickerFor;
    setQuietPickerFor(null);
    if (durudEnabled) {
      await scheduleDurudReminder(
        durudInterval,
        buildQuietParam(which === 'start' ? { startHour: hour } : { endHour: hour })
      );
    }
  };

  const todayDoneCount = TRACKABLE_PRAYERS.filter(p => todayPrayers.includes(p)).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.pageTitle}>Tools & Stats</Text>

        {/* ── STREAK CARD ── */}
        <SectionCard icon="🔥" title="Prayer Streak" styles={styles}>
          <View style={styles.streakHero}>
            <Text style={styles.bigNumber}>{streak.currentStreak}</Text>
            <Text style={styles.dayLabel}>{streak.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}</Text>
            <Text style={styles.streakMsg}>{getStreakMessage(streak.currentStreak)}</Text>
            {streak.currentStreak > 0 && (
              <View style={styles.flameRow}>
                {Array.from({ length: Math.min(streak.currentStreak, 7) }).map((_, i) => (
                  <Text key={i} style={styles.flame}>🔥</Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatChip value={streak.longestStreak} label="Best Streak"  icon="🏆" styles={styles} />
            <StatChip value={streak.totalDays}     label="Total Days"   icon="📅" styles={styles} />
            <StatChip value={streak.totalDays * 5} label="Prayers Done" icon="🤲" styles={styles} />
          </View>

          <HR styles={styles} />

          <Text style={styles.subLabel}>This Week</Text>
          <View style={styles.weekRow}>
            {weekly.map((d, i) => (
              <DayCell key={i} dayName={d.dayName} completed={d.completed} allDone={d.allDone} styles={styles} Colors={Colors} />
            ))}
          </View>

          <HR styles={styles} />

          <Text style={styles.subLabel}>Today — {todayDoneCount}/5 done</Text>
          <View style={styles.pillsRow}>
            {TRACKABLE_PRAYERS.map((p) => {
              const done = todayPrayers.includes(p);
              return (
                <View key={p} style={[styles.pill, done && styles.pillDone]}>
                  <Text style={[styles.pillText, done && styles.pillTextDone]}>{p}</Text>
                  {done && <Text style={styles.pillCheck}>✓</Text>}
                </View>
              );
            })}
          </View>

          <HR styles={styles} />

          <View style={styles.quoteBox}>
            <Text style={styles.quoteIcon}>📖</Text>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteRef}>— {quote.ref}</Text>
          </View>
        </SectionCard>

        {/* ── MORE TOOLS CARD ── */}
        <SectionCard icon="🧰" title="More Tools" styles={styles}>
          <ToolRow
            icon="📿" title="Tasbih Counter"
            sub="SubhanAllah · Alhamdulillah · Allahu Akbar"
            color="#1AB87A"
            onPress={() => setTasbihOpen(true)}
            styles={styles}
          />
          <ToolRow
            icon="🗓️" title="Islamic Calendar"
            sub="Full Hijri calendar with Islamic events"
            color={Colors.primary}
            onPress={() => setCalendarOpen(true)}
            styles={styles}
          />
          <ToolRow
            icon="🕋" title="Hajj & Umrah Guide"
            sub="Complete step-by-step guide with du'as"
            color="#A06BE0"
            onPress={() => setHajjOpen(true)}
            styles={styles}
          />
          <ToolRow
            icon="✨" title="99 Names of Allah"
            sub="Asma-ul-Husna with English & Bengali meaning"
            color="#C9A84C"
            onPress={() => setNamesOpen(true)}
            isLast
            styles={styles}
          />
        </SectionCard>

        {/* ── SETTINGS CARD ── */}
        <SectionCard icon="⚙️" title="Settings" styles={styles}>
          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Text style={styles.settingLabel}>Prayer Notifications</Text>
              <Text style={styles.settingHint}>
                {notifEnabled
                  ? 'You will be notified at each prayer time'
                  : 'Notifications off — visit Prayer Times to reschedule'}
              </Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleNotifToggle}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={notifEnabled ? Colors.primaryLight : Colors.textSecondary}
            />
          </View>

          <HR styles={styles} />

          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Text style={styles.settingLabel}>Durud Reminder</Text>
              <Text style={styles.settingHint}>
                {durudEnabled
                  ? `Reminding you to recite Durud every ${durudInterval} ${durudInterval === 1 ? 'hour' : 'hours'}`
                  : 'Get gentle reminders to recite Durud Sharif'}
              </Text>
            </View>
            <Switch
              value={durudEnabled}
              onValueChange={handleDurudToggle}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={durudEnabled ? Colors.primaryLight : Colors.textSecondary}
            />
          </View>

          {durudEnabled && (
            <>
              <HR styles={styles} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setIntervalPickerOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Reminder Interval</Text>
                <View style={styles.intervalValueBox}>
                  <Text style={styles.infoValue}>
                    Every {durudInterval} {durudInterval === 1 ? 'hour' : 'hours'}
                  </Text>
                  <Text style={styles.intervalChevron}>›</Text>
                </View>
              </TouchableOpacity>

              <HR styles={styles} />

              <View style={styles.settingRow}>
                <View style={styles.settingMeta}>
                  <Text style={styles.settingLabel}>Quiet Hours</Text>
                  <Text style={styles.settingHint}>
                    {quietEnabled
                      ? `No Durud reminders from ${formatHour12(quietStartHour)} to ${formatHour12(quietEndHour)}`
                      : 'Reminders play at all hours, day and night'}
                  </Text>
                </View>
                <Switch
                  value={quietEnabled}
                  onValueChange={handleQuietToggle}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={quietEnabled ? Colors.primaryLight : Colors.textSecondary}
                />
              </View>

              {quietEnabled && (
                <View style={styles.quietTimeRow}>
                  <TouchableOpacity
                    style={styles.quietTimeBox}
                    onPress={() => setQuietPickerFor('start')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quietTimeLabel}>Off from</Text>
                    <Text style={styles.quietTimeValue}>{formatHour12(quietStartHour)}</Text>
                  </TouchableOpacity>
                  <Text style={styles.quietTimeArrow}>→</Text>
                  <TouchableOpacity
                    style={styles.quietTimeBox}
                    onPress={() => setQuietPickerFor('end')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quietTimeLabel}>On from</Text>
                    <Text style={styles.quietTimeValue}>{formatHour12(quietEndHour)}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <HR styles={styles} />

          {[
            { label: 'Calculation Method', value: 'Karachi' },
            { label: 'App Version',        value: '1.0.0'   },
          ].map(({ label, value }, idx, arr) => (
            <React.Fragment key={label}>
              <View style={styles.infoRow}>
                <Text style={styles.settingLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
              {idx < arr.length - 1 && <HR styles={styles} />}
            </React.Fragment>
          ))}
        </SectionCard>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Feature Modals ── */}
      <TasbihScreen          visible={tasbihOpen}   onClose={() => setTasbihOpen(false)}   />
      <IslamicCalendarScreen visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <HajjUmrahScreen       visible={hajjOpen}     onClose={() => setHajjOpen(false)}     />
      <AsmaulHusnaScreen     visible={namesOpen}    onClose={() => setNamesOpen(false)}    />

      {/* ── Durud interval picker ── */}
      <Modal
        visible={intervalPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIntervalPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setIntervalPickerOpen(false)}
        >
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>Durud Reminder Interval</Text>
            <Text style={styles.pickerSub}>Choose how often you'd like to be reminded</Text>

            <View style={styles.pickerGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((hr) => {
                const active = hr === durudInterval;
                return (
                  <TouchableOpacity
                    key={hr}
                    style={[styles.pickerChip, active && styles.pickerChipActive]}
                    onPress={() => handleSelectInterval(hr)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                      {hr}{hr === 1 ? ' hr' : ' hrs'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setIntervalPickerOpen(false)}>
              <Text style={styles.pickerCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Quiet hours time picker ── */}
      <Modal
        visible={!!quietPickerFor}
        animationType="fade"
        transparent
        onRequestClose={() => setQuietPickerFor(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setQuietPickerFor(null)}
        >
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>
              {quietPickerFor === 'start' ? 'Quiet Hours — Off From' : 'Quiet Hours — On From'}
            </Text>
            <Text style={styles.pickerSub}>
              {quietPickerFor === 'start'
                ? "Durud reminders stop from this time"
                : 'Durud reminders resume from this time'}
            </Text>

            <ScrollView style={styles.hourPickerScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {Array.from({ length: 24 }, (_, h) => h).map((hr) => {
                  const active = hr === (quietPickerFor === 'start' ? quietStartHour : quietEndHour);
                  return (
                    <TouchableOpacity
                      key={hr}
                      style={[styles.pickerChip, styles.hourChip, active && styles.pickerChipActive]}
                      onPress={() => handleSelectQuietHour(hr)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                        {formatHour12(hr)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setQuietPickerFor(null)}>
              <Text style={styles.pickerCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const getStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:    { paddingHorizontal: 16, paddingTop: 8 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', marginTop: 12, marginBottom: 16, letterSpacing: 0.3 },

  // Card
  card:            { backgroundColor: Colors.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 14 },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardHeaderIcon:  { fontSize: 18 },
  cardHeaderTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: 0.2 },

  hr: { height: 1, backgroundColor: Colors.divider, marginVertical: 14 },

  // Streak hero
  streakHero:  { alignItems: 'center', paddingVertical: 8, marginBottom: 14 },
  bigNumber:   { fontSize: 72, fontWeight: '900', color: Colors.primary, lineHeight: 80 },
  dayLabel:    { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 2 },
  streakMsg:   { fontSize: 12, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  flameRow:    { flexDirection: 'row', marginTop: 12, gap: 4 },
  flame:       { fontSize: 20 },

  // Stat chips
  statsRow:  { flexDirection: 'row', gap: 8, marginBottom: 2 },
  statChip:  { flex: 1, backgroundColor: Colors.cardLight, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIcon:  { fontSize: 18, marginBottom: 5 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 9, color: Colors.textSecondary, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3, textAlign: 'center' },

  subLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.4, marginBottom: 10 },

  // Weekly row
  weekRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:        { alignItems: 'center', gap: 7 },
  dayName:       { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', fontWeight: '600' },
  dayCircle:     { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  dayCircleDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayCheck:      { color: Colors.background, fontSize: 15, fontWeight: '800' },
  dayCount:      { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // Prayer pills
  pillsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  pillDone:    { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '18' },
  pillText:    { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  pillTextDone:{ color: Colors.primary, fontWeight: '600' },
  pillCheck:   { color: Colors.primary, fontSize: 12, fontWeight: '800' },

  // Quote
  quoteBox:  { gap: 6 },
  quoteIcon: { fontSize: 18 },
  quoteText: { color: Colors.text, fontSize: 13, lineHeight: 21, fontStyle: 'italic' },
  quoteRef:  { color: Colors.primary, fontSize: 12, fontWeight: '600', alignSelf: 'flex-end' },

  // Tool rows (tappable)
  toolRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  toolIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toolIcon:    { fontSize: 22 },
  toolMeta:    { flex: 1 },
  toolTitle:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  toolSub:     { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  toolArrowBox:{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  toolArrow:   { fontSize: 20, fontWeight: '700', lineHeight: 24 },

  // Settings rows
  settingRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingMeta: { flex: 1 },
  settingLabel:{ fontSize: 15, fontWeight: '600', color: Colors.text },
  settingHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoValue:   { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },

  // Durud interval row
  intervalValueBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  intervalChevron:  { fontSize: 16, color: Colors.textMuted, fontWeight: '700' },

  // Durud quiet hours
  quietTimeRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  quietTimeBox:   { flex: 1, backgroundColor: Colors.cardLight, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, alignItems: 'center' },
  quietTimeLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  quietTimeValue: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  quietTimeArrow: { fontSize: 16, color: Colors.textMuted, fontWeight: '700' },
  hourPickerScroll: { maxHeight: 340 },
  hourChip:       { width: '22%' },

  // Durud interval picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  pickerSheet:   { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, borderWidth: 1, borderColor: Colors.border, borderBottomWidth: 0 },
  pickerTitle:   { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  pickerSub:     { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  pickerGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  pickerChip:        { width: '22%', paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.cardLight, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  pickerChipActive:  { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  pickerChipText:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  pickerChipTextActive: { color: Colors.primary, fontWeight: '800' },
  pickerCloseBtn:  { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  pickerCloseText: { fontSize: 15, fontWeight: '700', color: Colors.background },
});
