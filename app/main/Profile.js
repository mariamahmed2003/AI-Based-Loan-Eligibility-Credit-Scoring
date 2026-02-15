// app/(main)/profile.js
// ═══════════════════════════════════════════════════════════════
// PROFILE SCREEN
// Displays user information with avatar (first letter of name)
// Shows personal and financial profile data
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

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  /**
   * Load user data from Firebase
   */
  const loadUserData = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        const result = await FirebaseService.getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  /**
   * Calculate age from date of birth
   */
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
        />
        <Text style={styles.displayName}>
          {userData?.displayName || 'User Name'}
        </Text>
        <Text style={styles.email}>{userData?.email || 'email@example.com'}</Text>
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
          value={userData?.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1) : 'Not set'}
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
          value={userData?.email || 'Not set'}
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
      {userData?.financialProfile?.hasData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Profile</Text>
          
          <InfoItem 
            icon="cash-outline"
            label="Monthly Income"
            value={'$' + (userData.financialProfile.income || 0).toLocaleString()}
            valueColor={COLORS.success}
          />
          
          <InfoItem 
            icon="trending-down-outline"
            label="Monthly Expenses"
            value={'$' + (userData.financialProfile.expenses || 0).toLocaleString()}
            valueColor={COLORS.error}
          />
          
          <InfoItem 
            icon="card-outline"
            label="Existing Debts"
            value={'$' + (userData.financialProfile.debts || 0).toLocaleString()}
          />
          
          <InfoItem 
            icon="briefcase-outline"
            label="Employment Type"
            value={userData.financialProfile.employment ? 
              userData.financialProfile.employment.charAt(0).toUpperCase() + 
              userData.financialProfile.employment.slice(1).replace('-', ' ') : 
              'Not set'}
          />
          
          <InfoItem 
            icon="time-outline"
            label="Years of Employment"
            value={userData.financialProfile.employmentYears ? 
              userData.financialProfile.employmentYears + ' years' : 
              'Not set'}
          />
          
          <InfoItem 
            icon="wallet-outline"
            label="Requested Loan Amount"
            value={'$' + (userData.financialProfile.requestedLoanAmount || 0).toLocaleString()}
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
            value={userData?.financialProfile?.hasData ? '1' : '0'}
            label="Profile Completed"
            color={COLORS.primary}
          />
          
          <StatBox 
            icon="stats-chart-outline"
            value={userData?.financialProfile?.hasData ? '✓' : '✗'}
            label="Credit Score"
            color={userData?.financialProfile?.hasData ? COLORS.success : COLORS.textLight}
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