/**
 * QiblaScreen
 *
 * BUG 3 FIX: `spin` Animated interpolation was computed but never used in JSX.
 * The needle's transform was using a raw static string `${needleRotation}deg`
 * instead of the Animated value, so the needle snapped instantly with no
 * smooth rotation. Fixed by:
 *   1. Broadening the inputRange to [-7200, 7200] so it handles unbounded
 *      angle accumulation without clamping.
 *   2. Passing `spin` (the Animated interpolation) to the needle's transform.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet,
  ActivityIndicator, Animated, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Svg, { Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../constants/ThemeContext';
import { calculateQibla } from '../utils/prayerTimes';

// ── Compass ticks ─────────────────────────────────────────────────────────────
const Ticks = ({ Colors, SIZE, CENTER, RADIUS }) => {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const isMajor = i % 9 === 0;
    const angle   = (i * 5 * Math.PI) / 180;
    const r1 = isMajor ? RADIUS - 14 : RADIUS - 8;
    const x1 = CENTER + r1      * Math.sin(angle);
    const y1 = CENTER - r1      * Math.cos(angle);
    const x2 = CENTER + RADIUS  * Math.sin(angle);
    const y2 = CENTER - RADIUS  * Math.cos(angle);
    ticks.push(
      <Line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isMajor ? Colors.primary : Colors.border}
        strokeWidth={isMajor ? 2 : 1}
      />
    );
  }
  return <>{ticks}</>;
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function QiblaScreen() {
  const { colors: Colors } = useTheme();
  const { width, height }  = useWindowDimensions();

  // Responsive compass — scales down in landscape to fit shorter height
  const SIZE   = Math.min(260, Math.min(width, height) * 0.68);
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.45;

  const styles = getStyles(Colors, SIZE);

  const [heading, setHeading] = useState(0);
  const [qibla,   setQibla]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Accumulates angle (avoids 350° spin the wrong way via shortest-path logic)
  const animAngle    = useRef(new Animated.Value(0)).current;
  const currentAngle = useRef(0);

  // ── Location + compass heading ────────────────────────────────────────────
  useEffect(() => {
    let headingSub;

    const init = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to find Qibla direction.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const q   = calculateQibla(loc.coords.latitude, loc.coords.longitude);
      setQibla(q);
      setLoading(false);

      headingSub = await Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
        const h = trueHeading >= 0 ? trueHeading : magHeading;
        setHeading(h);
      });
    };

    init();
    return () => headingSub?.remove();
  }, []);

  // ── Animate needle via shortest-path accumulation ─────────────────────────
  useEffect(() => {
    if (qibla === null) return;

    const target = (qibla - heading + 360) % 360;

    // Shortest-path delta so the needle never spins 350° the wrong way
    let diff = target - currentAngle.current;
    if (diff > 180)  diff -= 360;
    if (diff < -180) diff += 360;

    const next = currentAngle.current + diff;
    currentAngle.current = next;

    Animated.timing(animAngle, {
      toValue:         next,
      duration:        250,
      useNativeDriver: true,
    }).start();
  }, [heading, qibla]);

  // BUG 3 FIX: broad inputRange handles unbounded angle accumulation
  // (currentAngle.current can exceed ±360 after many heading updates).
  // A linear 1:1 mapping from number → degrees is always correct here.
  const spin = animAngle.interpolate({
    inputRange:  [-7200, 7200],
    outputRange: ['-7200deg', '7200deg'],
    extrapolate: 'extend',   // never clamp, even if range is exceeded
  });

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding Qibla direction…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🧭</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>

        <Text style={styles.title}>🕋 Qibla Direction</Text>
        <Text style={styles.subtitle}>Point your phone to find Mecca</Text>

        {/* Compass */}
        <View style={[styles.compassShell, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }]}>

          {/* Static compass face — dial rotates to match real-world N/E/S/W */}
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill={Colors.card} />
            <Circle
              cx={CENTER} cy={CENTER} r={RADIUS + 4}
              fill="none" stroke={Colors.primary} strokeWidth="1" opacity="0.3"
            />
            <G rotation={-heading} origin={`${CENTER}, ${CENTER}`}>
              <Ticks Colors={Colors} SIZE={SIZE} CENTER={CENTER} RADIUS={RADIUS} />
              <SvgText x={CENTER}     y={20}          textAnchor="middle" fill={Colors.primary}       fontSize="16" fontWeight="bold">N</SvgText>
              <SvgText x={SIZE - 14}  y={CENTER + 5}  textAnchor="middle" fill={Colors.textSecondary} fontSize="14">E</SvgText>
              <SvgText x={CENTER}     y={SIZE - 8}    textAnchor="middle" fill={Colors.textSecondary} fontSize="14">S</SvgText>
              <SvgText x={14}         y={CENTER + 5}  textAnchor="middle" fill={Colors.textSecondary} fontSize="14">W</SvgText>
            </G>
          </Svg>

          {/* BUG 3 FIX: needle now uses `spin` (Animated interpolation) instead
              of the raw static string that was causing instant snapping */}
          <Animated.View
            style={[
              styles.needleWrapper,
              { width: SIZE, height: SIZE, transform: [{ rotate: spin }] },
            ]}
          >
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <G>
                {/* Gold arrowhead — points toward Qibla */}
                <Path
                  d={`M ${CENTER} 36 L ${CENTER + 9} ${CENTER} L ${CENTER} ${CENTER + 16} L ${CENTER - 9} ${CENTER} Z`}
                  fill={Colors.primary}
                />
                {/* Tail */}
                <Path
                  d={`M ${CENTER} ${CENTER + 16} L ${CENTER + 9} ${CENTER} L ${CENTER} ${SIZE - 36} L ${CENTER - 9} ${CENTER} Z`}
                  fill={Colors.cardLight}
                  opacity="0.8"
                />
                {/* Kaaba emoji at the tip */}
                <SvgText x={CENTER} y={30} textAnchor="middle" fontSize="18">🕋</SvgText>
                {/* Centre pivot */}
                <Circle cx={CENTER} cy={CENTER} r={10} fill={Colors.primary} />
                <Circle cx={CENTER} cy={CENTER} r={5}  fill={Colors.background} />
              </G>
            </Svg>
          </Animated.View>

        </View>

        {/* Info cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>QIBLA BEARING</Text>
            <Text style={styles.infoValue}>{Math.round(qibla ?? 0)}°</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>COMPASS</Text>
            <Text style={styles.infoValue}>{Math.round(heading)}°</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>DIFFERENCE</Text>
            <Text style={styles.infoValue}>
              {Math.round(Math.abs((qibla ?? 0) - heading))}°
            </Text>
          </View>
        </View>

        <Text style={styles.tip}>
          🌍 Hold phone flat and rotate until the 🕋 arrow points straight up
        </Text>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (Colors, SIZE = 280) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            16,
    padding:        32,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 15, marginTop: 12 },
  errorText: {
    color:     Colors.textSecondary,
    fontSize:  15,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex:              1,
    alignItems:        'center',
    paddingTop:        24,
    paddingHorizontal: 20,
  },
  title:    { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 28 },
  compassShell: {
    position:      'relative',
    backgroundColor: Colors.background,
    shadowColor:   Colors.primary,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius:  24,
    elevation:     12,
  },
  needleWrapper: {
    position: 'absolute',
    top: 0, left: 0,
  },
  infoRow: {
    flexDirection: 'row',
    gap:           10,
    marginTop:     28,
    width:         '100%',
  },
  infoCard: {
    flex:            1,
    backgroundColor: Colors.card,
    borderRadius:    14,
    padding:         14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  infoLabel: {
    color:         Colors.textSecondary,
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: 1,
    marginBottom:  4,
  },
  infoValue: {
    color:      Colors.primary,
    fontSize:   24,
    fontWeight: '800',
  },
  tip: {
    color:             Colors.textMuted,
    fontSize:          12,
    textAlign:         'center',
    marginTop:         20,
    lineHeight:        18,
    paddingHorizontal: 12,
  },
});
