// app/Auth/welcomescreen.js
// ═══════════════════════════════════════════════════════════════
// WELCOME SCREEN – Shown to users who are not logged in
// Bright gradient hero · Animated logo · Staggered feature cards
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import COLORS from '../../utils/colors';

// ─────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────
const P = {
  ...COLORS,
  heroTop: '#145A4A',
  heroBot: '#1B8A6F',
  glow: '#3FD9A8',
  cardShadow: 'rgba(27, 94, 79, 0.18)',
};

// ─────────────────────────────────────────────────────────────
// SVG LOGO
// ─────────────────────────────────────────────────────────────
const LogoSVG = ({ size = 140 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Defs>
      <LinearGradient id="shG" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#145A4A" />
        <Stop offset="100%" stopColor="#2DBE94" />
      </LinearGradient>
      <LinearGradient id="glG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#3FD9A8" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#3FD9A8" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="52" r="44" fill="url(#glG)" />
    <Path
      d="M50 8 L82 24 L82 52 C82 72 68 88 50 95 C32 88 18 72 18 52 L18 24 Z"
      fill="url(#shG)"
    />
    <Path
      d="M50 16 L75 29 L75 51 C75 67 63 81 50 87 C37 81 25 67 25 51 L25 29 Z"
      fill="none"
      stroke="#A7D7C5"
      strokeWidth="1.4"
      strokeOpacity="0.5"
    />
    <Path
      d="M30 68 L40 58 L52 63 L65 44"
      stroke="#FFFFFF"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M60 40 L65 44 L60 48"
      stroke="#FFFFFF"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle cx="30" cy="68" r="2.5" fill="#FFFFFF" />
    <Circle cx="40" cy="58" r="2.5" fill="#FFFFFF" />
    <Circle cx="52" cy="63" r="2.5" fill="#FFFFFF" />
    <Circle cx="65" cy="44" r="2.5" fill="#3FD9A8" />
    <Circle cx="73" cy="78" r="11" fill="#3FD9A8" />
    <SvgText x="73" y="83" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#FFFFFF">
      AI
    </SvgText>
  </Svg>
);

// ─────────────────────────────────────────────────────────────
// FEATURE CARD
// ─────────────────────────────────────────────────────────────
const FeatureItem = ({ icon, title, description, animatedStyle }) => (
  <Animated.View style={[styles.featureCard, animatedStyle]}>
    <View style={styles.featureIconWrap}>
      <Ionicons name={icon} size={22} color={P.accent} />
    </View>
    <View style={styles.featureTextWrap}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={18} color={P.secondary} />
  </Animated.View>
);

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: 'calculator-outline',
    title: 'Credit Score Estimation',
    description: 'Instant credit score calculations based on your financial data.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Loan Recommendations',
    description: 'Personalised loan options tailored to your profile.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Risk Assessment',
    description: 'Understand your financial risk with clear visualisations.',
  },
  {
    icon: 'analytics-outline',
    title: 'AI-Powered Insights',
    description: 'Explainable AI decisions to boost your eligibility.',
  },
];

