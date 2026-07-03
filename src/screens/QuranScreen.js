/**
 * QuranScreen — Full Quran reader
 *
 * Data source : alquran.cloud free API (no key required)
 * Arabic      : quran-uthmani (Uthmani script)
 * English     : en.sahih (Sahih International)
 * Bangla      : bn.bengali (Muhiuddin Khan)
 *
 * Views:
 *   LIST   — 114 surahs, searchable
 *   SURAH  — ayah-by-ayah reader with Arabic + translations
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

// ── Bismillah ──────────────────────────────────────────────────────────────────
const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
// Surah 1 (Al-Fatiha) — Bismillah IS verse 1; keep in ayah list, skip gold header
// Surah 9 (At-Tawbah) — No Bismillah at all
const NO_BISMILLAH = new Set([1, 9]);

// The quran-uthmani API embeds the bismillah inside the Arabic text of each
// surah's first ayah (e.g. Surah 2 ayah 1 = "بسم الله … الٓمٓ").
// We show it as the gold header instead, so strip those first 4 words from
// the ayah's Arabic field.  Splitting on whitespace is script-agnostic and
// handles both alef variants (ا / ٱ) without fragile regex unicode escapes.
const stripBismillah = (text) => {
  const t = text.trim();
  // Bismillah opens with بِسْمِ (U+0628 U+0650 U+0633 U+0652 U+0645 U+0650)
  if (!t.startsWith('\u0628\u0650\u0633\u0652\u0645\u0650')) return t;
  const words = t.split(/\s+/);
  // Bismillah = exactly 4 words; if fewer remain, something is off — keep as-is
  return words.length > 4 ? words.slice(4).join(' ') : t;
};

// ── Font options ───────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  { key: 'system',   label: 'System',  fontFamily: undefined },
  { key: 'amiri',    label: 'Amiri',   fontFamily: 'AmiriQuran' },
  { key: 'volt',     label: 'Volt',    fontFamily: 'MeQuranVolt' },
  { key: 'qpchafs',  label: 'QPC Hafs',fontFamily: 'QPCHafs' },
  { key: 'hafsv22',  label: 'Hafs V22',fontFamily: 'UthmanicHafsV22' },
];

// ── API ────────────────────────────────────────────────────────────────────────
const BASE = 'https://api.alquran.cloud/v1';

const fetchSurahList = () =>
  fetch(`${BASE}/surah`).then(r => r.json());

const fetchSurah = (n) =>
  fetch(`${BASE}/surah/${n}/editions/quran-uthmani,en.sahih,bn.bengali`)
    .then(r => r.json());



// ── Surah List Item ────────────────────────────────────────────────────────────
const SurahRow = React.memo(({ item, onPress, Colors }) => {
  const styles = rowStyles(Colors);
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      {/* Number badge */}
      <View style={styles.numBadge}>
        <Text style={styles.numText}>{item.number}</Text>
      </View>

      {/* Names */}
      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          <Text style={styles.latin}>{item.englishName}</Text>
          <Text style={styles.revelation}>
            {item.revelationType === 'Meccan' ? 'Makki' : 'Madani'}
          </Text>
        </View>
        <Text style={styles.meaning} numberOfLines={1}>
          {item.englishNameTranslation}
        </Text>
      </View>

      {/* Arabic name + ayah count */}
      <View style={styles.rightCol}>
        <Text style={styles.arabic}>{item.name}</Text>
        <Text style={styles.ayahCount}>{item.numberOfAyahs} ayahs</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Ayah Item ──────────────────────────────────────────────────────────────────
