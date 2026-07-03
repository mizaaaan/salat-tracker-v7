/**
 * PrayerCard — compact row style (reduced size).
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Image,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';

export default function PrayerCard({
  name, meta, time, endTime, isCompleted, isTrackable, onToggle,
}) {
  const { colors: Colors } = useTheme();

  const pressScale   = useRef(new Animated.Value(1)).current;
  const doneAnim     = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkScale   = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(doneAnim,     { toValue: isCompleted ? 1 : 0, tension: 80,  friction: 8, useNativeDriver: false }),
      Animated.spring(checkScale,   { toValue: isCompleted ? 1 : 0, tension: 120, friction: 6, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: isCompleted ? 1 : 0, duration: 150,             useNativeDriver: true }),
    ]).start();
  }, [isCompleted]);

  const handlePress = () => {
    if (!isTrackable) return;
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.97, duration: 70,  useNativeDriver: true }),
      Animated.spring(pressScale, { toValue: 1,    tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  const overlayOpacity  = doneAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.10] });
  const timeColor       = doneAnim.interpolate({ inputRange: [0,1], outputRange: [Colors.textSecondary, Colors.primary] });
  const ringBorderColor = doneAnim.interpolate({ inputRange: [0,1], outputRange: [Colors.border, Colors.primary] });
  const ringBg          = doneAnim.interpolate({ inputRange: [0,1], outputRange: ['rgba(0,0,0,0)', Colors.primary] });

  return (
    <Animated.View style={[{ transform: [{ scale: pressScale }] }, !isTrackable && styles.sunriseWrap]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={isTrackable ? 0.92 : 1}
        style={styles.row}
      >
        <Animated.View style={[styles.wash, { backgroundColor: Colors.primary, opacity: overlayOpacity }]} />

        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: meta.color + '20', borderColor: meta.color + '30' }]}>
          {meta.image
            ? <Image source={meta.image} style={styles.iconImage} resizeMode="cover" />
            : <Text style={styles.iconEmoji}>{meta.icon}</Text>
          }
        </View>

        {/* Name + Arabic */}
        <View style={styles.nameCol}>
          <Text style={[styles.name, { color: Colors.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.arabic, { color: meta.color }]}>{meta.arabic}</Text>
        </View>

        {/* Time + checkbox */}
        <View style={styles.rightCol}>
          <View style={styles.timeRange}>
            <Animated.Text style={[styles.time, { color: timeColor }]}>{time}</Animated.Text>
            {endTime ? (
              <>
                <Text style={[styles.timeSep, { color: Colors.textMuted }]}> — </Text>
                <Text style={[styles.timeEnd, { color: Colors.textSecondary }]}>{endTime}</Text>
              </>
            ) : null}
          </View>

          {isTrackable ? (
            <Animated.View style={[styles.ring, { borderColor: ringBorderColor, backgroundColor: ringBg }]}>
              <Animated.Text style={[
                styles.checkmark,
                { transform: [{ scale: checkScale }], opacity: checkOpacity, color: Colors.background },
              ]}>✓</Animated.Text>
            </Animated.View>
          ) : (
            <View style={[styles.markerDot, { backgroundColor: meta.color + '50' }]} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sunriseWrap: { opacity: 0.52 },

  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingLeft:    14,
    paddingRight:   12,
    paddingTop:     8,
    paddingBottom:  8,
    gap:            10,
  },

  wash: { ...StyleSheet.absoluteFillObject },

  iconBox: {
    width:          34,
    height:         34,
    borderRadius:   9,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 17, lineHeight: 20 },
  iconImage: { width: 30, height: 30, borderRadius: 8 },

  nameCol: { flex: 1, gap: 1 },
  name:    { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  arabic:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },

  rightCol:  { alignItems: 'flex-end', gap: 7 },
  timeRange: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  time:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.2, textAlign: 'right' },
  timeSep:   { fontSize: 10, fontWeight: '400' },
  timeEnd:   { fontSize: 11, fontWeight: '500', letterSpacing: 0.2, textAlign: 'right' },

  ring: {
    width:          24,
    height:         24,
    borderRadius:   12,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 11, fontWeight: '900', lineHeight: 13 },

  markerDot: { width: 6, height: 6, borderRadius: 3 },
});