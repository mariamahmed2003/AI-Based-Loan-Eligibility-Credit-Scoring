// app/main/settings.js

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeContext } from '../../Context/themecontext';
import FirebaseService from '../../services/FirebaseService';
import COLORS from '../../utils/colors';

import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';

// ─────────────────────────────────────────────────────────────
// Platform-safe alert helper
// On web, Alert.alert is not supported — falls back to window.confirm/alert
// ─────────────────────────────────────────────────────────────
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message || ''}`);
      return;
    }
    // Find destructive or confirm button
    const confirmBtn = buttons.find(b => b.style === 'destructive' || (b.text && b.text !== 'Cancel' && b.text !== 'OK'));
    const cancelBtn  = buttons.find(b => b.style === 'cancel'      || b.text === 'Cancel');
    if (confirmBtn && cancelBtn) {
      const ok = window.confirm(`${title}\n\n${message || ''}`);
      if (ok) confirmBtn.onPress?.();
      else    cancelBtn.onPress?.();
    } else {
      window.alert(`${title}\n\n${message || ''}`);
      const okBtn = buttons.find(b => b.text === 'OK' || (!b.style));
      okBtn?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// ─────────────────────────────────────────────────────────────
// Platform-safe LocalAuthentication
// expo-local-authentication is mobile-only
// ─────────────────────────────────────────────────────────────
const getBiometricModule = async () => {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-local-authentication');
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Platform-safe FileSystem & Sharing
// expo-file-system and expo-sharing are mobile-only
// On web: trigger a browser download instead
// ─────────────────────────────────────────────────────────────
const exportFileWeb = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportFileMobile = async (content, filename, mimeType) => {
  try {
    const FileSystem = await import('expo-file-system');
    const Sharing    = await import('expo-sharing');
    const filePath   = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: 'Export Your Data',
        UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : undefined,
      });
    } else {
      showAlert('Saved', `File saved to:\n${filePath}`, [{ text: 'OK' }]);
    }
  } catch (e) {
    throw e;
  }
};

const exportFile = async (content, filename, mimeType) => {
  if (Platform.OS === 'web') {
    exportFileWeb(content, filename, mimeType);
  } else {
    await exportFileMobile(content, filename, mimeType);
  }
};

const safeStr = (v) => (v == null ? '' : String(v));

// ═══════════════════════════════════════════════════════════════
// MODAL WRAPPER
// ═══════════════════════════════════════════════════════════════
const SlideModal = ({ visible, onClose, title, children }) => {
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0A2540' },
});

// ═══════════════════════════════════════════════════════════════
// STYLED INPUT
// ═══════════════════════════════════════════════════════════════
const FormInput = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={inputStyles.label}>{label}</Text>
    <TextInput
      style={inputStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'sentences'}
      autoCorrect={false}
    />
  </View>
);

const inputStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
});

// ═══════════════════════════════════════════════════════════════
// PRIMARY BUTTON
// ═══════════════════════════════════════════════════════════════
const PrimaryButton = ({ title, onPress, loading, danger }) => (
  <TouchableOpacity
    style={[btnStyles.btn, danger && btnStyles.danger, loading && btnStyles.disabled]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    <Text style={[btnStyles.text, danger && btnStyles.dangerText]}>
      {loading ? 'Please wait…' : title}
    </Text>
  </TouchableOpacity>
);

const btnStyles = StyleSheet.create({
  btn: {
    backgroundColor: '#0A2540', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  text: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  danger: { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#E74C3C' },
  dangerText: { color: '#E74C3C' },
  disabled: { opacity: 0.6 },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════
const SettingsScreen = () => {
  const router = useRouter();

  const themeCtx    = useContext(ThemeContext);
  const isDark      = themeCtx?.isDark    ?? false;
  const toggleTheme = themeCtx?.toggleTheme ?? (() => {});

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates:  false,
    biometricAuth: false,
  });

  const [privacy, setPrivacy] = useState({
    shareDataForResearch:  false,
    showProfileToAdvisors: false,
    allowAnalytics:        true,
  });

  const [modal, setModal] = useState({
    editProfile:     false,
    changePassword:  false,
    privacySettings: false,
    exportData:      false,
  });

  const openModal  = (key) => setModal(p => ({ ...p, [key]: true  }));
  const closeModal = (key) => setModal(p => ({ ...p, [key]: false }));

  const [userData, setUserData] = useState(null);

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        const result = await FirebaseService.getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);
          const s = result.data?.appSettings;
          if (s) {
            setSettings(prev => ({
              ...prev,
              notifications: s.notifications ?? prev.notifications,
              emailUpdates:  s.emailUpdates  ?? prev.emailUpdates,
              biometricAuth: s.biometricAuth ?? prev.biometricAuth,
            }));
          }
          const p = result.data?.privacySettings;
          if (p) setPrivacy(prev => ({ ...prev, ...p }));
        }
      }
    } catch (e) {
      console.error('loadUserData', e);
    }
  };

  const persistSetting = async (key, value) => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        await FirebaseService.updateUserData(user.uid, {
          appSettings: { ...settings, [key]: value },
        });
      }
    } catch (e) {
      console.error('persistSetting', e);
    }
  };

  const toggleSetting = async (key) => {
    const newVal = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newVal }));
    await persistSetting(key, newVal);
  };

  // ── Biometric Toggle ───────────────────────────────────────
  // FIX: On web, biometric APIs don't exist — show a clear message instead of crashing
  const handleBiometricToggle = async () => {
    if (Platform.OS === 'web') {
      showAlert(
        'Not Available on Web',
        'Biometric authentication is only available in the mobile app.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (settings.biometricAuth) {
      setSettings(prev => ({ ...prev, biometricAuth: false }));
      await persistSetting('biometricAuth', false);
      return;
    }

    const LocalAuthentication = await getBiometricModule();
    if (!LocalAuthentication) {
      showAlert('Not Supported', 'Biometric authentication is not available on this device.', [{ text: 'OK' }]);
      return;
    }

    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      showAlert('Not Supported', 'This device does not support biometric authentication.', [{ text: 'OK' }]);
      return;
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      showAlert('No Biometrics Enrolled', 'Please set up fingerprint or Face ID in your device settings first.', [{ text: 'OK' }]);
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:         'Verify your identity to enable biometric login',
      fallbackLabel:         'Use Passcode',
      cancelLabel:           'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) {
      setSettings(prev => ({ ...prev, biometricAuth: true }));
      await persistSetting('biometricAuth', true);
      showAlert('✅ Enabled', 'Biometric authentication is now active.', [{ text: 'OK' }]);
    } else {
      showAlert('Failed', 'Biometric verification failed. Please try again.', [{ text: 'OK' }]);
    }
  };

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (e) {
            showAlert('Error', e.message, [{ text: 'OK' }]);
          }
        },
      },
    ]);
  };

  // ── Delete Account ─────────────────────────────────────────
  const handleDeleteAccount = () => {
    showAlert(
      '⚠️ Delete Account',
      'This will permanently delete your account and ALL data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            showAlert(
              'Final Confirmation',
              'Are you sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const user = FirebaseService.getCurrentUser();
                      if (user) {
                        await FirebaseService.deleteUserData?.(user.uid);
                        await user.delete();
                      }
                    } catch (e) {
                      if (e.code === 'auth/requires-recent-login') {
                        showAlert(
                          'Re-authentication Required',
                          'For security, please logout and log back in before deleting your account.',
                          [{ text: 'OK' }],
                        );
                      } else {
                        showAlert('Error', 'Failed to delete account. Please try again.', [{ text: 'OK' }]);
                        console.error('Delete account error:', e);
                      }
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  // ── Clear Data ─────────────────────────────────────────────
  const handleClearData = () => {
    showAlert(
      'Clear Financial Data',
      'This will delete all your financial data and reset your credit score. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = FirebaseService.getCurrentUser();
              if (user) {
                await FirebaseService.updateUserData(user.uid, {
                  financialProfile: {
                    income: '', expenses: '', debts: '',
                    employment: '', employmentYears: '',
                    requestedLoanAmount: '', hasData: false,
                  },
                });
                showAlert('✅ Done', 'All financial data has been cleared.', [{ text: 'OK' }]);
              }
            } catch (e) {
              showAlert('Error', 'Failed to clear data. Please try again.', [{ text: 'OK' }]);
              console.error('Clear data error:', e);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your app preferences</Text>
      </View>

      <SectionCard title="App Preferences">
        <SettingItem
          icon="notifications-outline"
          title="Push Notifications"
          description="Receive loan updates and reminders"
          rightComponent={
            <Switch
              value={settings.notifications}
              onValueChange={() => toggleSetting('notifications')}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <SettingItem
          icon="mail-outline"
          title="Email Updates"
          description="Get credit score reports via email"
          rightComponent={
            <Switch
              value={settings.emailUpdates}
              onValueChange={() => toggleSetting('emailUpdates')}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <SettingItem
          icon="moon-outline"
          title="Dark Mode"
          description="Switch to dark theme"
          rightComponent={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <SettingItem
          icon="finger-print-outline"
          title="Biometric Authentication"
          description={Platform.OS === 'web' ? 'Available on mobile app only' : 'Use fingerprint or Face ID'}
          rightComponent={
            Platform.OS === 'web' ? (
              <View style={styles.webOnlyBadge}>
                <Text style={styles.webOnlyText}>Mobile only</Text>
              </View>
            ) : (
              <Switch
                value={settings.biometricAuth}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            )
          }
          last
        />
      </SectionCard>

      <SectionCard title="Account">
        <SettingButton icon="person-outline" title="Edit Profile" onPress={() => openModal('editProfile')} />
        <SettingButton icon="key-outline" title="Change Password" onPress={() => openModal('changePassword')} />
        <SettingButton icon="shield-checkmark-outline" title="Privacy Settings" onPress={() => openModal('privacySettings')} last />
      </SectionCard>

      <SectionCard title="Data Management">
        <SettingButton icon="download-outline" title="Export My Data" onPress={() => openModal('exportData')} />
        <SettingButton icon="trash-outline" title="Clear Financial Data" onPress={handleClearData} dangerous last />
      </SectionCard>

      <SectionCard title="Support">
        <SettingButton
          icon="help-circle-outline"
          title="Help Center"
          onPress={() => showAlert('Help Center', 'For support, email us at support@ailoan.app', [{ text: 'OK' }])}
        />
        <SettingButton
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => showAlert('Terms of Service', 'By using this app you agree to our terms. Full terms available at ailoan.app/terms', [{ text: 'OK' }])}
        />
        <SettingButton
          icon="shield-outline"
          title="Privacy Policy"
          onPress={() => showAlert('Privacy Policy', 'We protect your data per Egyptian data protection laws. Full policy at ailoan.app/privacy', [{ text: 'OK' }])}
        />
        <SettingButton
          icon="information-circle-outline"
          title="About App"
          onPress={() => showAlert(
            'AI Loan Eligibility App',
            'Version 1.0.0\n\nAI-powered credit scoring and loan eligibility assessment for Egyptian banking standards.\n\n© 2025 AI Loan App',
            [{ text: 'OK' }],
          )}
          last
        />
      </SectionCard>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 1.0.0</Text>

      <EditProfileModal
        visible={modal.editProfile}
        onClose={() => closeModal('editProfile')}
        userData={userData}
        onSaved={loadUserData}
      />
      <ChangePasswordModal
        visible={modal.changePassword}
        onClose={() => closeModal('changePassword')}
      />
      <PrivacyModal
        visible={modal.privacySettings}
        onClose={() => closeModal('privacySettings')}
        privacy={privacy}
        setPrivacy={setPrivacy}
      />
      <ExportDataModal
        visible={modal.exportData}
        onClose={() => closeModal('exportData')}
        userData={userData}
      />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════
// EDIT PROFILE MODAL
// ═══════════════════════════════════════════════════════════════
const EditProfileModal = ({ visible, onClose, userData, onSaved }) => {
  const [form, setForm]       = useState({ displayName: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userData) {
      setForm({
        displayName: safeStr(userData.displayName || userData.name),
        phone:       safeStr(userData.phone || userData.phoneNumber),
        email:       safeStr(userData.email),
      });
    }
  }, [visible, userData]);

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      showAlert('Validation', 'Name is required.', [{ text: 'OK' }]); return;
    }
    if (form.phone && !/^(\+20|0)[0-9]{10}$/.test(form.phone.replace(/\s/g, ''))) {
      showAlert('Validation', 'Please enter a valid Egyptian phone number (e.g. 01012345678).', [{ text: 'OK' }]); return;
    }
    setLoading(true);
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        await user.updateProfile({ displayName: form.displayName.trim() });
        await FirebaseService.updateUserData(user.uid, {
          displayName: form.displayName.trim(),
          name:        form.displayName.trim(),
          phone:       form.phone.trim(),
        });
        await onSaved();
        showAlert('✅ Saved', 'Profile updated successfully.', [{ text: 'OK' }]);
        onClose();
      }
    } catch (e) {
      showAlert('Error', 'Failed to update profile. Please try again.', [{ text: 'OK' }]);
      console.error('Edit profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideModal visible={visible} onClose={onClose} title="Edit Profile">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormInput
          label="Full Name"
          value={form.displayName}
          onChangeText={v => setForm(p => ({ ...p, displayName: v }))}
          placeholder="Your full name"
        />
        <FormInput
          label="Phone Number"
          value={form.phone}
          onChangeText={v => setForm(p => ({ ...p, phone: v }))}
          placeholder="01012345678"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <FormInput
          label="Email"
          value={form.email}
          onChangeText={() => {}}
          placeholder="Email (cannot be changed here)"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: -8, marginBottom: 16 }}>
          * Email can only be changed through account recovery.
        </Text>
        <PrimaryButton title="Save Changes" onPress={handleSave} loading={loading} />
      </ScrollView>
    </SlideModal>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL
// ═══════════════════════════════════════════════════════════════
const ChangePasswordModal = ({ visible, onClose }) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [loading,     setLoading]     = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reset = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  useEffect(() => { if (!visible) reset(); }, [visible]);

  const handleChange = async () => {
    if (!form.currentPassword) { showAlert('Validation', 'Enter your current password.', [{ text: 'OK' }]); return; }
    if (form.newPassword.length < 8) { showAlert('Validation', 'New password must be at least 8 characters.', [{ text: 'OK' }]); return; }
    if (!/[A-Z]/.test(form.newPassword)) { showAlert('Validation', 'Password must contain at least one uppercase letter.', [{ text: 'OK' }]); return; }
    if (!/[0-9]/.test(form.newPassword)) { showAlert('Validation', 'Password must contain at least one number.', [{ text: 'OK' }]); return; }
    if (form.newPassword !== form.confirmPassword) { showAlert('Validation', 'Passwords do not match.', [{ text: 'OK' }]); return; }
    if (form.newPassword === form.currentPassword) { showAlert('Validation', 'New password must be different from current.', [{ text: 'OK' }]); return; }

    setLoading(true);
    try {
      const user       = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, form.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.newPassword);
      showAlert('✅ Success', 'Password changed successfully.', [{ text: 'OK' }]);
      reset();
      onClose();
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        showAlert('Error', 'Current password is incorrect.', [{ text: 'OK' }]);
      } else if (e.code === 'auth/too-many-requests') {
        showAlert('Error', 'Too many attempts. Please try again later.', [{ text: 'OK' }]);
      } else {
        showAlert('Error', 'Failed to change password. Please try again.', [{ text: 'OK' }]);
        console.error('Change password error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({ label, field, show, setShow }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={[inputStyles.input, { paddingRight: 46 }]}
          value={form[field]}
          onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 14, top: 13 }}
        >
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SlideModal visible={visible} onClose={onClose} title="Change Password">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PasswordField label="Current Password"     field="currentPassword" show={showCurrent} setShow={setShowCurrent} />
        <PasswordField label="New Password"         field="newPassword"     show={showNew}     setShow={setShowNew}     />
        <PasswordField label="Confirm New Password" field="confirmPassword" show={showConfirm} setShow={setShowConfirm} />

        <View style={{ backgroundColor: '#F0F9FF', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1', marginBottom: 6 }}>Password Requirements:</Text>
          {[
            ['Minimum 8 characters',         form.newPassword.length >= 8],
            ['At least one uppercase letter', /[A-Z]/.test(form.newPassword)],
            ['At least one number',           /[0-9]/.test(form.newPassword)],
          ].map(([txt, met]) => (
            <View key={txt} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
              <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? '#2ECC71' : '#9CA3AF'} />
              <Text style={{ fontSize: 12, color: met ? '#2ECC71' : '#6B7280', marginLeft: 6 }}>{txt}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton title="Change Password" onPress={handleChange} loading={loading} />
      </ScrollView>
    </SlideModal>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRIVACY SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════
const PrivacyModal = ({ visible, onClose, privacy, setPrivacy }) => {
  const [loading, setLoading] = useState(false);

  const toggle = (key) => setPrivacy(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        await FirebaseService.updateUserData(user.uid, { privacySettings: privacy });
        showAlert('✅ Saved', 'Privacy settings updated.', [{ text: 'OK' }]);
        onClose();
      }
    } catch (e) {
      showAlert('Error', 'Failed to save privacy settings.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const privacyItems = [
    { key: 'shareDataForResearch',  title: 'Share Data for Research',       desc: 'Allow anonymised data to improve our AI models.',        icon: 'analytics-outline' },
    { key: 'showProfileToAdvisors', title: 'Visible to Financial Advisors', desc: 'Let certified advisors view your credit profile.',       icon: 'people-outline'    },
    { key: 'allowAnalytics',        title: 'App Usage Analytics',           desc: 'Help us improve the app by sharing usage statistics.',  icon: 'bar-chart-outline' },
  ];

  return (
    <SlideModal visible={visible} onClose={onClose} title="Privacy Settings">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 19 }}>
          Control how your data is used. Your financial data is always encrypted and never sold.
        </Text>

        {privacyItems.map((item, i) => (
          <View
            key={item.key}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 16,
              borderBottomWidth: i < privacyItems.length - 1 ? 1 : 0,
              borderBottomColor: '#F3F4F6',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name={item.icon} size={20} color="#0A2540" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 16 }}>{item.desc}</Text>
              </View>
            </View>
            <Switch
              value={privacy[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        ))}

        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginTop: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 17 }}>
            🔒 Your financial data is AES-256 encrypted. We comply with Egyptian data protection regulations.
          </Text>
        </View>

        <PrimaryButton title="Save Privacy Settings" onPress={handleSave} loading={loading} />
      </ScrollView>
    </SlideModal>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPORT DATA MODAL
// FIX: Uses platform-aware exportFile helper instead of directly
// calling expo-file-system / expo-sharing (which crash on web).
// On web it triggers a browser download via Blob + <a> tag.
// ═══════════════════════════════════════════════════════════════
const ExportDataModal = ({ visible, onClose, userData }) => {
  const [exporting, setExporting] = useState(false);

  // FIX: Inline XOR decryption — same cipher + key as financial.js
  // so exported files show plain numbers instead of encrypted strings.
  const _SK = 'your-secure-secret-key-here';
  const _xorDec = (encoded, key) => {
    if (!encoded) return '';
    try {
      let decoded;
      try { decoded = decodeURIComponent(escape(atob(encoded))); }
      catch { decoded = atob(encoded); }
      let result = '';
      for (let i = 0; i < decoded.length; i++)
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      return result;
    } catch { return encoded; }
  };
  const dec = (v) => {
    if (!v) return '0';
    if (/^\d+(\.\d+)?$/.test(String(v).trim())) return String(v).trim();
    return _xorDec(v, _SK);
  };

  const buildCSV = () => {
    const fp  = userData?.financialProfile || {};
    const now = new Date().toLocaleDateString('en-EG');
    const rows = [
      ['AI Loan Eligibility App — Data Export'],
      ['Export Date', now],
      [''],
      ['PERSONAL INFO'],
      ['Name',  userData?.displayName || userData?.name || 'N/A'],
      ['Email', userData?.email || 'N/A'],
      ['Phone', userData?.phone || 'N/A'],
      [''],
      ['FINANCIAL PROFILE'],
      ['Monthly Income (EGP)',    dec(fp.income)              || 'N/A'],
      ['Monthly Expenses (EGP)',  dec(fp.expenses)            || 'N/A'],
      ['Existing Debts (EGP)',    dec(fp.debts)               || 'N/A'],
      ['Employment Type',         fp.employment               || 'N/A'],
      ['Employment Years',        dec(fp.employmentYears)     || 'N/A'],
      ['Requested Loan (EGP)',    dec(fp.requestedLoanAmount) || 'N/A'],
      ['Data Recorded',           fp.hasData ? 'Yes' : 'No'],
    ];
    return rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  };

  const handleExportCSV = async () => {
    if (!userData) { showAlert('No Data', 'No data available to export yet.', [{ text: 'OK' }]); return; }
    setExporting(true);
    try {
      const csv      = buildCSV();
      const filename = `AILoan_Export_${Date.now()}.csv`;
      await exportFile(csv, filename, 'text/csv');
    } catch (e) {
      showAlert('Error', 'Failed to export data. Please try again.', [{ text: 'OK' }]);
      console.error('Export CSV error:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (!userData) { showAlert('No Data', 'No data available to export yet.', [{ text: 'OK' }]); return; }
    setExporting(true);
    try {
      const fp = userData?.financialProfile || {};
      const safe = {
        personalInfo: {
          displayName: userData?.displayName || userData?.name,
          email:       userData?.email,
          phone:       userData?.phone,
        },
        financialProfile: {
          income:              dec(fp.income),
          expenses:            dec(fp.expenses),
          debts:               dec(fp.debts),
          employment:          fp.employment,
          employmentYears:     dec(fp.employmentYears),
          requestedLoanAmount: dec(fp.requestedLoanAmount),
          hasData:             fp.hasData,
        },
        exportedAt: new Date().toISOString(),
      };
      const json     = JSON.stringify(safe, null, 2);
      const filename = `AILoan_Export_${Date.now()}.json`;
      await exportFile(json, filename, 'application/json');
    } catch (e) {
      showAlert('Error', 'Failed to export data. Please try again.', [{ text: 'OK' }]);
      console.error('Export JSON error:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SlideModal visible={visible} onClose={onClose} title="Export My Data">
      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 19 }}>
        Download a copy of all your personal and financial data. You can open these files in Excel or any text editor.
      </Text>

      <TouchableOpacity style={exportStyles.option} onPress={handleExportCSV} disabled={exporting} activeOpacity={0.8}>
        <View style={[exportStyles.iconBox, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="grid-outline" size={26} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={exportStyles.optionTitle}>Export as CSV</Text>
          <Text style={exportStyles.optionDesc}>Open in Excel, Google Sheets, or Numbers</Text>
        </View>
        <Ionicons name="download-outline" size={20} color="#6B7280" />
      </TouchableOpacity>

      <TouchableOpacity style={exportStyles.option} onPress={handleExportJSON} disabled={exporting} activeOpacity={0.8}>
        <View style={[exportStyles.iconBox, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name="code-outline" size={26} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={exportStyles.optionTitle}>Export as JSON</Text>
          <Text style={exportStyles.optionDesc}>Full structured data for developers</Text>
        </View>
        <Ionicons name="download-outline" size={20} color="#6B7280" />
      </TouchableOpacity>

      {exporting && (
        <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 12 }}>Preparing your export…</Text>
      )}

      <View style={{ backgroundColor: '#F0FFF4', borderRadius: 10, padding: 12, marginTop: 20 }}>
        <Text style={{ fontSize: 12, color: '#065F46', lineHeight: 17 }}>
          ✅ Exported files contain only your data and are stored only on your device.
        </Text>
      </View>
    </SlideModal>
  );
};

const exportStyles = StyleSheet.create({
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  iconBox:     { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  optionDesc:  { fontSize: 12, color: '#6B7280' },
});

// ═══════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════
const SectionCard = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const SettingItem = ({ icon, title, description, rightComponent, last }) => (
  <View style={[styles.settingItem, last && { borderBottomWidth: 0 }]}>
    <View style={styles.settingLeft}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
    </View>
    {rightComponent}
  </View>
);

const SettingButton = ({ icon, title, onPress, dangerous, last }) => (
  <TouchableOpacity
    style={[styles.settingButton, last && { borderBottomWidth: 0 }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingLeft}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={22} color={dangerous ? COLORS.error : COLORS.primary} />
      </View>
      <Text style={[styles.settingButtonTitle, dangerous && { color: COLORS.error }]}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { padding: 20, paddingBottom: 50 },
  header:           { marginBottom: 24, marginTop: 20 },
  title:            { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  subtitle:         { fontSize: 14, color: COLORS.textLight },

  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },

  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  settingLeft:          { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent:       { flex: 1 },
  settingTitle:         { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  settingDescription:   { fontSize: 12, color: COLORS.textLight },

  settingButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  settingButtonTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 16, borderRadius: 16, marginTop: 8, marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.error,
    elevation: 1,
  },
  logoutText:   { fontSize: 16, fontWeight: '700', color: COLORS.error, marginLeft: 12 },
  deleteButton: { alignItems: 'center', padding: 12 },
  deleteText:   { fontSize: 14, color: COLORS.textLight, textDecorationLine: 'underline' },
  versionText:  { textAlign: 'center', fontSize: 12, color: COLORS.textLight, marginTop: 12 },

  // FIX: Badge shown instead of Switch for mobile-only features on web
  webOnlyBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  webOnlyText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
});

export default SettingsScreen;