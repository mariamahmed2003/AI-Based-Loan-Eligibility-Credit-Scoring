// context/ThemeContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
});

const THEME_KEY = '@app_theme';

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((val) => {
        if (val !== null) setIsDark(val === 'dark');
      })
      .catch(() => {});
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch (e) {
      console.error('ThemeContext: failed to persist theme', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};