/**
 * AsmaulHusnaScreen — The 99 Beautiful Names of Allah (Asma-ul-Husna)
 * Arabic + transliteration + English meaning + Bengali meaning, with search.
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { ASMAUL_HUSNA } from '../utils/asmaulHusnaData';

export default function AsmaulHusnaScreen({ visible, onClose }) {
  const { colors: C } = useTheme();
  const S = getStyles(C);

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ASMAUL_HUSNA;
    return ASMAUL_HUSNA.filter(n =>
      n.trans.toLowerCase().includes(q) ||
      n.en.toLowerCase().includes(q) ||
      n.bn.includes(q) ||
      String(n.id).includes(q)
    );
  }, [query]);

  const renderItem = ({ item }) => (
    <View style={S.card}>
      <View style={S.idBadge}>
        <Text style={S.idBadgeText}>{item.id}</Text>
      </View>

      <View style={S.cardBody}>
        <Text style={S.arabic}>{item.arabic}</Text>
        <Text style={S.trans}>{item.trans}</Text>

        <View style={S.hr} />

        <View style={S.meaningRow}>
          <Text style={S.flag}>EN</Text>
          <Text style={S.meaningText}>{item.en}</Text>
        </View>
        <View style={S.meaningRow}>
          <Text style={S.flag}>বাং</Text>
          <Text style={S.meaningText}>{item.bn}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={S.container} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity style={S.headerBtn} onPress={onClose}>
            <Text style={S.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.headerTitle}>✨ Asma-ul-Husna</Text>
          <View style={S.headerBtn} />
        </View>

        {/* Search */}
        <View style={S.searchWrap}>
          <TextInput
            style={S.searchInput}
            placeholder="Search name or meaning…"
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={S.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={S.countLabel}>
          {filtered.length} of 99 Names {query ? 'found' : ''}
        </Text>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={10}
          ListEmptyComponent={
            <Text style={S.emptyText}>No names match your search.</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: C.text },
  headerBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardLight, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 15, color: C.textSecondary },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, backgroundColor: C.cardLight, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 10 },
  clearBtn:    { fontSize: 13, color: C.textMuted, paddingLeft: 8 },

  countLabel: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 4, fontWeight: '600', letterSpacing: 0.3 },

  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 },

  card: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, gap: 12 },

  idBadge:     { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary + '18', borderWidth: 1, borderColor: C.primary + '50', alignItems: 'center', justifyContent: 'center' },
  idBadgeText: { fontSize: 12, fontWeight: '800', color: C.primary },

  cardBody: { flex: 1 },
  arabic:   { fontSize: 26, color: C.text, textAlign: 'right', lineHeight: 38 },
  trans:    { fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 4 },

  hr: { height: 1, backgroundColor: C.divider, marginVertical: 8 },

  meaningRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  flag:        { fontSize: 10, fontWeight: '800', color: C.textMuted, width: 26, marginTop: 1, letterSpacing: 0.3 },
  meaningText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 19 },

  emptyText: { textAlign: 'center', color: C.textSecondary, fontSize: 13, marginTop: 40 },
});
