import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../config/firebaseConfig'; // Double check this path
import COLORS from '../utils/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [user, setUser] = useState(undefined); // undefined means "still loading"
  const segments = useSegments();
  const router = useRouter();

  // 1. Listen for Auth State changes globally
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Root Layout Auth State:", user ? "Logged In" : "Logged Out");
      setUser(user);
      SplashScreen.hideAsync();
    });
    return unsubscribe;
  }, []);

  // 2. Protect Routes
  useEffect(() => {
    if (user === undefined) return; // Wait until Firebase responds

    const inAuthGroup = segments[0] === 'Auth';
    const isSplash = segments.length === 0 || segments[0] === 'index';

    if (!user && !inAuthGroup && !isSplash) {
      // Not logged in? Force to Welcome
      router.replace('/Auth/welcomescreen');
    } else if (user && (inAuthGroup || isSplash)) {
      // Logged in? Force to Home
      router.replace('/main/home');
    }
  }, [user, segments]);

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Auth/welcomescreen" />
        <Stack.Screen name="Auth/signupscreen" />
        <Stack.Screen name="Auth/signinscreen" />
        <Stack.Screen name="main" />
      </Stack>
    </>
  );
}