const AyahItem = React.memo(({ ayah, showEn, showBn, arabicFont, arabicSize, Colors }) => {
  const styles = ayahStyles(Colors);
  const fontFamily = FONT_OPTIONS.find(f => f.key === arabicFont)?.fontFamily;
  return (
    <View style={styles.ayahCard}>
      {/* Verse number */}
      <View style={styles.verseNumWrap}>
        <View style={styles.verseNumBadge}>
          <Text style={styles.verseNum}>{ayah.numberInSurah}</Text>
        </View>
        <View style={styles.verseLine} />
      </View>

      {/* Arabic */}
      <Text
        style={[
          styles.arabicText,
          { fontSize: arabicSize, lineHeight: arabicSize * 1.8 },
          fontFamily && { fontFamily },
        ]}
        selectable
      >
        {ayah.arabic}
      </Text>

      {/* English */}
      {showEn && (
        <Text style={styles.englishText} selectable>
          {ayah.english}
        </Text>
      )}

      {/* Bangla */}
      {showBn && (
        <Text style={styles.banglaText} selectable>
          {ayah.bangla}
        </Text>
      )}
    </View>
  );
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function QuranScreen() {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  // ── State ──
  const [view,       setView]       = useState('list');   // 'list' | 'surah'
  const [surahs,     setSurahs]     = useState([]);
  const [listStatus, setListStatus] = useState('idle');   // 'idle'|'loading'|'error'
  const [selected,   setSelected]   = useState(null);     // surah meta object
  const [ayahs,      setAyahs]      = useState([]);
  const [surahStatus,setSurahStatus]= useState('idle');
  const [search,     setSearch]     = useState('');
  const [showEn,     setShowEn]     = useState(true);
  const [showBn,     setShowBn]     = useState(true);
  // cycles through FONT_OPTIONS: system, amiri, volt, qpchafs, hafsv22
  const [arabicFont, setArabicFont] = useState('system');
  const toggleFont = useCallback(() =>
    setArabicFont(f => {
      const idx = FONT_OPTIONS.findIndex(o => o.key === f);
      return FONT_OPTIONS[(idx + 1) % FONT_OPTIONS.length].key;
    }), []);
  const currentFontLabel = FONT_OPTIONS.find(o => o.key === arabicFont)?.label ?? 'System';

  // Arabic font size: default 26, range 18–48
  const ARABIC_SIZE_DEFAULT = 26;
  const ARABIC_SIZE_MIN     = 18;
  const ARABIC_SIZE_MAX     = 48;
  const [arabicSize, setArabicSize] = useState(ARABIC_SIZE_DEFAULT);
  const sizeDown = useCallback(() =>
    setArabicSize(s => Math.max(ARABIC_SIZE_MIN, s - 2)), []);
  const sizeUp   = useCallback(() =>
    setArabicSize(s => Math.min(ARABIC_SIZE_MAX, s + 2)), []);

  const listRef = useRef(null);

  // ── Load surah list once ────────────────────────────────────────────────────
  useEffect(() => {
    setListStatus('loading');
    fetchSurahList()
      .then(json => {
        if (json.status === 'OK') {
          setSurahs(json.data);
          setListStatus('ok');
        } else {
          setListStatus('error');
        }
      })
      .catch(() => setListStatus('error'));
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.toLowerCase();
    return surahs.filter(s =>
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      String(s.number).includes(q)
    );
  }, [surahs, search]);

  // ── Open a surah ────────────────────────────────────────────────────────────
  const openSurah = useCallback((surahMeta) => {
    setSelected(surahMeta);
    setAyahs([]);
    setSurahStatus('loading');
    setView('surah');

    fetchSurah(surahMeta.number)
      .then(json => {
        if (json.status === 'OK') {
          const arabicAyahs  = json.data[0].ayahs;
          const englishAyahs = json.data[1].ayahs;
          const banglaAyahs  = json.data[2].ayahs;

          const merged = arabicAyahs.map((a, i) => ({
            key:           String(a.number),
            numberInSurah: a.numberInSurah,
            arabic:        a.text,
            english:       englishAyahs[i]?.text ?? '',
            bangla:        banglaAyahs[i]?.text  ?? '',
          }));

          // The quran-uthmani API embeds the bismillah inside the Arabic text of
          // the first real ayah (e.g. Surah 2 ayah 1 = "بسم الله … الٓمٓ").
          // For surahs that show the gold header (not 1 or 9), strip that
          // embedded bismillah so it only appears in the header, not the ayah.
          // Surah 1: bismillah IS verse 1 — leave arabic untouched, no header.
          // Surah 9: no bismillah — leave arabic untouched, no header.
          const stripped = NO_BISMILLAH.has(surahMeta.number)
            ? merged
            : merged.map((a, i) =>
                i === 0 ? { ...a, arabic: stripBismillah(a.arabic) } : a
              );

          setAyahs(stripped);
          setSurahStatus('ok');
        } else {
          setSurahStatus('error');
        }
      })
      .catch(() => setSurahStatus('error'));
  }, []);

  const goBack = useCallback(() => {
    setView('list');
    setSelected(null);
    setAyahs([]);
  }, []);

  // ── Render: Surah list ──────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>القرآن الكريم</Text>
          <Text style={styles.headerSub}>The Holy Quran</Text>
          {/* Font switcher — accessible from list view too */}
          <TouchableOpacity
            style={[styles.fontToggleBtn, arabicFont !== 'system' && styles.fontToggleBtnOn]}
            onPress={toggleFont}
            activeOpacity={0.7}
          >
            <Text style={[styles.fontToggleBtnText, arabicFont !== 'system' && styles.fontToggleBtnTextOn]}>
              ✦ Font: {currentFontLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: Colors.text }]}
            placeholder="Search surah name or number…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* List */}
        {listStatus === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading surahs…</Text>
          </View>
        )}

        {listStatus === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>
              Could not load Quran data.{'\n'}Please check your internet connection.
            </Text>
          </View>
        )}

        {listStatus === 'ok' && (
          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={item => String(item.number)}
            renderItem={({ item }) => (
              <SurahRow item={item} onPress={openSurah} Colors={Colors} />
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: Colors.divider, marginLeft: 72 }} />
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.loadingText, { marginTop: 40 }]}>No results for "{search}"</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Render: Surah detail ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Surah header */}
      <View style={styles.surahHeader}>
        {/* Row 1: back · title · toggles */}
        <View style={styles.surahHeaderRow}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>Surahs</Text>
          </TouchableOpacity>

          <View style={styles.sizeRow}>
            <TouchableOpacity
              style={[styles.sizeBtn, arabicSize <= ARABIC_SIZE_MIN && styles.sizeBtnDisabled]}
              onPress={sizeDown}
              disabled={arabicSize <= ARABIC_SIZE_MIN}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
            >
              <Text style={[styles.sizeBtnText, arabicSize <= ARABIC_SIZE_MIN && styles.sizeBtnTextDisabled]}>
                A−
              </Text>
            </TouchableOpacity>

            <Text style={styles.sizeLabel}>
              {arabicSize}
            </Text>

            <TouchableOpacity
              style={[styles.sizeBtn, arabicSize >= ARABIC_SIZE_MAX && styles.sizeBtnDisabled]}
              onPress={sizeUp}
              disabled={arabicSize >= ARABIC_SIZE_MAX}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
            >
              <Text style={[styles.sizeBtnText, arabicSize >= ARABIC_SIZE_MAX && styles.sizeBtnTextDisabled]}>
                A+
              </Text>
            </TouchableOpacity>
          </View>

          {/* Translation toggles + font switcher */}
          <View style={styles.togglesRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, showEn && styles.toggleBtnOn]}
              onPress={() => setShowEn(v => !v)}
            >
              <Text style={[styles.toggleBtnText, showEn && styles.toggleBtnTextOn]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, showBn && styles.toggleBtnOn]}
              onPress={() => setShowBn(v => !v)}
            >
              <Text style={[styles.toggleBtnText, showBn && styles.toggleBtnTextOn]}>বাংলা</Text>
            </TouchableOpacity>
            {/* Font switcher */}
            <TouchableOpacity
              style={[styles.toggleBtn, arabicFont !== 'system' && styles.toggleBtnOn]}
              onPress={toggleFont}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleBtnText, arabicFont !== 'system' && styles.toggleBtnTextOn]}>
                خط
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: surah title */}
        <View style={styles.surahTitleBlock}>
          <Text style={styles.surahArabicTitle}>{selected?.name}</Text>
          <Text style={styles.surahLatinTitle}>{selected?.englishName}</Text>
        </View>
      </View>

      {/* Loading */}
      {surahStatus === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading {selected?.englishName}…</Text>
        </View>
      )}

      {/* Error */}
      {surahStatus === 'error' && (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>
            Could not load this surah.{'\n'}Please check your connection.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => openSurah(selected)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ayahs */}
      {surahStatus === 'ok' && (
        <FlatList
          data={ayahs}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <AyahItem
              ayah={item}
              showEn={showEn}
              showBn={showBn}
              arabicFont={arabicFont}
              arabicSize={arabicSize}
              Colors={Colors}
            />
          )}
          ListHeaderComponent={
            <View>
              {/* Surah info strip */}
              <View style={[styles.surahInfoStrip, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
                <Text style={[styles.surahInfoItem, { color: Colors.textSecondary }]}>
                  {selected?.numberOfAyahs} Ayahs
                </Text>
                <View style={styles.surahInfoDot} />
                <Text style={[styles.surahInfoItem, { color: Colors.textSecondary }]}>
                  {selected?.revelationType === 'Meccan' ? 'Makki' : 'Madani'}
                </Text>
                <View style={styles.surahInfoDot} />
                <Text style={[styles.surahInfoItem, { color: Colors.textSecondary }]}>
                  {selected?.englishNameTranslation}
                </Text>
              </View>

              {/* Bismillah */}
              {!NO_BISMILLAH.has(selected?.number) && (
                <View style={styles.bismillahWrap}>
                  <Text style={[
                    styles.bismillah,
                    { color: Colors.primary },
                    { fontSize: arabicSize + 2, lineHeight: (arabicSize + 2) * 1.7 },
                    FONT_OPTIONS.find(o => o.key === arabicFont)?.fontFamily
                      ? { fontFamily: FONT_OPTIONS.find(o => o.key === arabicFont).fontFamily }
                      : null,
                  ]}>
                    {BISMILLAH}
                  </Text>
                </View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={8}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const getStyles = (Colors) => StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
  },

  // Font toggle (list-view header)
  fontToggleBtn: {
    marginTop:         8,
    paddingHorizontal: 14,
    paddingVertical:   5,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       Colors.border,
    backgroundColor:   Colors.card,
  },
  fontToggleBtnOn: {
    borderColor:     Colors.primary,
    backgroundColor: Colors.primary + '22',
  },
  fontToggleBtnText: {
    fontSize:   11,
    fontWeight: '600',
    color:      Colors.textSecondary,
    letterSpacing: 0.4,
  },
  fontToggleBtnTextOn: {
    color: Colors.primary,
  },

  // Header
  header: {
    alignItems:       'center',
    paddingTop:       20,
    paddingBottom:    12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize:      28,
    fontWeight:    '700',
    color:         Colors.primary,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize:  12,
    color:     Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Search
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   Colors.card,
    borderRadius:      12,
    marginHorizontal:  16,
    marginVertical:    12,
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderWidth:       1,
    borderColor:       Colors.border,
    gap:               8,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: {
    flex:     1,
    fontSize: 14,
    padding:  0,
  },

  // Loading / error
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
    gap:            12,
  },
  loadingText: {
    color:    Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  errorEmoji: { fontSize: 36 },
  errorText: {
    color:     Colors.textSecondary,
    fontSize:  14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor:   Colors.primary,
    paddingHorizontal: 28,
    paddingVertical:   12,
    borderRadius:      12,
    marginTop:         8,
  },
  retryText: {
    color:      Colors.background,
    fontWeight: '700',
    fontSize:   15,
  },

  // Surah header
  surahHeader: {
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap:               8,
  },
  surahHeaderRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },

  // Font-size control row
  sizeRow: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    paddingTop:     2,
  },
  sizeBtn: {
    paddingHorizontal: 14,
    paddingVertical:   5,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       Colors.primary + '80',
    backgroundColor:   Colors.primary + '15',
  },
  sizeBtnDisabled: {
    borderColor:     Colors.border,
    backgroundColor: Colors.card,
  },
  sizeBtnText: {
    fontSize:   13,
    fontWeight: '700',
    color:      Colors.primary,
    letterSpacing: 0.3,
  },
  sizeBtnTextDisabled: {
    color: Colors.textMuted,
  },
  sizeLabel: {
    fontSize:   11,
    color:      Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
    minWidth:   22,
    textAlign:  'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  backIcon: {
    fontSize:   28,
    color:      Colors.primary,
    lineHeight: 30,
    fontWeight: '300',
  },
  backText: {
    color:    Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  surahTitleBlock: {
    alignItems:'center',
    paddingTop: 6,
  },
  surahArabicTitle: {
    fontSize:   20,
    fontWeight: '700',
    color:      Colors.text,
  },
  surahLatinTitle: {
    fontSize:  12,
    color:     Colors.textSecondary,
    marginTop: 1,
    fontWeight:'500',
  },

  // Translation toggles
  togglesRow: {
    flexDirection: 'row',
    gap:           6,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       Colors.border,
    backgroundColor:   Colors.card,
  },
  toggleBtnOn: {
    borderColor:     Colors.primary,
    backgroundColor: Colors.primary + '22',
  },
  toggleBtnText: {
    fontSize:   11,
    fontWeight: '600',
    color:      Colors.textSecondary,
  },
  toggleBtnTextOn: {
    color: Colors.primary,
  },

  // Bismillah
  bismillahWrap: {
    alignItems:        'center',
    marginTop:         20,
    marginBottom:      8,
    paddingHorizontal: 24,
  },
  bismillah: {
    fontSize:      22,
    fontWeight:    '600',
    textAlign:     'center',
    letterSpacing: 1,
    lineHeight:    36,
  },

  // Surah info strip
  surahInfoStrip: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    marginHorizontal:  16,
    marginTop:         14,
    marginBottom:      4,
    paddingVertical:   10,
    borderRadius:      12,
    borderWidth:       1,
    gap:               10,
  },
  surahInfoItem: {
    fontSize:  13,
    fontWeight:'500',
  },
  surahInfoDot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.textMuted,
  },


});

// ── Row styles (SurahRow) ──────────────────────────────────────────────────────
const rowStyles = (Colors) => StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:               14,
  },
  numBadge: {
    width:          40,
    height:         40,
    borderRadius:   12,
    backgroundColor: Colors.primary + '18',
    borderWidth:    1,
    borderColor:    Colors.primary + '30',
    alignItems:     'center',
    justifyContent: 'center',
  },
  numText: {
    color:      Colors.primary,
    fontSize:   13,
    fontWeight: '700',
  },
  nameCol: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  latin: {
    color:      Colors.text,
    fontSize:   15,
    fontWeight: '700',
  },
  meaning: {
    color:    Colors.textSecondary,
    fontSize: 12,
  },
  revelation: {
    color:             Colors.textMuted,
    fontSize:          10,
    fontWeight:        '600',
    letterSpacing:     0.5,
    textTransform:     'uppercase',
    backgroundColor:   Colors.cardLight,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
  },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  arabic: {
    color:      Colors.text,
    fontSize:   18,
    fontWeight: '600',
    textAlign:  'right',
  },
  ayahCount: {
    color:    Colors.textSecondary,
    fontSize: 11,
  },
});

