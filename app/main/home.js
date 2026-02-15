// app/(main)/home.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react'; // FIXED: Proper React imports
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'; // FIXED: Added all components used in the UI

// FIXED: Corrected paths to reach root folders from app/(tabs)/
import UserAvatar from '../../components/UserAvatar';
import FirebaseService from '../../services/FirebaseService';
import COLORS from '../../utils/colors';

const HomeScreen = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const hasFinancialData = userData?.financialProfile?.hasData || false;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>
            {userData?.firstName || 'User'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/main/profile')}>
          <UserAvatar 
            name={userData?.firstName || 'User'} 
            size={50}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Stats Cards */}
      {hasFinancialData && (
        <View style={styles.statsContainer}>
          <StatCard 
            icon="cash-outline"
            title="Monthly Income"
            value={'$' + (userData?.financialProfile?.income || 0).toLocaleString()}
            color={COLORS.success || '#4CAF50'}
          />
          <StatCard 
            icon="trending-down-outline"
            title="Monthly Expenses"
            value={'$' + (userData?.financialProfile?.expenses || 0).toLocaleString()}
            color={COLORS.error || '#F44336'}
          />
        </View>
      )}

      {/* Main Action Card */}
      <TouchableOpacity 
        style={styles.actionCard}
        onPress={() => router.push(hasFinancialData ? '/credit' : '/financial')}
      >
        <View style={styles.actionCardIcon}>
          <Ionicons name={hasFinancialData ? "stats-chart" : "calculator"} size={32} color="#FFF" />
        </View>
        <View style={styles.actionCardContent}>
          <Text style={styles.actionCardTitle}>
            {hasFinancialData ? "View Credit Score" : "Complete Financial Profile"}
          </Text>
          <Text style={styles.actionCardDescription}>
            {hasFinancialData 
              ? "Check your risk assessment and loan eligibility status"
              : "Enter your information to get your instant AI credit score"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
      </TouchableOpacity>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <FeatureItem 
          icon="calculator-outline" 
          title="Financial Input" 
          onPress={() => router.push('/financial')} 
        />
        <FeatureItem 
          icon="stats-chart-outline" 
          title="Credit Analysis" 
          onPress={() => router.push('/credit')} 
        />
      </View>
    </ScrollView>
  );
};

// Sub-components for cleaner code
const StatCard = ({ icon, title, value, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const FeatureItem = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.featureCard} onPress={onPress}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F8F9FA' },
  contentContainer: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  greeting: { fontSize: 16, color: '#666' },
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 12, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statTitle: { fontSize: 12, color: '#666' },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  actionCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 4, marginBottom: 25 },
  actionCardIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary || '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionCardContent: { flex: 1 },
  actionCardTitle: { fontWeight: 'bold', fontSize: 16 },
  actionCardDescription: { fontSize: 12, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  featureIcon: { marginRight: 15 },
  featureTitle: { flex: 1, fontWeight: '600' }
});

export default HomeScreen;