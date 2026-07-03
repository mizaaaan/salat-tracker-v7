/**
 * IslamicCalendarScreen — full offline Hijri / Islamic calendar
 *
 * Algorithm: Tabular Islamic calendar (arithmetic) which is accurate
 * within ±1 day of the crescent-moon calendar used by most countries.
 *
 * Features:
 *  • Current Hijri date prominently displayed
 *  • Month navigation (prev / next)
 *  • Calendar grid with today highlighted
 *  • Islamic events highlighted on their dates
 *  • Events list panel for the current month
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

// ─── Hijri month names ────────────────────────────────────────────────────────
const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah',
];

const HIJRI_MONTHS_AR = [
  'مُحَرَّم', 'صَفَر', 'رَبِيعُ الأَوَّل', 'رَبِيعُ الآخِر',
  'جُمَادَىٰ الأُولَىٰ', 'جُمَادَىٰ الآخِرَة', 'رَجَب', 'شَعْبَان',
  'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة',
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Islamic events (Hijri month, day) ───────────────────────────────────────
const ISLAMIC_EVENTS = [
  { month: 1,  day: 1,  name: 'Islamic New Year',           color: '#C9A84C', icon: '🌙' },
  { month: 1,  day: 10, name: 'Day of Ashura',              color: '#5BB8D4', icon: '✨' },
  { month: 3,  day: 12, name: "Mawlid al-Nabi ﷺ",          color: '#1AB87A', icon: '🌟' },
  { month: 7,  day: 27, name: "Laylat al-Mi'raj",           color: '#A06BE0', icon: '🚀' },
  { month: 8,  day: 15, name: "Laylat al-Bara'ah",          color: '#E07070', icon: '🌕' },
  { month: 9,  day: 1,  name: 'First Day of Ramadan',       color: '#C9A84C', icon: '🌙' },
  { month: 9,  day: 21, name: 'Laylat al-Qadr (approx.)',   color: '#A06BE0', icon: '⭐' },
  { month: 9,  day: 23, name: 'Laylat al-Qadr (approx.)',   color: '#A06BE0', icon: '⭐' },
  { month: 9,  day: 25, name: 'Laylat al-Qadr (approx.)',   color: '#A06BE0', icon: '⭐' },
  { month: 9,  day: 27, name: 'Laylat al-Qadr (most likely)',color: '#F0A050', icon: '🌟' },
  { month: 9,  day: 29, name: 'Laylat al-Qadr (approx.)',   color: '#A06BE0', icon: '⭐' },
  { month: 10, day: 1,  name: 'Eid al-Fitr',                color: '#1AB87A', icon: '🎉' },
  { month: 10, day: 2,  name: 'Eid al-Fitr (2nd day)',      color: '#1AB87A', icon: '🎉' },
  { month: 10, day: 3,  name: 'Eid al-Fitr (3rd day)',      color: '#1AB87A', icon: '🎉' },
  { month: 12, day: 8,  name: 'Hajj begins',                color: '#C9A84C', icon: '🕋' },
  { month: 12, day: 9,  name: 'Day of Arafah',              color: '#F0A050', icon: '🤲' },
  { month: 12, day: 10, name: 'Eid al-Adha',                color: '#1AB87A', icon: '🎊' },
  { month: 12, day: 11, name: 'Eid al-Adha (2nd day)',      color: '#1AB87A', icon: '🎊' },
  { month: 12, day: 12, name: 'Eid al-Adha (3rd day)',      color: '#1AB87A', icon: '🎊' },
  { month: 12, day: 13, name: 'Last day of Hajj',           color: '#C9A84C', icon: '🕋' },
];

// ─── Calendar algorithms ──────────────────────────────────────────────────────

/** Gregorian date → Julian Day Number */
function toJD(year, month, day) {
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

/** Julian Day Number → Gregorian */
function fromJD(jd) {
  const Z = Math.floor(jd + 0.5);
  const A = Z < 2299161 ? Z : (() => {
    const g = Math.floor((Z - 1867216.25) / 36524.25);
    return Z + 1 + g - Math.floor(g / 4);
  })();
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day   = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year  = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day };
}

/** Julian Day Number → Hijri */
function jdToHijri(jd) {
  const Z  = Math.floor(jd + 0.5);
  let l    = Z - 1948440 + 10632;
  const n  = Math.floor((l - 1) / 10631);
  l        = l - 10631 * n + 354;
  const J  = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
           + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l        = l
           - Math.floor((30 - J) / 15) * Math.floor((17719 * J) / 50)
           - Math.floor(J / 16) * Math.floor((15238 * J) / 43) + 29;
  const hM = Math.floor((24 * l) / 709);
  const hD = l - Math.floor((709 * hM) / 24);
  const hY = 30 * n + J - 30;
  return { year: hY, month: hM, day: hD };
}

/** Hijri year+month → Julian Day of the 1st of that month */
function hijriMonthStartJD(hYear, hMonth) {
  return Math.ceil(29.5001 * (hMonth - 1))
    + (hYear - 1) * 354
    + Math.floor((3 + 11 * hYear) / 30)
    + 1948440 - 385 + 1;
}