// ── Ayah styles ────────────────────────────────────────────────────────────────
const ayahStyles = (Colors) => StyleSheet.create({
  ayahCard: {
    paddingHorizontal: 16,
    paddingTop:        20,
    paddingBottom:     16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    overflow:          'hidden',  // safety net — prevents text bleeding past card edge
  },
  verseNumWrap: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  14,
    gap:           10,
  },
  verseNumBadge: {
    width:          28,
    height:         28,
    borderRadius:   14,
    backgroundColor: Colors.primary + '22',
    borderWidth:    1,
    borderColor:    Colors.primary + '50',
    alignItems:     'center',
    justifyContent: 'center',
  },
  verseNum: {
    color:      Colors.primary,
    fontSize:   11,
    fontWeight: '700',
  },
  verseLine: {
    flex:            1,
    height:          1,
    backgroundColor: Colors.divider,
  },

  // Arabic — large, right-to-left
  arabicText: {
    color:            Colors.text,
    fontSize:         26,
    lineHeight:       46,
    textAlign:        'right',
    writingDirection: 'rtl',
    fontWeight:       '500',
    // NOTE: letterSpacing removed — causes RTL Arabic text to overflow the
    // right edge of the screen at larger font sizes (spacing is added after
    // each glyph, pushing the line-start char off-screen in RTL).
    marginBottom:     14,
    // NOTE: paddingHorizontal removed — parent ayahCard already has 16px
    // horizontal padding; adding more here shrinks the wrapping budget and
    // contributes to overflow.
    alignSelf:        'stretch',   // fill the full card width
  },

  // English
  englishText: {
    color:        Colors.textSecondary,
    fontSize:     14,
    lineHeight:   22,
    fontStyle:    'italic',
    marginBottom: 8,
  },

  // Bangla
  banglaText: {
    color:      Colors.text,
    fontSize:   14,
    lineHeight: 24,
    fontWeight: '400',
  },
});
