import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import UserAvatar from '../../components/UserAvatar';
import FirebaseService from '../../services/FirebaseService';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Using your specific color values
  const THEME = {
    primary: '#0A2540',
    accent: '#2ECC71',
    background: '#F5F7FA',
    card: '#FFFFFF',
    text: '#2C2C2C',
    textLight: '#6B7280',
    textWhite: '#FFFFFF'
  };

  useEffect(() => {
    loadUserData();
  }, []);

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
   * Generates a consistent background color based on the user's name
   * to ensure different registrations have different colored circles.
   */
  const getAvatarColor = (name) => {
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF', 
      '#33FFF3', '#F3FF33', '#FF3385', '#8E44AD',
      '#2980B9', '#27AE60', '#E67E22', '#F1C40F'
    ];
    if (!name) return '#8E44AD'; // Default purple if no name
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={[styles.loadingText, { color: THEME.textLight }]}>Updating Dashboard...</Text>
      </View>
    );
  }

  const hasFinancialData = userData?.financialProfile?.hasData || false;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{userData?.firstName || 'User'}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/main/Profile')}
          style={styles.avatarContainer}
        >
          <UserAvatar 
            name={userData?.firstName || 'User'} 
            size={50}
            backgroundColor={getAvatarColor(userData?.firstName)} // Dynamically passed color
          />
        </TouchableOpacity>
      </View>

      {/* Main Action Card (Centerpiece) */}
      <TouchableOpacity 
        style={[styles.actionCard, { backgroundColor: THEME.primary }]}
        onPress={() => router.push(hasFinancialData ? '/main/CreditScore' : '/main/FinancialInput')}
      >
        <View style={styles.actionCardContent}>
          <View style={[styles.iconCircle, { backgroundColor: THEME.accent }]}>
            <Ionicons name={hasFinancialData ? "stats-chart" : "calculator"} size={28} color="#FFF" />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.actionTitle}>
              {hasFinancialData ? "Credit Analysis" : "Financial Profile"}
            </Text>
            <Text style={styles.actionSubtitle}>
              {hasFinancialData 
                ? "View your risk assessment" 
                : "Complete profile for AI score"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFF" style={{ opacity: 0.7 }} />
        </View>
      </TouchableOpacity>

      {/* Quick Stats Grid */}
      {hasFinancialData && (
        <View style={styles.statsGrid}>
          <StatCard 
            icon="cash-outline"
            title="Income"
            value={'$' + (userData?.financialProfile?.income || 0).toLocaleString()}
            color={THEME.accent}
          />
          <StatCard 
            icon="trending-down-outline"
            title="Expenses"
            value={'$' + (userData?.financialProfile?.expenses || 0).toLocaleString()}
            color="#E74C3C" // Subtle red for expenses
          />
        </View>
      )}

      {/* Quick Links Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dashboard Links</Text>
      </View>

      <FeatureItem 
        icon="analytics-outline" 
        title="View Detailed Credit Analysis" 
        onPress={() => router.push('/main/CreditScore')} 
        accentColor={THEME.primary}
      />
      
      <FeatureItem 
        icon="person-outline" 
        title="Manage User Profile" 
        onPress={() => router.push('/main/Profile')} 
        accentColor={THEME.primary}
      />

    </ScrollView>
  );
};

// Simplified Sub-components
const StatCard = ({ icon, title, value, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statLabel}>{title}</Text>
    <Text style={[styles.statValue, { color: '#2C2C2C' }]}>{value}</Text>
  </View>
);

const FeatureItem = ({ icon, title, onPress, accentColor }) => (
  <TouchableOpacity style={styles.linkRow} onPress={onPress}>
    <View style={[styles.linkIconBox, { backgroundColor: '#F5F7FA' }]}>
      <Ionicons name={icon} size={22} color={accentColor} />
    </View>
    <Text style={styles.linkText}>{title}</Text>
    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F7FA' 
  },
  contentContainer: { 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 40,
    alignItems: 'center' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F5F7FA'
  },
  loadingText: { marginTop: 12, fontWeight: '500' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    width: '100%',
    marginBottom: 30 
  },
  greeting: { fontSize: 16, color: '#6B7280' },
  userName: { fontSize: 28, fontWeight: '800', color: '#2C2C2C', marginTop: 2 },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 25,
    elevation: 3
  },

  actionCard: { 
    width: '100%',
    borderRadius: 20, 
    padding: 24,
    marginBottom: 25,
    elevation: 8,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  actionCardContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  textColumn: { flex: 1 },
  actionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  actionSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  statsGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    width: '100%',
    gap: 15, 
    marginBottom: 30 
  },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statIconCircle: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12
  },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  sectionHeader: { width: '100%', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2C' },
  linkRow: { 
    width: '100%',
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 1
  },
  linkIconBox: {
    padding: 10,
    borderRadius: 10,
    marginRight: 15
  },
  linkText: { flex: 1, fontWeight: '600', color: '#2C2C2C', fontSize: 15 }
});

export default HomeScreen;