// ─────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────
const WelcomeScreen = () => {
  const router = useRouter();

  const logoScale     = useRef(new Animated.Value(0.3)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const titleOpacity  = useRef(new Animated.Value(0)).current;
  const featureAnims  = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const featureSlides = useRef(FEATURES.map(() => new Animated.Value(30))).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.stagger(
        100,
        featureAnims.map((anim, i) =>
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(featureSlides[i], { toValue: 0, duration: 380, useNativeDriver: true }),
          ])
        )
      ),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const logoAnimStyle   = { transform: [{ scale: logoScale }], opacity: logoOpacity };
  const titleAnimStyle  = { opacity: titleOpacity };
  const buttonAnimStyle = { opacity: buttonOpacity };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ══ HERO ══ */}
      <View style={styles.hero}>
        <View style={[styles.decCircle, styles.decCircle1]} />
        <View style={[styles.decCircle, styles.decCircle2]} />

        {/* Logo – centered, bigger */}
        <Animated.View style={[styles.logoOuter, logoAnimStyle]}>
          <View style={styles.logoCard}>
            <LogoSVG size={140} />
          </View>
        </Animated.View>

        {/* Title + subtitle */}
        <Animated.View style={[styles.titleBlock, titleAnimStyle]}>
          <Text style={styles.appTitle} numberOfLines={1} adjustsFontSizeToFit>
            Welcome to AI Loan Eligibility
          </Text>
          <Text style={styles.heroSubtitle}>
            Predict your loan approval probability with AI-powered credit scoring
          </Text>
        </Animated.View>
      </View>

      {/* ══ FEATURES ══ */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionLabel}>What we offer</Text>
        {FEATURES.map((f, i) => (
          <FeatureItem
            key={i}
            icon={f.icon}
            title={f.title}
            description={f.description}
            animatedStyle={{
              opacity: featureAnims[i],
              transform: [{ translateY: featureSlides[i] }],
            }}
          />
        ))}
      </View>

      {/* ══ BUTTONS ══ */}
      <Animated.View style={[styles.buttonsWrap, buttonAnimStyle]}>
        {/* Get Started – white bg, colored text */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/Auth/signupscreen')}
          activeOpacity={0.82}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </TouchableOpacity>

        {/* Already have account – colored bg, white text, white border */}
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => router.push('/Auth/signinscreen')}
          activeOpacity={0.75}
        >
          <Text style={styles.btnOutlineText}>I Already Have an Account</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ══ FOOTER ══ */}
      <Text style={styles.footerText}>
        By continuing, you agree to our{' '}
        <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
        <Text style={styles.footerLink}>Privacy Policy</Text>
      </Text>
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  /* ── root ── */
  root: {
    flex: 1,
    backgroundColor: P.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ════════════════════════════════════════════
     HERO
     ════════════════════════════════════════════ */
  hero: {
    backgroundColor: P.heroTop,
    paddingTop: 68,
    paddingBottom: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  /* bg decoration circles */
  decCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: P.glow,
  },
  decCircle1: {
    width: 220,
    height: 220,
    opacity: 0.12,
    top: -80,
    right: -60,
  },
  decCircle2: {
    width: 140,
    height: 140,
    opacity: 0.08,
    bottom: -50,
    left: -40,
  },

  /* ── Logo – even bigger card ── */
  logoOuter: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoCard: {
    width: 180,
    height: 180,
    borderRadius: 40,
    backgroundColor: P.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 8px 26px rgba(27, 94, 79, 0.34)',
  },

  /* ── Title block ── */
  titleBlock: {
    alignItems: 'center',
    width: '100%',
  },
  // App name – bigger, WHITE color (explicit #FFFFFF)
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',              // ✓ EXPLICIT WHITE COLOR
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 12,
  },
  // Description – bigger, WHITE color (explicit #FFFFFF)
  heroSubtitle: {
    fontSize: 17,
    color: '#FFFFFF',              // ✓ EXPLICIT WHITE COLOR
    textAlign: 'center',
    lineHeight: 25,
    paddingHorizontal: 10,
    opacity: 0.9,
  },

  /* ════════════════════════════════════════════
     FEATURES
     ════════════════════════════════════════════ */
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: P.accent,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: P.border,
    boxShadow: '0px 2px 8px rgba(27, 94, 79, 0.10)',
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: P.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: P.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: P.textLight,
    lineHeight: 17,
  },

  /* ════════════════════════════════════════════
     BUTTONS
     ── Get Started      → white bg, accent text
     ── Already have acc → accent bg (#2DBE94),
                            WHITE text (#FFFFFF),
                            WHITE border (#FFFFFF)
     ════════════════════════════════════════════ */
  buttonsWrap: {
    paddingHorizontal: 40,
    paddingTop: 22,
    paddingBottom: 6,
  },

  /* Get Started – white bg, colored text */
  btnPrimary: {
    backgroundColor: P.white,
    height: 44,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0px 4px 12px rgba(27, 94, 79, 0.22)',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: P.accent,
    letterSpacing: 0.4,
  },

  /* Already have account – colored bg + WHITE border + WHITE text */
  btnOutline: {
    backgroundColor: P.accent,     // #2DBE94 – colored background
    height: 44,
    borderRadius: 30,
    borderWidth: 2,                // ✓ Increased to 2px for better visibility
    borderColor: '#FFFFFF',        // ✓ EXPLICIT WHITE BORDER
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',              // ✓ EXPLICIT WHITE TEXT
    letterSpacing: 0.3,
  },

  /* ── FOOTER ── */
  footerText: {
    fontSize: 12,
    color: P.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 36,
    lineHeight: 19,
  },
  footerLink: {
    color: P.accent,
    fontWeight: '600',
  },
});

export default WelcomeScreen;