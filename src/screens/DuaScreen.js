import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../constants/ThemeContext';
import { CATEGORY_DUAS } from '../constants/duaData';
import { DUA_CONTENT } from '../constants/duaContent';

// ── 18 Dua categories — 3 per row, 6 rows ─────────────────────────────────────
// duas: populated from duaData.js; arabic/translation fields will be added later.
const DUA_CATEGORIES = [
  { key: 'salah',                icon: require('../../assets/dua-icons/salah.png'),                bn: 'সালাত',           en: 'Prayer (Salah)' },
  { key: 'morning-evening',      icon: require('../../assets/dua-icons/morning-evening.png'),      bn: 'সকাল - সন্ধ্যা',    en: 'Morning & Evening' },
  { key: 'sleep',                icon: require('../../assets/dua-icons/sleep.png'),                bn: 'ঘুম',             en: 'Sleep' },
  { key: 'ramadan',              icon: require('../../assets/dua-icons/ramadan.png'),              bn: 'রামাদান - সিয়াম',  en: 'Ramadan & Fasting' },
  { key: 'quran',                icon: require('../../assets/dua-icons/quran.png'),                bn: 'কুরআনের দোয়া',     en: "Qur'anic Supplications" },
  { key: 'food',                 icon: require('../../assets/dua-icons/food.png'),                 bn: 'খাদ্য ও পানীয়',    en: 'Food & Drink' },
  { key: 'illness-death',        icon: require('../../assets/dua-icons/illness-death.png'),        bn: 'অসুস্থতা - মৃত্যু', en: 'Illness & Death' },
  { key: 'ruqyah',               icon: require('../../assets/dua-icons/ruqyah.png'),               bn: 'রুকইয়াহ',         en: 'Ruqyah' },
  { key: 'protection',           icon: require('../../assets/dua-icons/protection.png'),           bn: 'আশ্রয় প্রার্থনা',   en: 'Seeking Protection' },
  { key: 'social',               icon: require('../../assets/dua-icons/social.png'),               bn: 'সামাজিক',         en: 'Social' },
  { key: 'family',               icon: require('../../assets/dua-icons/family.png'),               bn: 'পরিবার',          en: 'Family' },
  { key: 'wealth',               icon: require('../../assets/dua-icons/wealth.png'),               bn: 'সম্পত্তি - রিযিক',   en: 'Wealth & Sustenance' },
  { key: 'gratitude-repentance', icon: require('../../assets/dua-icons/gratitude-repentance.png'), bn: 'শুকরিয়া - অনুতাপ',  en: 'Gratitude & Repentance' },
  { key: 'purification',         icon: require('../../assets/dua-icons/purification.png'),         bn: 'পবিত্রতা',         en: 'Purification' },
  { key: 'clothing',             icon: require('../../assets/dua-icons/clothing.png'),             bn: 'কাপড় পরিধান',      en: 'Clothing' },
  { key: 'hajj-umrah',           icon: require('../../assets/dua-icons/hajj-umrah.png'),           bn: 'হজ্জ - উমরা',       en: 'Hajj & Umrah' },
  { key: 'travel',               icon: require('../../assets/dua-icons/travel.png'),               bn: 'সফর',             en: 'Travel' },
  { key: 'nature',               icon: require('../../assets/dua-icons/nature.png'),               bn: 'প্রকৃতি',          en: 'Nature' },
].map(cat => ({ ...cat, duas: CATEGORY_DUAS[cat.key] || [] }));