/** Number of days in a Hijri month */
function daysInHijriMonth(hYear, hMonth) {
  const nextM = hMonth === 12 ? 1        : hMonth + 1;
  const nextY = hMonth === 12 ? hYear + 1 : hYear;
  return hijriMonthStartJD(nextY, nextM) - hijriMonthStartJD(hYear, hMonth);
}

/** Get today's Hijri date */
function todayHijri() {
  const now = new Date();
  return jdToHijri(toJD(now.getFullYear(), now.getMonth() + 1, now.getDate()));
}

/**
 * Build a calendar grid for a given Hijri year+month.
 * Returns array of { hDay, gDate, jd, isToday, events }
 * with leading nulls so the grid starts on Sunday.
 */
function buildCalendar(hYear, hMonth) {
  const startJD  = hijriMonthStartJD(hYear, hMonth);
  const totalDays = daysInHijriMonth(hYear, hMonth);
  const todayJD  = toJD(...[new Date()].map(d => [d.getFullYear(), d.getMonth() + 1, d.getDate()])[0]);

  // Day of week for 1st of month (0=Sun … 6=Sat)
  const startDow = Math.floor(startJD + 1.5) % 7;

  const cells = [];
  // Leading blanks
  for (let i = 0; i < startDow; i++) cells.push(null);

  const monthEvents = ISLAMIC_EVENTS.filter(e => e.month === hMonth);

  for (let d = 1; d <= totalDays; d++) {
    const jd      = startJD + d - 1;
    const gDate   = fromJD(jd);
    const isToday = Math.floor(jd) === Math.floor(todayJD);
    const evts    = monthEvents.filter(e => e.day === d);
    cells.push({ hDay: d, gDate, jd, isToday, events: evts });
  }

  // Trailing blanks to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Month events list ────────────────────────────────────────────────────────
function monthEventsList(hYear, hMonth) {
  return ISLAMIC_EVENTS
    .filter(e => e.month === hMonth)
    .filter((e, i, arr) => arr.findIndex(x => x.name === e.name) === i); // dedupe
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IslamicCalendarScreen({ visible, onClose }) {
  const { colors: C } = useTheme();
  const S = getStyles(C);

  const todayH = useMemo(() => todayHijri(), []);
  const [hYear,  setHYear]  = useState(todayH.year);
  const [hMonth, setHMonth] = useState(todayH.month);

  const cells  = useMemo(() => buildCalendar(hYear, hMonth), [hYear, hMonth]);
  const events = useMemo(() => monthEventsList(hYear, hMonth), [hYear, hMonth]);

  // Navigation
  const prevMonth = () => {
    if (hMonth === 1) { setHYear(y => y - 1); setHMonth(12); }
    else setHMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (hMonth === 12) { setHYear(y => y + 1); setHMonth(1); }
    else setHMonth(m => m + 1);
  };
  const goToday = () => { setHYear(todayH.year); setHMonth(todayH.month); };

  // Gregorian equivalent of 1st of displayed month
  const firstGDate = fromJD(hijriMonthStartJD(hYear, hMonth));
  const gMonthLabel = new Date(firstGDate.year, firstGDate.month - 1, 1)
    .toLocaleDateString('en', { month: 'long', year: 'numeric' });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={S.container} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity style={S.headerBtn} onPress={onClose}>
            <Text style={S.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.headerTitle}>🗓️ Islamic Calendar</Text>
          <TouchableOpacity style={S.headerBtn} onPress={goToday}>
            <Text style={S.headerBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Today's Hijri date hero */}
          <View style={S.todayHero}>
            <Text style={S.todayHijriAr}>{HIJRI_MONTHS_AR[todayH.month - 1]}</Text>
            <View style={S.todayDateRow}>
              <Text style={S.todayDay}>{todayH.day}</Text>
              <View>
                <Text style={S.todayMonth}>{HIJRI_MONTHS[todayH.month - 1]}</Text>
                <Text style={S.todayYear}>{todayH.year} AH</Text>
              </View>
            </View>
            <Text style={S.todayGregorian}>
              {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Month navigator */}
          <View style={S.navRow}>
            <TouchableOpacity style={S.navBtn} onPress={prevMonth}>
              <Text style={S.navArrow}>‹</Text>
            </TouchableOpacity>
            <View style={S.navCenter}>
              <Text style={S.navMonthHijri}>{HIJRI_MONTHS[hMonth - 1]} {hYear}</Text>
              <Text style={S.navMonthGreg}>{gMonthLabel}</Text>
            </View>
            <TouchableOpacity style={S.navBtn} onPress={nextMonth}>
              <Text style={S.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar grid */}
          <View style={S.calendarCard}>
            {/* Week day headers */}
            <View style={S.weekRow}>
              {WEEK_DAYS.map(d => (
                <Text key={d} style={[S.weekDay, d === 'Fri' && S.weekDayFri]}>{d}</Text>
              ))}
            </View>

            {/* Day cells - 7 per row */}
            <View style={S.gridContainer}>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} style={S.gridRow}>
                  {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
                    if (!cell) return <View key={col} style={S.dayCell} />;
                    const isToday = cell.isToday;
                    const hasEvent = cell.events.length > 0;
                    const eventColor = hasEvent ? cell.events[0].color : null;
                    return (
                      <View key={col} style={S.dayCell}>
                        <View style={[
                          S.dayInner,
                          isToday && S.dayToday,
                          hasEvent && !isToday && { borderColor: eventColor, borderWidth: 1.5 },
                        ]}>
                          <Text style={[S.dayNum, isToday && S.dayNumToday]}>
                            {cell.hDay}
                          </Text>
                          <Text style={[S.dayGreg, isToday && S.dayGregToday]}>
                            {cell.gDate.day}
                          </Text>
                          {hasEvent && (
                            <View style={[S.eventDot, { backgroundColor: eventColor }]} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Legend */}
            <View style={S.legend}>
              <View style={S.legendItem}>
                <View style={[S.legendDot, { backgroundColor: C.primary }]} />
                <Text style={S.legendText}>Today</Text>
              </View>
              <View style={S.legendItem}>
                <View style={[S.legendDot, { backgroundColor: '#1AB87A' }]} />
                <Text style={S.legendText}>Islamic event</Text>
              </View>
            </View>
          </View>

          {/* Events this month */}
          {events.length > 0 && (
            <View style={S.eventsCard}>
              <Text style={S.eventsTitle}>Events in {HIJRI_MONTHS[hMonth - 1]}</Text>
              {events.map((ev, i) => (
                <View key={i} style={[S.eventRow, i < events.length - 1 && S.eventRowBorder]}>
                  <View style={[S.eventIconBox, { backgroundColor: ev.color + '22' }]}>
                    <Text style={S.eventIconEmoji}>{ev.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.eventName}>{ev.name}</Text>
                    <Text style={[S.eventDate, { color: ev.color }]}>
                      {ev.day} {HIJRI_MONTHS[hMonth - 1]} {hYear} AH
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* All Islamic events reference */}
          <View style={S.eventsCard}>
            <Text style={S.eventsTitle}>Islamic Year — Key Dates</Text>
            {ISLAMIC_EVENTS
              .filter((e, i, arr) => arr.findIndex(x => x.name === e.name) === i)
              .map((ev, i, arr) => (
                <View key={i} style={[S.eventRow, i < arr.length - 1 && S.eventRowBorder]}>
                  <View style={[S.eventIconBox, { backgroundColor: ev.color + '22' }]}>
                    <Text style={S.eventIconEmoji}>{ev.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.eventName}>{ev.name}</Text>
                    <Text style={[S.eventDate, { color: ev.color }]}>
                      {ev.day} {HIJRI_MONTHS[ev.month - 1]}
                    </Text>
                  </View>
                </View>
              ))}
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: C.text },
  headerBtn:     { minWidth: 36, height: 36, borderRadius: 18, backgroundColor: C.cardLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  headerBtnText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },

  // Hero
  todayHero:      { backgroundColor: C.card, margin: 16, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  todayHijriAr:   { fontSize: 22, color: C.primary, marginBottom: 8, fontWeight: '400' },
  todayDateRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  todayDay:       { fontSize: 72, fontWeight: '900', color: C.primary, lineHeight: 80 },
  todayMonth:     { fontSize: 20, fontWeight: '700', color: C.text },
  todayYear:      { fontSize: 15, color: C.textSecondary, marginTop: 2 },
  todayGregorian: { fontSize: 13, color: C.textSecondary },

  // Month navigator
  navRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  navBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  navArrow:       { fontSize: 22, color: C.text, fontWeight: '400', lineHeight: 26 },
  navCenter:      { flex: 1, alignItems: 'center' },
  navMonthHijri:  { fontSize: 17, fontWeight: '700', color: C.text },
  navMonthGreg:   { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  // Calendar card
  calendarCard:  { backgroundColor: C.card, marginHorizontal: 16, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  weekRow:       { flexDirection: 'row', marginBottom: 6 },
  weekDay:       { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  weekDayFri:    { color: C.primary },
  gridContainer: {},
  gridRow:       { flexDirection: 'row' },
  dayCell:       { flex: 1, aspectRatio: 1, padding: 2 },
  dayInner:      { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayToday:      { backgroundColor: C.primary, borderColor: C.primary },
  dayNum:        { fontSize: 14, fontWeight: '700', color: C.text },
  dayNumToday:   { color: C.background },
  dayGreg:       { fontSize: 9, color: C.textMuted, marginTop: 1 },
  dayGregToday:  { color: C.background + 'CC' },
  eventDot:      { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  // Legend
  legend:      { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.divider },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 11, color: C.textSecondary },

  // Events
  eventsCard:    { backgroundColor: C.card, marginHorizontal: 16, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  eventsTitle:   { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  eventRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  eventRowBorder:{ borderBottomWidth: 1, borderBottomColor: C.divider },
  eventIconBox:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventIconEmoji:{ fontSize: 20 },
  eventName:     { fontSize: 14, fontWeight: '600', color: C.text },
  eventDate:     { fontSize: 12, fontWeight: '500', marginTop: 2 },
});
