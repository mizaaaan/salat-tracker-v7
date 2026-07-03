/**
 * TasbihScreen — Modern animated Tasbih / Dhikr counter
 * Features: bead ring visualization, haptic feedback, preset dhikr,
 *           session history, completion celebration.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Animated, Vibration, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Filter, FeGaussianBlur } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../constants/ThemeContext';

// ─── Dhikr presets ────────────────────────────────────────────────────────────
const DHIKR_PRESETS = [
  { id: 1, arabic: 'سُبْحَانَ اللَّهِ',         name: 'SubhanAllah',       meaning: 'Glory be to Allah',                target: 33,  color: '#1AB87A' },
  { id: 2, arabic: 'الْحَمْدُ لِلَّهِ',          name: 'Alhamdulillah',    meaning: 'All praise is for Allah',          target: 33,  color: '#C9A84C' },
  { id: 3, arabic: 'اللَّهُ أَكْبَرُ',            name: 'Allahu Akbar',     meaning: 'Allah is the Greatest',            target: 34,  color: '#A06BE0' },
  { id: 4, arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', name: 'La Ilaha Illallah', meaning: 'There is no god but Allah',        target: 100, color: '#5BB8D4' },
  { id: 5, arabic: 'أَسْتَغْفِرُ اللَّهَ',       name: 'Astaghfirullah',   meaning: 'I seek forgiveness from Allah',    target: 100, color: '#E07070' },
  { id: 6, arabic: 'صَلَّى اللَّهُ عَلَيْهِ',   name: 'Salawat',          meaning: 'Blessings upon the Prophet ﷺ',    target: 100, color: '#F0A050' },
];

const BEAD_COUNT  = 33;
const SVG_SIZE    = 290;
const CENTER      = SVG_SIZE / 2;
const RING_R      = 118;
const BEAD_R      = 6.5;
const STORAGE_KEY = 'tasbih_sessions';

// ─── Hijri bead layout ────────────────────────────────────────────────────────
const beadPositions = Array.from({ length: BEAD_COUNT }, (_, i) => {
  const angle = (i / BEAD_COUNT) * 2 * Math.PI - Math.PI / 2;
  return { x: CENTER + RING_R * Math.cos(angle), y: CENTER + RING_R * Math.sin(angle) };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TasbihScreen({ visible, onClose }) {
  const { colors: C } = useTheme();
  const S = getStyles(C);

  const [dhikr,        setDhikr]        = useState(DHIKR_PRESETS[0]);
  const [count,        setCount]        = useState(0);
  const [sessions,     setSessions]     = useState([]);
  const [showHistory,  setShowHistory]  = useState(false);
  const [completed,    setCompleted]    = useState(false);

  // Animations
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const celebAnim  = useRef(new Animated.Value(0)).current;

  // Load session history when modal opens
  useEffect(() => {
    if (visible) loadSessions();
  }, [visible]);

  const loadSessions = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch { /* silent */ }
  };

  const persistSession = async (d, c) => {
    try {
      const entry = { dhikr: d.name, arabic: d.arabic, count: c, target: d.target, date: new Date().toISOString() };
      const next  = [entry, ...sessions].slice(0, 30);
      setSessions(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* silent */ }
  };

  // ── Tap handler ──────────────────────────────────────────────────────────────
  const handleTap = () => {
    if (completed) return;
    const next = count + 1;
    setCount(next);

    Vibration.vibrate(25);

    // Button scale bounce
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.91, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 18, bounciness: 8 }),
    ]).start();

    // Glow pulse
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 80,  useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    // Ripple
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Completion
    if (next >= dhikr.target) {
      setCompleted(true);
      Vibration.vibrate([0, 60, 60, 60, 60, 180]);
      Animated.spring(celebAnim, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 12 }).start();
      persistSession(dhikr, next);
    }
  };

  const handleReset = () => {
    if (count > 0 && !completed) persistSession(dhikr, count);
    setCount(0);
    setCompleted(false);
    celebAnim.setValue(0);
    rippleAnim.setValue(0);
  };

  const handleSelectDhikr = (d) => {
    if (count > 0 && !completed) persistSession(dhikr, count);
    setDhikr(d);
    setCount(0);
    setCompleted(false);
    celebAnim.setValue(0);
    rippleAnim.setValue(0);
  };

  const handleClose = () => {
    if (count > 0 && !completed) persistSession(dhikr, count);
    onClose();
  };

  // ── Computed values ───────────────────────────────────────────────────────────
  const progress    = Math.min(count / dhikr.target, 1);
  const filledBeads = Math.floor(progress * BEAD_COUNT);

  const glowOpacity   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] });
  const rippleScale   = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 0.2, 0] });
  const celebScale    = celebAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const celebOpacity  = celebAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={S.container} edges={['top', 'left', 'right']}>

        {/* ── Header ── */}
        <View style={S.header}>
          <TouchableOpacity style={S.headerBtn} onPress={handleClose}>
            <Text style={S.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.headerTitle}>📿 Tasbih Counter</Text>
          <TouchableOpacity style={S.headerBtn} onPress={() => setShowHistory(v => !v)}>
            <Text style={S.headerBtnText}>🕐</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

          {/* ── Dhikr selector chips ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.presetRow}
            style={S.presetScroll}
          >
            {DHIKR_PRESETS.map(d => {
              const active = d.id === dhikr.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[S.chip, active && { borderColor: d.color, backgroundColor: d.color + '22' }]}
                  onPress={() => handleSelectDhikr(d)}
                >
                  <Text style={[S.chipName, active && { color: d.color }]}>{d.name}</Text>
                  <Text style={[S.chipTarget, active && { color: d.color + 'AA' }]}>×{d.target}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Arabic label ── */}
          <Text style={[S.arabicLabel, { color: dhikr.color }]}>{dhikr.arabic}</Text>
          <Text style={S.meaningLabel}>{dhikr.meaning}</Text>

          {/* ── Bead ring + tap button ── */}
          <View style={S.ringWrapper}>
            {/* SVG bead ring */}
            <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFillObject} pointerEvents="none">
              {beadPositions.map((pos, i) => {
                const filled = i < filledBeads;
                return (
                  <Circle
                    key={i}
                    cx={pos.x}
                    cy={pos.y}
                    r={BEAD_R}
                    fill={filled ? dhikr.color : C.border}
                    opacity={filled ? 1 : 0.35}
                  />
                );
              })}
            </Svg>

            {/* Centered tap button */}
            <View style={S.tapContainer} pointerEvents="box-none">

              {/* Ripple ring */}
              <Animated.View style={[
                S.ripple,
                { borderColor: dhikr.color, transform: [{ scale: rippleScale }], opacity: rippleOpacity },
              ]} />

              {/* Glow halo */}
              <Animated.View style={[S.glowHalo, { backgroundColor: dhikr.color, opacity: glowOpacity }]} />

              {/* Main button */}
              <Animated.View style={[S.tapButton, { borderColor: dhikr.color + '55', transform: [{ scale: scaleAnim }] }]}>
                <Pressable style={S.tapPressable} onPress={handleTap} android_ripple={null}>
                  {completed ? (
                    <Animated.View style={{ transform: [{ scale: celebScale }], opacity: celebOpacity, alignItems: 'center' }}>
                      <Text style={[S.celebIcon]}>✨</Text>
                      <Text style={[S.countNum, { color: dhikr.color }]}>{count}</Text>
                      <Text style={[S.completedLabel, { color: dhikr.color }]}>Complete!</Text>
                    </Animated.View>
                  ) : (
                    <>
                      <Text style={[S.countNum, { color: dhikr.color }]}>{count}</Text>
                      <View style={S.targetRow}>
                        <Text style={S.countSlash}>/</Text>
                        <Text style={S.countTarget}>{dhikr.target}</Text>
                      </View>
                      <Text style={S.tapHint}>TAP</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </View>

          {/* ── Progress bar ── */}
          <View style={S.progressBar}>
            <View style={[S.progressFill, { width: `${progress * 100}%`, backgroundColor: dhikr.color }]} />
          </View>
          <Text style={S.progressLabel}>
            {completed
              ? '🌟 SubhanAllah! Set completed!'
              : `${Math.round(progress * 100)}% · ${dhikr.target - count} remaining`}
          </Text>

          {/* ── Action buttons ── */}
          <View style={S.actionRow}>
            <TouchableOpacity style={S.resetBtn} onPress={handleReset}>
              <Text style={S.resetText}>↺  Reset</Text>
            </TouchableOpacity>
            {completed && (
              <TouchableOpacity style={[S.nextBtn, { borderColor: dhikr.color }]} onPress={handleReset}>
                <Text style={[S.nextText, { color: dhikr.color }]}>Next Set →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Session history ── */}
          {showHistory && (
            <View style={S.historyCard}>
              <Text style={S.historyTitle}>Session History</Text>
              {sessions.length === 0 ? (
                <Text style={S.historyEmpty}>No sessions yet. Start counting!</Text>
              ) : (
                sessions.slice(0, 15).map((s, i) => (
                  <View key={i} style={[S.historyRow, i < sessions.length - 1 && S.historyRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.historyArabic}>{s.arabic}</Text>
                      <Text style={S.historyMeta}>{fmtDate(s.date)}</Text>
                    </View>
                    <View style={S.historyBadge}>
                      <Text style={[S.historyCount, s.count >= s.target && { color: C.success }]}>
                        {s.count}{s.count >= s.target ? ' ✓' : ` / ${s.target}`}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (C) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.background },
  scroll:       { paddingHorizontal: 20 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: C.text },
  headerBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardLight, alignItems: 'center', justifyContent: 'center' },
  headerBtnText:{ fontSize: 15, color: C.textSecondary },

  // Preset chips
  presetScroll: { marginTop: 18 },
  presetRow:    { paddingHorizontal: 0, gap: 8, paddingRight: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.cardLight },
  chipName:     { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  chipTarget:   { fontSize: 10, color: C.textMuted, marginTop: 2, textAlign: 'center' },

  // Arabic label
  arabicLabel:  { fontSize: 34, textAlign: 'center', marginTop: 22, lineHeight: 50, fontWeight: '400' },
  meaningLabel: { fontSize: 13, color: C.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 8 },

  // Bead ring
  ringWrapper:  { width: SVG_SIZE, height: SVG_SIZE, alignSelf: 'center', marginTop: 4 },
  tapContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  ripple:       { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2 },
  glowHalo:     { position: 'absolute', width: 130, height: 130, borderRadius: 65, opacity: 0 },

  tapButton:    {
    width: 148, height: 148, borderRadius: 74,
    backgroundColor: C.card,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  tapPressable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  countNum:     { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  targetRow:    { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: -4 },
  countSlash:   { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  countTarget:  { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  tapHint:      { fontSize: 10, letterSpacing: 2.5, color: C.textMuted, fontWeight: '700', marginTop: 6 },

  // Completed state
  celebIcon:       { fontSize: 22, textAlign: 'center', marginBottom: 2 },
  completedLabel:  { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  // Progress
  progressBar:  { height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 6, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel:{ fontSize: 12, color: C.textSecondary, textAlign: 'center', marginBottom: 16 },

  // Action buttons
  actionRow:    { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 20 },
  resetBtn:     { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, backgroundColor: C.cardLight, borderWidth: 1, borderColor: C.border },
  resetText:    { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  nextBtn:      { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, backgroundColor: C.cardLight, borderWidth: 1.5 },
  nextText:     { fontSize: 14, fontWeight: '700' },

  // History
  historyCard:    { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 8 },
  historyTitle:   { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  historyEmpty:   { color: C.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  historyRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  historyRowBorder:{ borderBottomWidth: 1, borderBottomColor: C.divider },
  historyArabic:  { fontSize: 16, color: C.text, fontWeight: '400' },
  historyMeta:    { fontSize: 11, color: C.textMuted, marginTop: 3 },
  historyBadge:   { backgroundColor: C.cardLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  historyCount:   { fontSize: 13, fontWeight: '700', color: C.textSecondary },
});
