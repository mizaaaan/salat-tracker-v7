/**
 * HajjUmrahScreen — complete offline Hajj & Umrah guide
 *
 * Features:
 *  • Toggle between Hajj and Umrah
 *  • Step-by-step ritual guide with Arabic duas
 *  • Expandable step cards
 *  • Important tips & notes
 *  • Key vocabulary glossary
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

// ─── Data ─────────────────────────────────────────────────────────────────────

const UMRAH_STEPS = [
  {
    num: 1, icon: '🧥', title: 'Enter the State of Ihraam',
    summary: 'Put on the Ihraam garments and make the intention.',
    color: '#C9A84C',
    details: `Ihraam is the sacred state entered before performing Umrah. For men, it consists of two white unstitched sheets. Women wear their normal modest clothing.\n\n• Perform Ghusl (full body wash) before wearing Ihraam\n• Apply perfume to body (not clothes) before Ihraam\n• Men: Wear two white unstitched sheets (izar & rida)\n• Pray two rak'ahs of Sunnah prayer\n• Make the intention (niyyah) at the Miqat\n• Recite the Talbiyah continuously from Miqat`,
    dua: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
    duaTranslit: 'Labbayk Allahumma labbayk, labbayk la shareeka laka labbayk, innal hamda wan-ni\'mata laka wal-mulk, la shareeka lak.',
    duaMeaning: 'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, grace and sovereignty belong to You. You have no partner.',
    tips: ['Stop Talbiyah once you start Tawaf', 'Avoid cutting hair or nails, perfume, or marital relations while in Ihraam', 'Miqat for those coming via air: wear Ihraam before boarding'],
  },
  {
    num: 2, icon: '🕋', title: 'Tawaf — Circling the Ka\'bah',
    summary: 'Perform 7 circuits around the Ka\'bah counter-clockwise.',
    color: '#1AB87A',
    details: `Tawaf means circling the Ka'bah 7 times, starting from the Black Stone (Hajar al-Aswad) and ending there.\n\n• Begin from the Black Stone (Hajar al-Aswad) line\n• Keep the Ka'bah on your left shoulder\n• Complete 7 complete circuits\n• Men: perform Raml (brisk walk) in first 3 circuits\n• Kiss or point to the Black Stone at start of each circuit\n• Touch the Yemeni corner (Ar-Rukn al-Yamani) with right hand if possible`,
    dua: 'بِسْمِ اللهِ وَاللهُ أَكْبَرُ، اللَّهُمَّ إِيمَانًا بِكَ، وَتَصْدِيقًا بِكِتَابِكَ، وَوَفَاءً بِعَهْدِكَ، وَاتِّبَاعًا لِسُنَّةِ نَبِيِّكَ ﷺ',
    duaTranslit: 'Bismillahi wallahu akbar, Allahumma imanan bika wa tasdeeqan bikitabika wa wafa-an bi\'ahdika wattiba-an lisunnati nabiyyika ﷺ.',
    duaMeaning: 'In the name of Allah, and Allah is the Greatest. O Allah, out of faith in You, belief in Your Book, in fulfillment of Your covenant, and in emulation of Your Prophet\'s Sunnah ﷺ.',
    tips: ['There is no specific dua for Tawaf — any dua, dhikr, or Quran recitation is recommended', 'Between Yemeni corner and Black Stone, recite: Rabbana atina fid-dunya hasanatan...', 'Tawaf is valid in a wheelchair or being carried', 'Wudu is required for Tawaf'],
  },
  {
    num: 3, icon: '🙏', title: 'Prayer Behind Maqam Ibrahim',
    summary: 'Pray 2 rak\'ahs behind the Station of Ibrahim.',
    color: '#5BB8D4',
    details: `After completing Tawaf, pray two rak'ahs behind Maqam Ibrahim (the station where Ibrahim ﷺ stood while building the Ka'bah).\n\n• Move to Maqam Ibrahim after Tawaf\n• Recite Surah al-Kafirun in first rak'ah\n• Recite Surah al-Ikhlas in second rak'ah\n• If crowded, you may pray anywhere in Masjid al-Haram`,
    dua: 'وَاتَّخِذُوا مِن مَّقَامِ إِبْرَاهِيمَ مُصَلًّى',
    duaTranslit: 'Wattakhidhu min maqami Ibrahima musalla',
    duaMeaning: '"And take the station of Ibrahim as a place of prayer." (Quran 2:125)',
    tips: ['This prayer is Sunnah — do not skip it', 'Face the Ka\'bah while praying, with Maqam Ibrahim between you and Ka\'bah'],
  },
  {
    num: 4, icon: '💧', title: 'Drink from Zamzam',
    summary: 'Drink Zamzam water and make du\'a.',
    color: '#A06BE0',
    details: `Zamzam is the blessed well whose water has flowed for thousands of years. Drinking it is Sunnah after Tawaf.\n\n• Go to Zamzam taps (in the basement or around the Haram)\n• Face the Ka'bah\n• Drink in three sips, breathing between each\n• Make du'a — Zamzam is drunk for the purpose you intend`,
    dua: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ',
    duaTranslit: 'Allahumma inni as\'aluka \'ilman nafi\'an wa rizqan wasi\'an wa shifa\'an min kulli da\'.',
    duaMeaning: 'O Allah, I ask You for beneficial knowledge, abundant provision, and cure from every disease.',
    tips: ['The Prophet ﷺ said: "Zamzam water is for whatever it is drunk for"', 'You may also pour it over your head', 'Drink your fill — it is Sunnah to drink until full'],
  },
  {
    num: 5, icon: '⛰️', title: "Sa'i — Walking between Safa & Marwah",
    summary: "Walk 7 times between Mount Safa and Mount Marwah.",
    color: '#F0A050',
    details: `Sa'i commemorates Hajar's (Hagar's) search for water for her son Isma'il ﷺ. Walk 7 times between Safa and Marwah.\n\n• Begin at Safa (1st trip counts: Safa→Marwah)\n• End at Marwah (7th trip)\n• Men: jog between the two green lights\n• Make du'a at Safa and Marwah\n• No Wudu required for Sa'i (though preferred)\n• Count: Safa→Marwah = 1, Marwah→Safa = 2, etc.`,
    dua: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ ۖ — اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، وَلِلَّهِ الْحَمْدُ',
    duaTranslit: 'Innas-Safa wal-Marwata min sha\'a\'irillah — Allahu Akbar, Allahu Akbar, Allahu Akbar wa lillahil hamd.',
    duaMeaning: '"Indeed, Safa and Marwah are among the symbols of Allah." (2:158) — Allah is the Greatest (×3), and all praise belongs to Allah.',
    tips: ['Recite this dua when ascending Safa and Marwah', 'Face the Ka\'bah when reciting on Safa and Marwah', 'Sa\'i is done while walking — wheelchairs are permitted'],
  },
  {
    num: 6, icon: '✂️', title: 'Halq or Taqsir — Cutting Hair',
    summary: 'Shave or shorten hair to exit the state of Ihraam.',
    color: '#E07070',
    details: `Halq (shaving the head) or Taqsir (shortening hair) is the final ritual that marks the exit from Ihraam.\n\n• Men: ideally shave entire head (Halq) — more rewarding\n• Men may shorten hair (Taqsir) by at least 2.5 cm\n• Women: cut a fingertip-length (approximately 2-3 cm) from hair\n• After this, all Ihraam restrictions are lifted\n• Umrah is now complete — congratulations! 🎉`,
    dua: 'اللَّهُمَّ اغْفِرْ لِلْمُحَلِّقِينَ، اللَّهُمَّ اغْفِرْ لِلْمُقَصِّرِينَ',
    duaTranslit: 'Allahummaghfir lil-muhalliqeen, Allahummaghfir lil-muqasssireen.',
    duaMeaning: 'O Allah, forgive those who shave their heads. O Allah, forgive those who shorten their hair.',
    tips: ['The Prophet ﷺ made du\'a for those who shave 3 times before once for those who trim', 'Have this done by a Muslim barber if possible', 'Umrah is now complete — all restrictions of Ihraam are lifted'],
  },
];

const HAJJ_DAYS = [
  {
    num: 1, icon: '🧥', day: '8 Dhul Hijjah', title: 'Yawm al-Tarwiyah — Day of Ihraam',
    color: '#C9A84C',
    summary: 'Enter Ihraam for Hajj and travel to Mina.',
    details: `This is the first day of Hajj rituals:\n\n• Perform Ghusl and put on Ihraam from your place of stay in Makkah\n• Make intention (niyyah) for Hajj\n• Recite Talbiyah continuously\n• Travel to Mina\n• Spend the day and night in Mina\n• Pray Dhuhr, Asr, Maghrib, Isha & Fajr (next morning) in Mina — shorten prayers (4-rak'ah → 2) but do not combine`,
    dua: 'لَبَّيْكَ اللَّهُمَّ حَجًّا',
    duaTranslit: 'Labbayk Allahumma Hajjan',
    duaMeaning: 'Here I am, O Allah, for Hajj.',
    tips: ['This day is Sunnah — some scholars say you may go directly to Arafah on the 9th', 'Mina is approx. 8 km from Masjid al-Haram', 'Set up in your assigned tent in Mina'],
  },
  {
    num: 2, icon: '🌅', day: '9 Dhul Hijjah', title: 'Yawm Arafah — The Greatest Day',
    color: '#F0A050',
    summary: 'Stand at Arafah — the pillar of Hajj. Hajj is Arafah.',
    details: `Arafah is the most important day of Hajj — the Prophet ﷺ said "Hajj is Arafah."\n\n• After Fajr: travel from Mina to Arafah\n• Arrive before Zawal (noon) — wuquf begins at noon\n• Pray Dhuhr and Asr combined and shortened (at Dhuhr time) if with a group\n• Stand (wuquf) anywhere within the plains of Arafah\n• Engage in du\'a, dhikr, Quran, repentance — this is the peak of Hajj\n• After sunset: travel to Muzdalifah (do NOT leave before sunset)`,
    dua: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    duaTranslit: 'La ilaha illallahu wahdahu la shareeka lahu, lahul mulku wa lahul hamdu wa huwa ala kulli shay\'in qadeer.',
    duaMeaning: 'There is no god but Allah alone, without partner. To Him belongs the dominion and to Him belongs all praise. He has power over all things.',
    tips: ['This is the best du\'a according to the Prophet ﷺ for Arafah', 'Weep and ask Allah for forgiveness — this is the day sins are forgiven', 'Collect pebbles in Muzdalifah (at least 49 for minimum Hajj)', 'Pray Maghrib and Isha combined at Muzdalifah'],
  },
  {
    num: 3, icon: '🌙', day: '9–10 Dhul Hijjah', title: 'Muzdalifah — Under the Open Sky',
    color: '#A06BE0',
    summary: 'Spend the night at Muzdalifah, pray, and collect pebbles.',
    details: `After Arafah, travel to Muzdalifah between the two valleys:\n\n• Pray Maghrib and Isha combined (shortened) upon arrival\n• Spend the night (minimum: arrive before midnight and stay until after midnight)\n• Collect 49 pebbles (or 70 for all 3 days of Rami)\n• Pebbles should be chickpea-sized\n• Pray Fajr early, then engage in du'a until there is light\n• Weak/elderly may leave after midnight for Makkah\n• Depart for Mina after sunrise (or after light for Fajr)`,
    dua: 'اللَّهُمَّ إِنَّكَ قُلْتَ فَاذْكُرُوا اللَّهَ عِندَ الْمَشْعَرِ الْحَرَامِ',
    duaTranslit: 'Allahumma innaka qulta fadhkuruLlaha \'indal-Mash\'aril-Haram.',
    duaMeaning: '"O Allah, You said: Remember Allah at the Sacred Monument (al-Mash\'ar al-Haram)." — Recite Talbiyah, takbeer, and du\'a here.',
    tips: ['Al-Mash\'ar al-Haram is in Muzdalifah — make du\'a here facing Qiblah', 'Collect pebbles from the ground (cleaned is better)', 'Sleep early — you need energy for Eid day'],
  },
  {
    num: 4, icon: '🎊', day: '10 Dhul Hijjah', title: 'Yawm al-Nahr — Day of Eid al-Adha',
    color: '#1AB87A',
    summary: 'Rami (Jamarat), sacrifice, shave/cut hair, Tawaf al-Ifadah.',
    details: `This is Eid al-Adha — the busiest day of Hajj with 4 key actions:\n\n1. RAMI — Throwing 7 pebbles at Jamarat al-Aqabah (the big pillar) only\n   Say Allahu Akbar with each pebble\n\n2. NAHR — Animal sacrifice (Hady)\n   You may authorize an organization to do this on your behalf\n\n3. HALQ/TAQSIR — Shave or cut hair\n   Men: ideally shave (Halq). Women: cut fingertip length.\n   Most Ihraam restrictions are now lifted (except marital relations until Tawaf)\n\n4. TAWAF AL-IFADAH — Tawaf of 7 circuits at Masjid al-Haram\n   + Sa\'i (if not done after Tawaf al-Qudum)\n   After this: ALL Ihraam restrictions are lifted`,
    dua: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، وَلِلَّهِ الْحَمْدُ',
    duaTranslit: 'Allahu Akbar, Allahu Akbar, la ilaha illallahu, wallahu Akbar, Allahu Akbar wa lillahil hamd.',
    duaMeaning: 'Allah is the Greatest (×2), there is no god but Allah, Allah is the Greatest (×2), and all praise is for Allah.',
    tips: ['Perform actions in order: Rami → Sacrifice → Haircut → Tawaf', 'If order is changed, it is still valid but you may need to pay Fidya', 'Say "Allahu Akbar" with EACH pebble throw', 'Do not throw all 7 pebbles at once'],
  },
  {
    num: 5, icon: '🕋', day: '11–12 Dhul Hijjah', title: "Ayyam al-Tashreeq — Days in Mina",
    color: '#5BB8D4',
    summary: 'Stone all three Jamarat daily and stay overnight in Mina.',
    details: `On 11th and 12th Dhul Hijjah (and optionally the 13th):\n\n• Stone all THREE Jamarat (small, medium, large pillars) each day\n• Throw 7 pebbles at each pillar (21 total per day)\n• Stone AFTER Zawal (noon) — before Zawal is not valid\n• Say Allahu Akbar with each throw\n• Order: Small → Medium → Large (Aqabah)\n• Make du\'a after the small and medium pillars\n• Spend nights in Mina (wajib)\n\nEarly departure (Nafr Awwal): Leave Mina on 12th before sunset after Rami\nLate departure (Nafr Thani): Stay until 13th — more rewarding`,
    dua: 'اللَّهُ أَكْبَرُ، اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا وَسَعْيًا مَشْكُورًا',
    duaTranslit: 'Allahu Akbar. Allahumma-j\'alhu Hajjan mabrura wa dhamban maghfura wa sa\'yan mashkura.',
    duaMeaning: 'Allah is Greatest. O Allah, make it an accepted Hajj, a forgiven sin, and a thanked effort.',
    tips: ['If you miss rami on any day, perform it before sunset of the following day', 'Missing an overnight in Mina requires Fidya (sacrifice)', 'Takbeer of Tashreeq: recite after every obligatory prayer from Fajr of 9th to Asr of 13th Dhul Hijjah'],
  },
  {
    num: 6, icon: '👋', day: 'Before Leaving', title: "Tawaf al-Wada' — Farewell Tawaf",
    color: '#E07070',
    summary: 'Perform the Farewell Tawaf before leaving Makkah.',
    details: `Tawaf al-Wada' (Farewell Tawaf) is Wajib (obligatory) for those leaving Makkah after Hajj:\n\n• Perform 7 circuits of Tawaf as your last act in Makkah\n• No Sa'i needed after this Tawaf\n• Leave Masjid al-Haram walking backwards (facing Ka'bah) — Sunnah\n• Make du'a at Multazam (the area between Black Stone and Ka'bah door)\n• Those who live in Makkah do not need Tawaf al-Wada'\n• Women in menstruation are excused from Tawaf al-Wada'`,
    dua: 'اللَّهُمَّ هَذَا الْبَيْتُ بَيْتُكَ، وَالْعَبْدُ عَبْدُكَ، وَقَدْ خَرَجْنَا مِنَ الإِيمَانِ، إِنْ لَمْ تَحُلْ بَيْنَنَا وَبَيْنَ هَذَا الْبَيْتِ',
    duaTranslit: 'Allahumma hadhal baytu baytuk, wal-\'abdu \'abduk, wa qad kharajna minal-iman, in lam tahul baynana wa bayna hadhal-bayt.',
    duaMeaning: 'O Allah, this House is Your House, and the servant is Your servant. We have left in faith — do not place a barrier between us and this House.',
    tips: ['Visit Masjid al-Nabawi (Prophet\'s Mosque ﷺ) in Madinah before or after Hajj', 'Visiting the Prophet\'s Mosque is not part of Hajj but is highly recommended', 'May Allah accept your Hajj Mabrur! آمين'],
  },
];

const GLOSSARY = [
  { term: 'Ihraam',        def: 'The sacred state entered before Hajj or Umrah; also the white garments worn by men.' },
  { term: 'Talbiyah',     def: 'The specific supplication recited continuously during Hajj and Umrah from Miqat until Tawaf.' },
  { term: 'Miqat',        def: 'The designated boundary points around Makkah where pilgrims must enter Ihraam.' },
  { term: 'Tawaf',        def: 'Circling the Ka\'bah seven times counter-clockwise, starting from the Black Stone.' },
  { term: "Sa'i",         def: 'Walking seven times between the hills of Safa and Marwah, commemorating Hajar\'s search for water.' },
  { term: 'Halq',         def: 'Shaving the entire head to exit Ihraam — more rewarding than Taqsir.' },
  { term: 'Taqsir',       def: 'Cutting a portion of hair (at least 2.5 cm) to exit Ihraam.' },
  { term: 'Wuquf',        def: 'Standing (presence) at the plain of Arafah — the central pillar of Hajj.' },
  { term: 'Rami',         def: 'Throwing pebbles at the Jamarat (pillars) in Mina to commemorate Ibrahim ﷺ rejecting Shaytan.' },
  { term: 'Hady',         def: 'The sacrificial animal slaughtered during Hajj in the name of Allah.' },
  { term: 'Mabrur',       def: 'An accepted, righteous Hajj. "There is no reward for Hajj Mabrur except Jannah." (Bukhari)' },
  { term: 'Multazam',     def: 'The area between the Black Stone and the door of the Ka\'bah — an area where du\'a is accepted.' },
];

// ─── Step Card (collapsible) ──────────────────────────────────────────────────
function StepCard({ step, Colors, S }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[S.stepCard, { borderLeftColor: step.color }]}>
      <TouchableOpacity style={S.stepHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.75}>
        <View style={[S.stepNumBox, { backgroundColor: step.color + '22' }]}>
          <Text style={S.stepIcon}>{step.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {step.day && <Text style={[S.stepDay, { color: step.color }]}>{step.day}</Text>}
          <Text style={S.stepTitle}>{step.num}. {step.title}</Text>
          <Text style={S.stepSummary}>{step.summary}</Text>
        </View>
        <Text style={[S.chevron, { color: step.color }]}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={S.stepBody}>
          {/* Details */}
          <Text style={S.detailText}>{step.details}</Text>

          {/* Dua */}
          <View style={[S.duaBox, { borderColor: step.color + '44', backgroundColor: step.color + '0C' }]}>
            <Text style={[S.duaLabel, { color: step.color }]}>📖 Du'a / Dhikr</Text>
            <Text style={S.duaArabic}>{step.dua}</Text>
            <Text style={S.duaTranslit}>{step.duaTranslit}</Text>
            <Text style={S.duaMeaning}>"{step.duaMeaning}"</Text>
          </View>

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <View style={S.tipsBox}>
              <Text style={S.tipsLabel}>💡 Tips</Text>
              {step.tips.map((tip, i) => (
                <View key={i} style={S.tipRow}>
                  <Text style={[S.tipBullet, { color: step.color }]}>•</Text>
                  <Text style={S.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HajjUmrahScreen({ visible, onClose }) {
  const { colors: C } = useTheme();
  const S = getStyles(C);

  const [tab,           setTab]           = useState('umrah'); // 'umrah' | 'hajj' | 'glossary'
  const [expandedAll,   setExpandedAll]   = useState(false);

  const steps = tab === 'umrah' ? UMRAH_STEPS : HAJJ_DAYS;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={S.container} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity style={S.headerBtn} onPress={onClose}>
            <Text style={S.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.headerTitle}>🕋 Hajj & Umrah Guide</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Tab bar */}
        <View style={S.tabBar}>
          {[
            { key: 'umrah',    label: 'Umrah',   icon: '🕌' },
            { key: 'hajj',     label: 'Hajj',    icon: '🕋' },
            { key: 'glossary', label: 'Glossary', icon: '📚' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[S.tabItem, tab === t.key && S.tabItemActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={S.tabIcon}>{t.icon}</Text>
              <Text style={[S.tabLabel, tab === t.key && S.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

          {/* ── UMRAH tab ── */}
          {tab === 'umrah' && (
            <>
              <View style={S.heroCard}>
                <Text style={S.heroTitle}>Umrah Guide</Text>
                <Text style={S.heroSub}>
                  The minor pilgrimage — can be performed at any time of year.
                  4 main steps · Approximately 3–5 hours
                </Text>
                <View style={S.heroStats}>
                  <View style={S.heroStat}><Text style={S.heroStatNum}>4</Text><Text style={S.heroStatLabel}>Steps</Text></View>
                  <View style={S.heroStatDiv} />
                  <View style={S.heroStat}><Text style={S.heroStatNum}>7</Text><Text style={S.heroStatLabel}>Tawaf rounds</Text></View>
                  <View style={S.heroStatDiv} />
                  <View style={S.heroStat}><Text style={S.heroStatNum}>7</Text><Text style={S.heroStatLabel}>Sa'i rounds</Text></View>
                </View>
              </View>
              {UMRAH_STEPS.map(step => (
                <StepCard key={step.num} step={step} Colors={C} S={S} />
              ))}
            </>
          )}

          {/* ── HAJJ tab ── */}
          {tab === 'hajj' && (
            <>
              <View style={[S.heroCard, { borderColor: '#C9A84C44' }]}>
                <Text style={S.heroTitle}>Hajj Guide</Text>
                <Text style={S.heroSub}>
                  The 5th pillar of Islam — obligatory once in a lifetime for
                  every able Muslim. Performed in Dhul Hijjah.
                </Text>
                <View style={S.heroStats}>
                  <View style={S.heroStat}><Text style={S.heroStatNum}>5</Text><Text style={S.heroStatLabel}>Days</Text></View>
                  <View style={S.heroStatDiv} />
                  <View style={S.heroStat}><Text style={S.heroStatNum}>3</Text><Text style={S.heroStatLabel}>Holy sites</Text></View>
                  <View style={S.heroStatDiv} />
                  <View style={S.heroStat}><Text style={S.heroStatNum}>49+</Text><Text style={S.heroStatLabel}>Pebbles</Text></View>
                </View>
              </View>
              <View style={S.infoStrip}>
                <Text style={S.infoStripIcon}>ℹ️</Text>
                <Text style={S.infoStripText}>
                  Tap any day card to expand the full ritual guide and du'a.
                </Text>
              </View>
              {HAJJ_DAYS.map(step => (
                <StepCard key={step.num} step={step} Colors={C} S={S} />
              ))}
            </>
          )}

          {/* ── GLOSSARY tab ── */}
          {tab === 'glossary' && (
            <>
              <View style={S.heroCard}>
                <Text style={S.heroTitle}>Key Terms</Text>
                <Text style={S.heroSub}>Important Islamic terms related to Hajj and Umrah.</Text>
              </View>
              <View style={S.glossaryCard}>
                {GLOSSARY.map((g, i) => (
                  <View key={i} style={[S.glossaryRow, i < GLOSSARY.length - 1 && S.glossaryBorder]}>
                    <Text style={S.glossaryTerm}>{g.term}</Text>
                    <Text style={S.glossaryDef}>{g.def}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Important note */}
          <View style={S.noteCard}>
            <Text style={S.noteIcon}>📌</Text>
            <Text style={S.noteText}>
              This guide follows the Hanafi, Shafi'i, and Maliki schools of thought.
              Minor differences exist between madhabs. Always consult a qualified scholar
              for your specific situation.
            </Text>
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
  scroll:    { paddingHorizontal: 16, paddingTop: 12 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: C.text },
  headerBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardLight, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 15, color: C.textSecondary },

  // Tab bar
  tabBar:         { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16 },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabItemActive:  { borderBottomColor: C.primary },
  tabIcon:        { fontSize: 16 },
  tabLabel:       { fontSize: 11, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.3 },
  tabLabelActive: { color: C.primary },

  // Hero card
  heroCard:    { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  heroTitle:   { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
  heroSub:     { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 16 },
  heroStats:   { flexDirection: 'row', alignItems: 'center' },
  heroStat:    { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 26, fontWeight: '900', color: C.primary },
  heroStatLabel:{ fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },
  heroStatDiv: { width: 1, height: 30, backgroundColor: C.divider },

  // Info strip
  infoStrip:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary + '14', borderRadius: 12, padding: 12, marginBottom: 12 },
  infoStripIcon: { fontSize: 16 },
  infoStripText: { fontSize: 12, color: C.textSecondary, flex: 1, lineHeight: 18 },

  // Step cards
  stepCard:    { backgroundColor: C.card, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, overflow: 'hidden' },
  stepHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  stepNumBox:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepIcon:    { fontSize: 22 },
  stepDay:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  stepTitle:   { fontSize: 15, fontWeight: '700', color: C.text },
  stepSummary: { fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 },
  chevron:     { fontSize: 12, fontWeight: '700', paddingLeft: 4 },

  // Step body (expanded)
  stepBody:    { paddingHorizontal: 16, paddingBottom: 16 },
  detailText:  { fontSize: 13, color: C.text, lineHeight: 22, marginBottom: 14 },

  // Dua box
  duaBox:        { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 8 },
  duaLabel:      { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  duaArabic:     { fontSize: 20, color: C.text, textAlign: 'right', lineHeight: 36, fontWeight: '400' },
  duaTranslit:   { fontSize: 13, color: C.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  duaMeaning:    { fontSize: 12, color: C.textMuted, lineHeight: 19 },

  // Tips
  tipsBox:    { gap: 6 },
  tipsLabel:  { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  tipRow:     { flexDirection: 'row', gap: 8 },
  tipBullet:  { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  tipText:    { fontSize: 13, color: C.textSecondary, lineHeight: 19, flex: 1 },

  // Glossary
  glossaryCard:  { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
  glossaryRow:   { paddingVertical: 12 },
  glossaryBorder:{ borderBottomWidth: 1, borderBottomColor: C.divider },
  glossaryTerm:  { fontSize: 15, fontWeight: '700', color: C.primary, marginBottom: 4 },
  glossaryDef:   { fontSize: 13, color: C.textSecondary, lineHeight: 20 },

  // Note
  noteCard:  { flexDirection: 'row', gap: 10, backgroundColor: C.cardLight, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  noteIcon:  { fontSize: 16 },
  noteText:  { fontSize: 12, color: C.textMuted, lineHeight: 19, flex: 1 },
});
