// app/(main)/profile.js
// ═══════════════════════════════════════════════════════════════
// PROFILE SCREEN
// Displays user information with avatar (first letter of name)
// Shows personal and financial profile data
// FIX: Uses onAuthStateChanged listener instead of getCurrentUser()
//      to handle Firebase auth not being ready on page refresh
// FIX: Decrypts financial profile values before displaying them —
//      income, expenses, debts, employmentYears, requestedLoanAmount
//      are stored encrypted in Firebase via financial.js XOR cipher.
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import UserAvatar from '../../components/UserAvatar';
import FirebaseService from '../../services/FirebaseService';
import COLORS from '../../utils/colors';

// Import Firebase auth directly to use onAuthStateChanged
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// FIX: Import decryptAES from financial.js so the same cipher is used
// to decrypt the values that were encrypted when saving the profile.
// FIX: Inline decryption — same XOR cipher + base64 as financial.js.
// Avoids any import path issues between app/main and app/(main) folders.
const SECRET_KEY = 'your-secure-secret-key-here';
const _xorDecrypt = (encoded, key) => {
  if (!encoded) return '';
  try {
    let decoded;
    try { decoded = decodeURIComponent(escape(atob(encoded))); }
    catch { decoded = atob(encoded); }
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch { return encoded; }
};
const decryptAES = (ciphertext) => {
  if (!ciphertext) return '';
  if (/^\d+(\.\d+)?$/.test(String(ciphertext).trim())) return String(ciphertext).trim();
  return _xorDecrypt(ciphertext, SECRET_KEY);
};

// Same color function as home.js — ensures avatar color is always in sync
const getAvatarColor = (name) => {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F333FF',
    '#33FFF3', '#F3FF33', '#FF3385', '#8E44AD',
    '#2980B9', '#27AE60', '#E67E22', '#F1C40F'
  ];
  if (!name) return '#8E44AD';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash % colors.length)];
};

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ─── FIX: Listen to auth state changes ────────────────────────
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid) => {
    try {
      const result = await FirebaseService.getUserData(uid);
      if (result.success) {
        setUserData(result.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (!currentUser) return;
    setRefreshing(true);
    loadUserData(currentUser.uid);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age + ' years';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Please log in to view your profile.</Text>
      </View>
    );
  }

  // FIX: Decrypt all encrypted financial fields once here so the rest
  // of the render uses clean plain numbers — nothing else changes.
  const fp = userData?.financialProfile;
  const decryptedIncome      = fp ? decryptAES(fp.income)              : '0';
  const decryptedExpenses    = fp ? decryptAES(fp.expenses)            : '0';
  const decryptedDebts       = fp ? decryptAES(fp.debts)               : '0';
  const decryptedEmpYears    = fp ? decryptAES(fp.employmentYears)     : '';
  const decryptedLoanAmount  = fp ? decryptAES(fp.requestedLoanAmount) : '0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Avatar */}
      <View style={styles.header}>
        <UserAvatar
          name={userData?.displayName || 'User'}
          size={100}
          backgroundColor={getAvatarColor(userData?.firstName)}
        />
        <Text style={styles.displayName}>
          {userData?.displayName || 'User Name'}
        </Text>
        <Text style={styles.email}>{userData?.email || currentUser.email || 'email@example.com'}</Text>
      </View>

      {/* Personal Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <InfoItem
          icon="person-outline"
          label="First Name"
          value={userData?.firstName || 'Not set'}
        />

        <InfoItem
          icon="person-outline"
          label="Last Name"
          value={userData?.lastName || 'Not set'}
        />

        <InfoItem
          icon="male-female-outline"
          label="Gender"
          value={userData?.gender
            ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1)
            : 'Not set'}
        />

        <InfoItem
          icon="calendar-outline"
          label="Date of Birth"
          value={formatDate(userData?.dateOfBirth)}
        />

        <InfoItem
          icon="time-outline"
          label="Age"
          value={calculateAge(userData?.dateOfBirth)}
        />

        <InfoItem
          icon="call-outline"
          label="Phone"
          value={userData?.phone || 'Not set'}
        />
      </View>

      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <InfoItem
          icon="mail-outline"
          label="Email"
          value={userData?.email || currentUser.email || 'Not set'}
        />

        <InfoItem
          icon="shield-checkmark-outline"
          label="Account Status"
          value="Active"
          valueColor={COLORS.success}
        />

        <InfoItem
          icon="time-outline"
          label="Member Since"
          value={formatDate(userData?.createdAt?.toDate?.())}
        />
      </View>

      {/* Financial Profile Section */}
      {fp?.hasData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Profile</Text>

          <InfoItem
            icon="cash-outline"
            label="Monthly Income"
            value={'EGP ' + (parseFloat(decryptedIncome) || 0).toLocaleString()}
            valueColor={COLORS.success}
          />

          <InfoItem
            icon="trending-down-outline"
            label="Monthly Expenses"
            value={'EGP ' + (parseFloat(decryptedExpenses) || 0).toLocaleString()}
            valueColor={COLORS.error}
          />

          <InfoItem
            icon="card-outline"
            label="Existing Debts"
            value={'EGP ' + (parseFloat(decryptedDebts) || 0).toLocaleString()}
          />

          <InfoItem
            icon="briefcase-outline"
            label="Employment Type"
            value={fp.employment
              ? fp.employment.charAt(0).toUpperCase() +
                fp.employment.slice(1).replace('-', ' ')
              : 'Not set'}
          />

          <InfoItem
            icon="time-outline"
            label="Years of Employment"
            value={decryptedEmpYears ? decryptedEmpYears + ' years' : 'Not set'}
          />

          <InfoItem
            icon="wallet-outline"
            label="Requested Loan Amount"
            value={'EGP ' + (parseFloat(decryptedLoanAmount) || 0).toLocaleString()}
            valueColor={COLORS.primary}
          />
        </View>
      )}

      {/* Statistics Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Account Statistics</Text>

        <View style={styles.statsGrid}>
          <StatBox
            icon="document-text-outline"
            value={fp?.hasData ? '1' : '0'}
            label="Profile Completed"
            color={COLORS.primary}
          />

          <StatBox
            icon="stats-chart-outline"
            value={fp?.hasData ? '✓' : '✗'}
            label="Credit Score"
            color={fp?.hasData ? COLORS.success : COLORS.textLight}
          />
        </View>
      </View>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Your data is securely stored and only used for credit score calculations
        </Text>
      </View>
    </ScrollView>
  );
};

/**
 * Info Item Component
 */
const InfoItem = ({ icon, label, value, valueColor = COLORS.text }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoLeft}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
  </View>
);

/**
 * Stat Box Component
 */
const StatBox = ({ icon, value, label, color }) => (
  <View style={styles.statBox}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 20,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 4,
  },
  email: {
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
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  statsSection: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
    marginLeft: 12,
  },
});

export default ProfileScreen;