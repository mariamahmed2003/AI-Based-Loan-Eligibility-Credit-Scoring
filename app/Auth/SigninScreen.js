// app/signin.js
// ═══════════════════════════════════════════════════════════════
// SIGN IN SCREEN - Handled with SignUp Design & Functionality
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

  // Added state for password visibility toggle to match SignUp logic
  const [showPassword, setShowPassword] = useState(false);

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

  const handleGoogleSignIn = () => {
    Alert.alert('Google Sign In', 'Google authentication coming soon.');
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

          {/* ── Sign In Button (inline, no CustomButton) ── */}
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
          style={styles.googleButton} 
          onPress={handleGoogleSignIn}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
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
    height: 58 
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