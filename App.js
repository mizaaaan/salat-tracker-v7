import React, { useEffect } from 'react';
import { Image, Platform, useWindowDimensions } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';

import HomeScreen    from './src/screens/HomeScreen';
import QiblaScreen   from './src/screens/QiblaScreen';
import ToolsScreen   from './src/screens/ToolsScreen';
import QuranScreen   from './src/screens/QuranScreen';
import DuaScreen     from './src/screens/DuaScreen';
import { ThemeProvider, useTheme } from './src/constants/ThemeContext';
// Registers the background task (must be imported at module scope so the
// native background runtime can find TaskManager.defineTask below).
import { registerPrayerBackgroundTask } from './src/utils/backgroundTasks';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();

// Identical to original
const TabIcon = ({ source, color }) => (
  <Image
    source={source}
    style={{ width: 24, height: 24, tintColor: color, resizeMode: 'contain' }}
  />
);

function Navigation() {
  const { colors: Colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: Colors.background,
      card:       Colors.card,
      border:     Colors.border,
      text:       Colors.text,
      primary:    Colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor:  Colors.border,
            borderTopWidth:  1,
            shadowColor:     '#000',
            shadowOffset:    { width: 0, height: -2 },
            shadowOpacity:   0.06,
            shadowRadius:    6,
            elevation:       8,
            // Removed position:'absolute' Ã¢ÂÂ it caused the tab bar to float
            // over screen content. React Navigation could not reserve space
            // for it, so the last ~88px of every scroll screen was hidden
            // behind the tab bar (icons still visible, text cut off).
            height: Platform.OS === 'ios' ? (isLandscape ? 70 : 88) : 60,
            paddingTop: 8,
          },
          tabBarActiveTintColor:   Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarShowLabel:    true,
          tabBarLabelStyle: {
            fontSize:      10,
            fontWeight:    '600',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tab.Screen name="Prayer Times" component={HomeScreen}
          options={{ tabBarIcon: ({ color }) => <TabIcon source={require('./assets/prayertime.png')} color={color} /> }} />
        <Tab.Screen name="Qibla" component={QiblaScreen}
          options={{ tabBarIcon: ({ color }) => <TabIcon source={require('./assets/qibla.png')} color={color} /> }} />
        <Tab.Screen name="Tools" component={ToolsScreen}
          options={{ tabBarIcon: ({ color }) => <TabIcon source={require('./assets/tools.png')} color={color} /> }} />
        <Tab.Screen name="Quran" component={QuranScreen}
          options={{ tabBarIcon: ({ color }) => <TabIcon source={require('./assets/quran.png')} color={color} /> }} />
        <Tab.Screen name="Dua" component={DuaScreen}
          options={{ tabBarIcon: ({ color }) => <TabIcon source={require('./assets/dua.png')} color={color} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'AmiriQuran': require('./assets/fonts/AmiriQuran-Regular.ttf'),
    'MeQuranVolt': require('./assets/fonts/me_quran_volt_newmet.ttf'),
    'QPCHafs': require('./assets/fonts/QPC_Hafs_font.ttf'),
    'UthmanicHafsV22': require('./assets/fonts/UthmanicHafs_V22.ttf'),
  });

  useEffect(() => {
    registerPrayerBackgroundTask();
  }, []);

  // Render nothing until the custom font is ready — avoids a flash of
  // unstyled text on the very first frame.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
