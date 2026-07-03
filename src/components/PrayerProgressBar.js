import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../constants/ThemeContext';

export default function PrayerProgressBar({ prayers, completed, activePrayer, prayerMeta }) {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  const total     = prayers.length;
  const doneCount = prayers.filter((p) => completed.includes(p)).length;
  const percent   = total > 0 ? doneCount / total : 0;

  const RING_SIZE   = 40;
  const RING_STROKE = 4;
  const RING_R      = (RING_SIZE - RING_STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RING_R;

  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  const ripple = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ripple, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ripple]);

  const rippleScale   = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 0.5, 0] });

  return (
    <View style={styles.wrap}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.ringBadge}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RING_R} stroke={Colors.border} strokeWidth={RING_STROKE} fill="none" />
            <Circle
              cx={RING_SIZE/2} cy={RING_SIZE/2} r={RING_R}
              stroke={Colors.primary} strokeWidth={RING_STROKE} fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent)}
              transform={`rotate(-90 ${RING_SIZE/2} ${RING_SIZE/2})`}
            />
          </Svg>
          <View style={styles.ringLabelWrap}>
            <Text style={styles.ringLabel}>{doneCount}/{total}</Text>
          </View>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Today's Prayers</Text>
          <Text style={styles.headerSub}>
            {doneCount === total ? 'All completed ð¤²' : `${total - doneCount} remaining`}
          </Text>
        </View>
      </View>

      {/* Beads */}
      <View style={styles.beadsRow}>
        <View style={styles.connector} pointerEvents="none" />
        {prayers.map((name) => {
          const isDone = completed.includes(name);
          const isNext = !isDone && name === activePrayer;
          const meta   = prayerMeta[name] || {};
          const accent = meta.color || Colors.primary;

          return (
            <View key={name} style={styles.beadColumn}>
              <View style={styles.beadCenter}>
                {isNext && (
                  <Animated.View style={[styles.beadRipple, { borderColor: accent, opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
                )}
                {isDone ? (
                  <View style={[styles.bead, { backgroundColor: accent, borderColor: accent }]}>
                    <Text style={styles.beadCheck}>â</Text>
                  </View>
                ) : (
                  <Animated.View style={[
                    styles.bead, styles.beadPending,
                    isNext && {
                      borderColor: accent, borderWidth: 2.5,
                      opacity: blink.interpolate({ inputRange: [0,1], outputRange: [0.55, 1] }),
                    },
                  ]}>
                    {meta.image
                      ? <Image source={meta.image} style={styles.beadImage} resizeMode="cover" />
                      : <Text style={styles.beadIcon}>{meta.icon}</Text>
                    }
                  </Animated.View>
                )}
              </View>
              <Text
                style={[
                  styles.beadLabel,
                  isDone && { color: Colors.text, fontWeight: '700' },
                  isNext && { color: accent, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const BEAD = 32;

const getStyles = (Colors) => StyleSheet.create({
  wrap: {
    marginHorizontal:  16,
    marginVertical:    8,
    backgroundColor:   Colors.card,
    borderRadius:      16,
    borderWidth:       1,
    borderColor:       Colors.border,
    paddingVertical:   12,
    paddingHorizontal: 14,
  },

  headerRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ringBadge:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ringLabelWrap:  { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringLabel:      { color: Colors.text, fontSize: 9, fontWeight: '800' },
  headerTextWrap: { flex: 1 },
  headerTitle:    { color: Colors.text, fontSize: 13, fontWeight: '700' },
  headerSub:      { color: Colors.textSecondary, fontSize: 11, marginTop: 1 },

  beadsRow:  { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  connector: {
    position: 'absolute', top: BEAD / 2 - 1,
    left: BEAD / 2 + 2, right: BEAD / 2 + 2,
    height: 2, backgroundColor: Colors.border,
  },
  beadColumn: { alignItems: 'center', width: BEAD + 6 },
  beadCenter: { alignItems: 'center', justifyContent: 'center' },
  beadRipple: { position: 'absolute', width: BEAD, height: BEAD, borderRadius: BEAD/2, borderWidth: 2 },
  bead:        { width: BEAD, height: BEAD, borderRadius: BEAD/2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  beadPending: { backgroundColor: Colors.cardLight, borderColor: Colors.border },
  beadImage:   { width: BEAD, height: BEAD, borderRadius: BEAD/2 },
  beadIcon:    { fontSize: 14, opacity: 0.8 },
  beadCheck:   { color: Colors.background, fontSize: 13, fontWeight: '800' },
  beadLabel:   { color: Colors.textMuted, fontSize: 9, marginTop: 4 },
});