// ── Tile (grid card) ───────────────────────────────────────────────────────────
function DuaTile({ item, styles, onPress }) {
  const count = item.duas.length;
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.tileIconWrap}>
        <Image source={item.icon} style={styles.tileIconImage} resizeMode="contain" />
      </View>
      <Text style={styles.tileBn} numberOfLines={1}>{item.bn}</Text>
      <Text style={styles.tileEn} numberOfLines={2}>{item.en}</Text>
      {count > 0 && (
        <Text style={styles.tileCount}>{count} দোয়া</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Individual dua detail (Arabic / transliteration / translation) ─────────────
function DuaDetailView({ category, dua, styles, onBack }) {
  const content = DUA_CONTENT[category.key]?.[dua.id];

  return (
    <View style={styles.detailContainer}>

      {/* ── Detail header ── */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.detailHeaderCenter}>
          <Text style={styles.detailHeaderBn} numberOfLines={2}>{dua.bn}</Text>
          <Text style={styles.detailHeaderEn}>{category.bn}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.duaDetailScroll}
        showsVerticalScrollIndicator={false}
      >
        {!content ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📿</Text>
            <Text style={styles.emptyTitle}>শীঘ্রই আসছে</Text>
            <Text style={styles.emptySubtitle}>Coming Soon</Text>
          </View>
        ) : (
          <>
            {content.parts.map((part, idx) => (
              <View key={idx} style={styles.duaPartCard}>
                {!!part.intro && (
                  <Text style={styles.duaIntro}>{part.intro}</Text>
                )}
                {!!part.arabic && (
                  <Text style={styles.duaArabic}>{part.arabic}</Text>
                )}
                {!!part.transliteration && (
                  <Text style={styles.duaTransliteration}>{part.transliteration}</Text>
                )}
                {!!part.bn && (
                  <Text style={styles.duaTranslation}>{part.bn}</Text>
                )}
                {!!part.note && (
                  <Text style={styles.duaNote}>{part.note}</Text>
                )}
                {!!part.reference && (
                  <Text style={styles.duaInlineReference}>{part.reference}</Text>
                )}
                {!!part.footnote && (
                  <Text style={styles.duaFootnoteMark}>[{part.footnote}]</Text>
                )}
                {idx < content.parts.length - 1 && <View style={styles.duaPartDivider} />}
              </View>
            ))}

            {!!content.footnotes?.length && (
              <View style={styles.duaReferenceBox}>
                <Text style={styles.duaReferenceTitle}>তথ্যসূত্র</Text>
                {content.footnotes.map((note, idx) => (
                  <Text key={idx} style={styles.duaReferenceText}>
                    [{idx + 1}] {note}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Category detail list ───────────────────────────────────────────────────────
function CategoryDetailView({ category, styles, onBack, onSelectDua }) {
  const duas = category.duas;
  return (
    <View style={styles.detailContainer}>

      {/* ── Detail header ── */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.detailHeaderCenter}>
          <Image source={category.icon} style={styles.detailHeaderIcon} resizeMode="contain" />
          <Text style={styles.detailHeaderBn}>{category.bn}</Text>
          <Text style={styles.detailHeaderEn}>{category.en}</Text>
        </View>
        {/* Spacer to balance the back button */}
        <View style={styles.backBtn} />
      </View>

      {/* ── Dua count pill ── */}
      {duas.length > 0 && (
        <View style={styles.countPillWrap}>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{duas.length}টি দোয়া</Text>
          </View>
        </View>
      )}

      {/* ── List ── */}
      <ScrollView
        contentContainerStyle={styles.detailList}
        showsVerticalScrollIndicator={false}
      >
        {duas.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📿</Text>
            <Text style={styles.emptyTitle}>শীঘ্রই আসছে</Text>
            <Text style={styles.emptySubtitle}>Coming Soon</Text>
          </View>
        ) : (
          duas.map((dua, index) => (
            <View key={dua.id}>
              <TouchableOpacity
                style={styles.duaRow}
                activeOpacity={0.65}
                onPress={() => onSelectDua(dua)}
              >
                <View style={styles.duaNumBadge}>
                  <Text style={styles.duaNumText}>{dua.id}</Text>
                </View>
                <Text style={styles.duaTitle} numberOfLines={2}>{dua.bn}</Text>
                <Text style={styles.duaChevron}>›</Text>
              </TouchableOpacity>
              {index < duas.length - 1 && <View style={styles.duaDivider} />}
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function DuaScreen() {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDua, setSelectedDua] = useState(null);

  // Android hardware back button — step back one level at a time
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedDua) {
          setSelectedDua(null);
          return true; // handled
        }
        if (selectedCategory) {
          setSelectedCategory(null);
          return true; // handled
        }
        return false;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [selectedCategory, selectedDua])
  );

  // ── Individual dua detail view ──
  if (selectedCategory && selectedDua) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <DuaDetailView
          category={selectedCategory}
          dua={selectedDua}
          styles={styles}
          onBack={() => setSelectedDua(null)}
        />
      </SafeAreaView>
    );
  }

  // ── Category detail view ──
  if (selectedCategory) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CategoryDetailView
          category={selectedCategory}
          styles={styles}
          onBack={() => setSelectedCategory(null)}
          onSelectDua={setSelectedDua}
        />
      </SafeAreaView>
    );
  }

  // ── Category grid ──
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/dua.png')}
            style={styles.headerImage}
            resizeMode="contain"
            tintColor={Colors.primary}
          />
          <Text style={styles.headerTitle}>দোয়া ও যিকর</Text>
          <Text style={styles.headerSubtitle}>Dua & Azkar Collection</Text>
        </View>

        {/* 3-column grid */}
        <View style={styles.grid}>
          {DUA_CATEGORIES.map((item) => (
            <DuaTile
              key={item.key}
              item={item}
              styles={styles}
              onPress={() => setSelectedCategory(item)}
            />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const getStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  // ── Grid header ──
  header:         { alignItems: 'center', marginBottom: 12 },
  headerImage:    { width: 48, height: 48, marginBottom: 4 },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: Colors.text },
  headerSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  // ── Grid ──
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    rowGap:         12,
  },

  // Each tile: fixed height so all rows align.
  // Height bumped to 148 from 132 to accommodate the new count badge row.
  tile: {
    width:            '31.3%',
    height:           148,
    backgroundColor:  Colors.card,
    borderRadius:     16,
    borderWidth:      1,
    borderColor:      Colors.border,
    paddingVertical:  12,
    paddingHorizontal: 6,
    alignItems:       'center',
    justifyContent:   'center',
  },
  tileIconWrap: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: Colors.primaryDim,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    7,
  },
  tileIconImage: { width: 26, height: 26 },
  tileBn: {
    fontSize:    13,
    fontWeight:  '700',
    color:       Colors.text,
    textAlign:   'center',
    marginBottom: 2,
  },
  tileEn: {
    fontSize:   10,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: 13,
    height:     26,
  },
  tileCount: {
    marginTop:   5,
    fontSize:    9.5,
    fontWeight:  '600',
    color:       Colors.primary,
    textAlign:   'center',
    letterSpacing: 0.2,
  },

  // ── Category detail container ──
  detailContainer: { flex: 1 },

  // ── Detail header ──
  detailHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 12,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor:   Colors.card,
  },
  backBtn: {
    width:  40,
    height: 40,
    alignItems:      'center',
    justifyContent:  'center',
  },
  backArrow: {
    fontSize:   22,
    color:      Colors.primary,
    fontWeight: '400',
    lineHeight: 26,
  },
  detailHeaderCenter: {
    flex:       1,
    alignItems: 'center',
  },
  detailHeaderIcon: { width: 36, height: 36, marginBottom: 3 },
  detailHeaderBn: {
    fontSize:   15,
    fontWeight: '700',
    color:      Colors.text,
  },
  detailHeaderEn: {
    fontSize: 10,
    color:    Colors.textSecondary,
    marginTop: 1,
  },

  // ── Count pill ──
  countPillWrap: { alignItems: 'center', paddingVertical: 10 },
  countPill: {
    backgroundColor: Colors.primaryDim,
    borderRadius:    20,
    paddingHorizontal: 14,
    paddingVertical:    4,
  },
  countPillText: {
    fontSize:   12,
    fontWeight: '600',
    color:      Colors.primary,
  },

  // ── Dua list ──
  detailList: { paddingHorizontal: 16, paddingTop: 4 },

  // ── Individual dua detail ──
  duaDetailScroll: { paddingHorizontal: 16, paddingTop: 16 },
  duaPartCard: {
    backgroundColor:  Colors.card,
    borderRadius:     16,
    borderWidth:      1,
    borderColor:      Colors.border,
    paddingVertical:  18,
    paddingHorizontal: 16,
    marginBottom:     14,
  },
  duaArabic: {
    fontFamily: 'UthmanicHafsV22',
    fontSize:   24,
    lineHeight: 46,
    textAlign:  'right',
    color:      Colors.text,
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  duaIntro: {
    fontSize:   12.5,
    lineHeight: 20,
    color:      Colors.textSecondary,
    fontStyle:  'italic',
    marginBottom: 10,
  },
  duaNote: {
    fontSize:   12,
    lineHeight: 19,
    color:      Colors.textSecondary,
    marginTop:  10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  duaInlineReference: {
    fontSize:   11,
    lineHeight: 17,
    color:      Colors.primary,
    marginTop:  8,
  },
  duaTransliteration: {
    fontSize:   13.5,
    lineHeight: 22,
    color:      Colors.primary,
    fontStyle:  'italic',
    marginBottom: 8,
  },
  duaTranslation: {
    fontSize:   14,
    lineHeight: 22,
    color:      Colors.textSecondary,
  },
  duaFootnoteMark: {
    alignSelf:  'flex-end',
    fontSize:   11,
    color:      Colors.primary,
    marginTop:  6,
  },
  duaPartDivider: { height: 0 },
  duaReferenceBox: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  duaReferenceTitle: {
    fontSize:   12,
    fontWeight: '700',
    color:      Colors.text,
    marginBottom: 6,
  },
  duaReferenceText: {
    fontSize:   11.5,
    lineHeight: 18,
    color:      Colors.textSecondary,
    marginBottom: 6,
  },

  duaRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  duaNumBadge: {
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: Colors.primaryDim,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
    flexShrink:      0,
  },
  duaNumText: {
    fontSize:   11,
    fontWeight: '700',
    color:      Colors.primary,
  },
  duaTitle: {
    flex:       1,
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.text,
    lineHeight: 20,
  },
  duaChevron: {
    fontSize:   20,
    color:      Colors.textSecondary,
    marginLeft:  8,
    lineHeight: 24,
  },
  duaDivider: {
    height:          1,
    backgroundColor: Colors.border,
    marginLeft:      46, // aligns under the title (badge width + margin)
  },

  // ── Empty state ──
  emptyWrap: {
    alignItems:  'center',
    paddingTop:  60,
  },
  emptyIcon:     { fontSize: 40, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary },
});
