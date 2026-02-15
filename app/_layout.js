import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import COLORS from '../utils/colors';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  
  useEffect(() => {
    // Hide native splash screen after component mounts
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500); 
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        {/* Splash/Initial Screen */}
        <Stack.Screen name="index" />

        {/* Auth Group */}
        <Stack.Screen name="Auth/welcomescreen" />
        <Stack.Screen name="Auth/signupscreen" />
        <Stack.Screen name="Auth/signinscreen" />

        {/* The Main App (Tabs) */}
        {/* Crucial: name must match the folder 'main' */}
        <Stack.Screen name="main" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}