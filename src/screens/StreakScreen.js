import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/colors';
import { getStreakData, getWeeklyData } from '../utils/storage';
import { TRACKABLE_PRAYERS } from '../utils/prayerTimes';

const QUOTES = [
  { text: 'Indeed, prayer has been decreed upon the believers a decree of specified times.', ref: 'Quran 4:103' },
  { text: 'The first matter that the servant will be brought to account for on the Day of Judgement is the prayer.', ref: 'Tirmidhi' },
  { text: 'Guard strictly the prayers, and the middle prayer, and stand before Allah devoutly obedient.', ref: 'Quran 2:238' },
];

const getStreakMessage = (n) => {
  if (n === 0)  return 'Start your journey today 🌱';
  if (n < 3)    return 'Great start! Keep going! 💪';
  if (n < 7)    return 'Masha Allah! You\'re consistent! ✨';
  if (n < 14)   return 'SubhanAllah! One week+ streak! 🌟';
  if (n < 30)   return 'Incredible consistency! ⭐⭐';
  return 'Allahu Akbar! You are truly dedicated! 👑';
};

/** Single day cell in the weekly row */
const DayCell = ({ dayName, completed, allDone }) => (
  <View style={styles.dayCol}>
    <Text style={styles.dayName}>{dayName}</Text>
    <View style={[styles.dayCircle, allDone && styles.dayCircleDone]}>
      {allDone
        ? <Text style={styles.dayCheck}>✓</Text>
        : <Text style={[styles.dayCount, completed > 0 && { color: Colors.primary }]}>
            {completed}
          </Text>
      }
    </View>
  </View>
);

/** Single stat chip */
const StatCard = ({ value, label, icon }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function StreakScreen() {
  const [streak,  setStreak]  = useState({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
  const [weekly,  setWeekly]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [quote]   = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [s, w] = await Promise.all([getStreakData(), getWeeklyData()]);
    setStreak(s);
    setWeekly(w);
    setLoading(false);
  }, []);

  // Reload every time this tab is focused so stats stay current
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const todayKey    = new Date().toISOString().split('T')[0];
  const todayData   = weekly.find(d => d.date === todayKey);
  const todayDone   = todayData?.completed ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Page title */}
        <Text style={styles.pageTitle}>🔥 Prayer Streak</Text>

        {/* ── Main streak display ──────────────────────────────────────── */}
        <View style={styles.mainCard}>
          <Text style={styles.bigNumber}>{streak.currentStreak}</Text>
          <Text style={styles.dayLabel}>
            {streak.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
          </Text>
          <Text style={styles.streakMsg}>{getStreakMessage(streak.currentStreak)}</Text>

          {/* Flame row */}
          <View style={styles.flameRow}>
            {Array.from({ length: Math.min(streak.currentStreak, 7) }).map((_, i) => (
              <Text key={i} style={styles.flame}>🔥</Text>
            ))}
          </View>
        </View>

        {/* ── Stat chips ───────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard value={streak.longestStreak}  label="Best Streak"    icon="🏆" />
          <StatCard value={streak.totalDays}       label="Total Days"     icon="📅" />
          <StatCard value={streak.totalDays * 5}   label="Prayers Done"   icon="🤲" />
        </View>

        {/* ── Weekly calendar ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekCard}>
            {weekly.map((d, i) => (
              <DayCell
                key={i}
                dayName={d.dayName}
                completed={d.completed}
                allDone={d.allDone}
              />
            ))}
          </View>
        </View>

        {/* ── Today's prayers mini grid ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today — {todayDone}/5 complete</Text>
          <View style={styles.miniGrid}>
            {TRACKABLE_PRAYERS.map((p) => {
              const done = (todayData?.completed ?? 0) > TRACKABLE_PRAYERS.indexOf(p);
              return (
                <View
                  key={p}
                  style={[styles.miniPill, todayData?.allDone && styles.miniPillDone]}
                >
                  <Text style={[styles.miniPillText, todayData?.allDone && { color: Colors.primary }]}>
                    {p}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Motivational quote ────────────────────────────────────────── */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>📖</Text>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteRef}>— {quote.ref}</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },
  scroll: {
    padding: 16,
  },
  pageTitle: {
    fontSize:    22,
    fontWeight:  '700',
    color:       Colors.text,
    textAlign:   'center',
    marginTop:   8,
    marginBottom: 20,
  },

  // Main streak card
  mainCard: {
    backgroundColor: Colors.night,
    borderRadius:    24,
    padding:         28,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.primary + '40',
    marginBottom:    16,
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.15,
    shadowRadius:    20,
    elevation:       6,
  },
  bigNumber: {
    fontSize:   80,
    fontWeight: '900',
    color:      Colors.primary,
    lineHeight: 88,
  },
  dayLabel: {
    fontSize:   18,
    fontWeight: '600',
    color:      Colors.text,
    marginTop:  4,
  },
  streakMsg: {
    fontSize:  13,
    color:     Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  flameRow: {
    flexDirection: 'row',
    marginTop:     14,
    gap:           4,
  },
  flame: { fontSize: 20 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  24,
  },
  statCard: {
    flex:            1,
    backgroundColor: Colors.card,
    borderRadius:    16,
    padding:         14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  statIcon:  { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  statLabel: {
    fontSize:      9,
    color:         Colors.textSecondary,
    fontWeight:    '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop:     4,
    textAlign:     'center',
  },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize:    15,
    fontWeight:  '600',
    color:       Colors.text,
    marginBottom: 10,
  },

  // Weekly row
  weekCard: {
    backgroundColor: Colors.card,
    borderRadius:    18,
    padding:         16,
    flexDirection:   'row',
    justifyContent:  'space-between',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  dayCol:     { alignItems: 'center', gap: 8 },
  dayName:    { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', fontWeight: '600' },
  dayCircle: {
    width:           36,
    height:          36,
    borderRadius:    18,
    borderWidth:     2,
    borderColor:     Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  dayCircleDone: {
    backgroundColor: Colors.primary,
    borderColor:     Colors.primary,
  },
  dayCheck: { color: Colors.background, fontSize: 16, fontWeight: '800' },
  dayCount: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },

  // Mini prayer pills
  miniGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  miniPill: {
    backgroundColor:  Colors.card,
    borderRadius:     20,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  miniPillDone: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '15',
  },
  miniPillText: {
    color:      Colors.textSecondary,
    fontSize:   13,
    fontWeight: '500',
  },

  // Quote
  quoteCard: {
    backgroundColor: Colors.card,
    borderRadius:    16,
    padding:         20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      'flex-start',
    gap:             8,
  },
  quoteIcon: { fontSize: 20 },
  quoteText: {
    color:      Colors.text,
    fontSize:   13,
    lineHeight: 21,
    fontStyle:  'italic',
  },
  quoteRef: {
    color:      Colors.primary,
    fontSize:   12,
    fontWeight: '600',
    alignSelf:  'flex-end',
  },
});
