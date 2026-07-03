import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext({
  colors: darkColors,
  isDark: true,
  scheme:  'dark',
});

/**
 * Wrap the app in this once (in App.js). It reads the iPhone's
 * Settings > Display & Brightness > Light/Dark setting via
 * useColorScheme() and re-renders the whole tree whenever the
 * user flips it — including automatically at sunset if they use
 * "Automatic" on iOS.
 */
export const ThemeProvider = ({ children }) => {
  const scheme = useColorScheme(); // 'light' | 'dark' | null

  const value = useMemo(() => {
    const isDark = scheme !== 'light'; // unknown/null falls back to dark
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      scheme: isDark ? 'dark' : 'light',
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** Call inside any screen/component: const { colors } = useTheme(); */
export const useTheme = () => useContext(ThemeContext);
