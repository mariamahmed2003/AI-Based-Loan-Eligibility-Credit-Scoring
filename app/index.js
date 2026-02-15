// app/index.js
// ═══════════════════════════════════════════════════════════════
// SPLASH SCREEN - First screen shown when app launches
// Checks if user is logged in and redirects accordingly
// Animated logo with scale + opacity (inspired by Flutter version)
// ═══════════════════════════════════════════════════════════════

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import FirebaseService from '../services/FirebaseService';
import COLORS from '../utils/colors';

// ─────────────────────────────────────────────
// SVG LOGO COMPONENT
// AI Loan / Credit Scoring themed icon:
//   • Shield shape  →  trust / security
//   • Rising arrow  →  credit score going up
//   • "AI" text     →  artificial intelligence
// ─────────────────────────────────────────────
const LogoSVG = ({ size = 140 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Defs>
      {/* Gradient for the shield */}
      <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor={COLORS.primary} />
        <Stop offset="100%" stopColor={COLORS.accent} />
      </LinearGradient>
      {/* Subtle glow behind shield */}
      <LinearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.35" />
        <Stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
      </LinearGradient>
    </Defs>

    {/* Outer glow circle */}
    <Circle cx="50" cy="52" r="44" fill="url(#glowGrad)" />

    {/* Shield body */}
    <Path
      d="M50 8 L82 24 L82 52 C82 72 68 88 50 95 C32 88 18 72 18 52 L18 24 Z"
      fill="url(#shieldGrad)"
    />

    {/* Inner shield border (lighter) */}
    <Path
      d="M50 16 L75 29 L75 51 C75 67 63 81 50 87 C37 81 25 67 25 51 L25 29 Z"
      fill="none"
      stroke={COLORS.secondary}
      strokeWidth="1.5"
      strokeOpacity="0.45"
    />

    {/* Rising trend arrow (bottom-left → top-right) */}
    <G>
      {/* Trend line segments */}
      <Path
        d="M30 68 L40 58 L52 63 L65 44"
        stroke={COLORS.white}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrow head */}
      <Path
        d="M60 40 L65 44 L60 48"
        stroke={COLORS.white}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Data dots on the line */}
      <Circle cx="30" cy="68" r="2.5" fill={COLORS.white} />
      <Circle cx="40" cy="58" r="2.5" fill={COLORS.white} />
      <Circle cx="52" cy="63" r="2.5" fill={COLORS.white} />
      <Circle cx="65" cy="44" r="2.5" fill={COLORS.accent} />
    </G>

    {/* "AI" label – small badge bottom-right of shield */}
    <Circle cx="73" cy="78" r="11" fill={COLORS.accent} />
    <SvgText
      x="73"
      y="83"
      textAnchor="middle"
      fontSize="11"
      fontWeight="bold"
      fill={COLORS.white}
    >
      AI
    </SvgText>
  </Svg>
);

// ─────────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────────
const SplashScreen = () => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Animation values (mirror Flutter's _scaleAnimation & _opacityAnimation)
  const scaleAnim = useRef(new Animated.Value(0.4)).current;   // start small
  const opacityAnim = useRef(new Animated.Value(0)).current;   // start invisible
  const taglineOpacity = useRef(new Animated.Value(0)).current; // staggered

  // ── Run entrance animation once on mount ──
  useEffect(() => {
    Animated.sequence([
      // 1. Scale + Opacity together (easeOutBack feel via overshoot)
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,        // lower = more overshoot (like easeOutBack)
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 2. Staggered: tagline fades in after logo settles
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Auth check (increased loading time to 3.5s) ──
  useEffect(() => {
    const unsubscribe = FirebaseService.onAuthStateChange((user) => {
      setTimeout(() => {
        if (user) {
          console.log('✅ User is logged in, navigating to home');
          router.replace('/main/home');
        } else {
          console.log('ℹ️ No user logged in, navigating to welcome');
          router.replace('/Auth/welcomescreen');
        }
        setIsChecking(false);
      }, 3500); // ✓ increased from 2500ms to 3500ms (3.5 seconds)
    });
    return () => unsubscribe();
  }, []);

  // ── Animated style objects ──
  const logoAnimatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  const taglineAnimatedStyle = {
    opacity: taglineOpacity,
  };

  return (
    <View style={styles.container}>
      {/* ── Background decorative circles (depth) ── */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

      {/* ── Animated Logo Block (ALWAYS VISIBLE - no conditional rendering) ── */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        {/* White card behind SVG logo - LARGER */}
        <View style={styles.logoCard}>
          <LogoSVG size={140} />
        </View>

        {/* App name - LARGER */}
        <Text style={styles.appName}>LoanEligibility</Text>

        {/* Tagline – staggered fade - LARGER & WHITE */}
        <Animated.Text style={[styles.appTagline, taglineAnimatedStyle]}>
          AI-Powered Credit Scoring
        </Animated.Text>
      </Animated.View>

      {/* ── Loading indicator (appears below logo) ── */}
      {isChecking && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Initialising…</Text>
        </View>
      )}

      {/* ── Version ── */}
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root ──
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,          // #1B5E4F
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    overflow: 'hidden',
  },

  // ── Decorative background circles ──
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    opacity: 0.07,
  },
  bgCircle1: {
    width: 280,
    height: 280,
    top: -100,
    right: -80,
  },
  bgCircle2: {
    width: 200,
    height: 200,
    bottom: -60,
    left: -70,
  },

  // ── Logo group ──
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  // ── White rounded card behind SVG - LARGER ──
  logoCard: {
    width: 180,                                // ✓ increased from 140 to 180
    height: 180,                               // ✓ increased from 140 to 180
    borderRadius: 40,                          // slightly larger radius
    backgroundColor: COLORS.cardBackground,    // #FFFFFF
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,                          // ✓ increased spacing
    boxShadow: '0px 8px 26px rgba(27, 94, 79, 0.3)',
  },

  // ── Text - LARGER SIZES ──
  appName: {
    fontSize: 36,                              // ✓ increased from 30 to 36
    fontWeight: 'bold',
    color: '#FFFFFF',                          // ✓ EXPLICIT WHITE COLOR
    letterSpacing: 0.5,
    marginBottom: 10,                          // ✓ increased spacing
  },
  appTagline: {
    fontSize: 17,                              // ✓ increased from 15 to 17
    color: '#FFFFFF',                          // ✓ CHANGED TO WHITE from COLORS.secondary
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.9,                              // slight transparency for elegance
  },

  // ── Loading ──
  loadingContainer: {
    position: 'absolute',
    bottom: 110,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',                          // ✓ explicit white
    marginTop: 10,
    fontSize: 13,
    opacity: 0.75,
    letterSpacing: 1,
  },

  // ── Version ──
  versionText: {
    position: 'absolute',
    bottom: 36,
    color: '#FFFFFF',                          // ✓ explicit white
    opacity: 0.45,
    fontSize: 12,
    letterSpacing: 0.8,
  },
});

export default SplashScreen;