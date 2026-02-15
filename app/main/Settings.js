// app/(main)/settings.js
// ═══════════════════════════════════════════════════════════════
// SETTINGS SCREEN
// App settings, preferences, and account management
// Includes working logout functionality
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import FirebaseService from '../../services/FirebaseService';
import COLORS from '../../utils/colors';

const SettingsScreen = () => {
  const router = useRouter();
  
  // Settings State
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: false,
    biometricAuth: false,
  });

  /**
   * Toggle setting
   */
  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirebaseService.signOut();
              if (result.success) {
                // Navigate to welcome screen
                router.replace('/welcomescreen');
              } else {
                Alert.alert('Error', 'Failed to logout');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  /**
   * Handle delete account
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'Account deletion will be available in the next update',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  /**
   * Handle clear data
   */
  const handleClearData = () => {
    Alert.alert(
      'Clear Data',
      'This will delete all your financial data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = FirebaseService.getCurrentUser();
              if (user) {
                await FirebaseService.saveFinancialProfile(user.uid, {
                  income: 0,
                  expenses: 0,
                  debts: 0,
                  employment: '',
                  employmentYears: 0,
                  requestedLoanAmount: 0,
                  hasData: false,
                });
                Alert.alert('Success', 'Financial data cleared');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your app preferences</Text>
      </View>

      {/* App Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
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
              value={settings.darkMode}
              onValueChange={() => toggleSetting('darkMode')}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        
        <SettingItem 
          icon="finger-print-outline"
          title="Biometric Authentication"
          description="Use fingerprint or face ID"
          rightComponent={
            <Switch 
              value={settings.biometricAuth}
              onValueChange={() => toggleSetting('biometricAuth')}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <SettingButton 
          icon="person-outline"
          title="Edit Profile"
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
        />
        
        <SettingButton 
          icon="key-outline"
          title="Change Password"
          onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
        />
        
        <SettingButton 
          icon="shield-checkmark-outline"
          title="Privacy Settings"
          onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon')}
        />
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <SettingButton 
          icon="download-outline"
          title="Export Data"
          onPress={() => Alert.alert('Coming Soon', 'Data export will be available soon')}
        />
        
        <SettingButton 
          icon="trash-outline"
          title="Clear Financial Data"
          onPress={handleClearData}
          dangerous
        />
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <SettingButton 
          icon="help-circle-outline"
          title="Help Center"
          onPress={() => Alert.alert('Help', 'Help center will open soon')}
        />
        
        <SettingButton 
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => Alert.alert('Terms', 'Terms of service will open soon')}
        />
        
        <SettingButton 
          icon="shield-outline"
          title="Privacy Policy"
          onPress={() => Alert.alert('Privacy', 'Privacy policy will open soon')}
        />
        
        <SettingButton 
          icon="information-circle-outline"
          title="About App"
          onPress={() => Alert.alert(
            'AI Loan Eligibility App',
            'Version 1.0.0\n\nAI-powered credit scoring and loan eligibility assessment',
            [{ text: 'OK' }]
          )}
        />
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Delete Account Button */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Version Info */}
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
};

/**
 * Setting Item Component (with Switch)
 */
const SettingItem = ({ icon, title, description, rightComponent }) => (
  <View style={styles.settingItem}>
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

/**
 * Setting Button Component (clickable)
 */
const SettingButton = ({ icon, title, onPress, dangerous = false }) => (
  <TouchableOpacity style={styles.settingButton} onPress={onPress}>
    <View style={styles.settingLeft}>
      <View style={styles.settingIconContainer}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={dangerous ? COLORS.error : COLORS.primary} 
        />
      </View>
      <Text style={[
        styles.settingButtonTitle,
        dangerous && { color: COLORS.error }
      ]}>
        {title}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingButtonTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 12,
  },
  deleteButton: {
    alignItems: 'center',
    padding: 12,
  },
  deleteText: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'underline',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 20,
  },
});

export default SettingsScreen;