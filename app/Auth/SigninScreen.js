// app/signin.js
// ═══════════════════════════════════════════════════════════════
// SIGN IN SCREEN - Handled with SignUp Design & Functionality
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import FirebaseService from '../../services/FirebaseService';
import { validateEmail, validatePassword } from '../../utils/validators';

// Required so the browser redirects back to the app after Google auth
WebBrowser.maybeCompleteAuthSession();

const COLORS = {
  primary: '#0A2540',       // Navy Blue
  secondary: '#1F6AE1',     // Royal Blue
  accent: '#2ECC71',        // Emerald Green
  background: '#F5F7FA',    // Off-White
  cardBackground: '#FFFFFF',// Pure White
  text: '#2C2C2C',          // Dark Gray
  textLight: '#6B7280',     // Light Gray
  textWhite: '#FFFFFF',
  border: '#E5E7EB',
  error: '#FF3B30',         // Error Red
};

const SignInScreen = () => {
  const router = useRouter();

  // Form & UI State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Added state for password visibility toggle to match SignUp logic
  const [showPassword, setShowPassword] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Google Auth Setup
  //
  // Replace the placeholder strings below with your real Client IDs.
  //
  // HOW TO GET YOUR CLIENT IDs:
  //  1. Go to https://console.cloud.google.com
  //  2. Select your Firebase project → APIs & Services → Credentials
  //  3. Create OAuth 2.0 Client IDs for:
  //       • Web application   → paste as webClientId
  //       • Android           → paste as androidClientId
  //       • iOS               → paste as iosClientId
  //  4. For Expo Go testing:
  //       • Use the Web client ID as expoClientId  OR
  //       • Create an "Expo" client type if available
  //
  // Also add to app.json under "expo" → "scheme": "your-app-scheme"
  // This is required for the redirect to work on mobile.
  // ─────────────────────────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:   '910946341679-0sdrn2i08tg7uq3p776ec2deg6uj8ong.apps.googleusercontent.com',
    androidClientId:'910946341679-bcnvnnuik5kjbneg9gai1pnps09fret0.apps.googleusercontent.com',
    iosClientId:    '910946341679-atfofuk0hca05q8le503s3il9311s7g9.apps.googleusercontent.com',
    webClientId:    '910946341679-0sdrn2i08tg7uq3p776ec2deg6uj8ong.apps.googleusercontent.com',
    // Forces the account chooser to always appear so the user can
    // pick from saved accounts or tap "Add another account".
    selectAccount: true,
    
  });

  // Listen for Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleCredential(authentication.accessToken);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Google Sign In Failed', response.error?.message || 'Something went wrong.');
    } else if (response?.type === 'dismiss') {
      // User closed the picker without selecting
      setGoogleLoading(false);
    }
  }, [response]);

  // Exchange Google access token with Firebase
  const handleGoogleCredential = async (accessToken) => {
    try {
      setGoogleLoading(true);

      // Sign in via FirebaseService.
      // Your FirebaseService.signInWithGoogle should:
      //   1. Build a GoogleAuthProvider credential from the accessToken
      //   2. Call signInWithCredential(auth, credential)
      //
      // Example to add inside FirebaseService.js:
      //
      //   import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
      //
      //   static async signInWithGoogle(accessToken) {
      //     try {
      //       const credential = GoogleAuthProvider.credential(null, accessToken);
      //       const result = await signInWithCredential(auth, credential);
      //       return { success: true, user: result.user };
      //     } catch (error) {
      //       return { success: false, error: error.message };
      //     }
      //   }

      const result = await FirebaseService.signInWithGoogle(accessToken);

      if (result.success) {
        router.replace('/main/home');
      } else {
        Alert.alert('Google Sign In Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during Google Sign In.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const emailVal = validateEmail(email);
    if (!emailVal.isValid) newErrors.email = emailVal.error;
    
    const passVal = validatePassword(password);
    if (!passVal.isValid) newErrors.password = passVal.error;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const result = await FirebaseService.signIn(email, password);
      if (result.success) {
        router.replace('/main/home');
      } else {
        Alert.alert('Sign In Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Opens the native Google account chooser
  const handleGoogleSignIn = async () => {
    if (!request) {
      Alert.alert('Not Ready', 'Google Sign In is initializing. Please try again.');
      return;
    }
    setGoogleLoading(true);
    await promptAsync();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation */}
        <View style={styles.navHeader}>
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
            <Ionicons name="arrow-back" size={28} color={COLORS.text} />
            </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        {/* Sign In Form */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputContainer}>
            <TextInput 
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text.toLowerCase());
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              cursorColor={COLORS.accent}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
                <TextInput 
                    style={[styles.input, errors.password && styles.inputError, { paddingRight: 55 }]}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    secureTextEntry={!showPassword}
                    cursorColor={COLORS.accent}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.iconInside}
                    activeOpacity={0.7}
                >
                    <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color={COLORS.textLight}
                    />
                </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => Alert.alert('Forgot Password', 'Reset link sent.')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* ── Sign In Button ── */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {/* Google Sign In */}
        <TouchableOpacity 
          style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]} 
          onPress={handleGoogleSignIn}
          activeOpacity={0.8}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={COLORS.textLight} size="small" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20,
    paddingBottom: 30,
  },
  navHeader: {
    height: 60,
    justifyContent: 'center',
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: COLORS.background, 
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  iconInside: {
    position: 'absolute',
    right: 20,
    height: '100%',
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 20,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginVertical: 15,
  },
  forgotPasswordText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 30,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 30, 
    height: 58,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: { 
    width: 22, 
    height: 22, 
    marginRight: 12 
  },
  googleButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000000'
  },
});

export default SignInScreen;