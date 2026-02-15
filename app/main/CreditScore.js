// app/(main)/credit.js
// ═══════════════════════════════════════════════════════════════
// CREDIT SCORE SCREEN
// Displays AI-calculated credit score, risk visualization, loan decisions
// Uses AI services for real-time calculations
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import CreditScoreCalculator from '../../services/CreditScoreCalculator';
import FirebaseService from '../../services/FirebaseService';
import LoanDecisionService from '../../services/LoanDecisionService';
import UserFinancialProfile from '../../services/UserFinancialProfile';
import COLORS from '../../utils/colors';

const screenWidth = Dimensions.get('window').width;

const CreditScoreScreen = () => {
  const [userData, setUserData] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [loanDecision, setLoanDecision] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndCalculate();
  }, []);

  /**
   * Load user data and calculate credit score
   */
  const loadAndCalculate = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        const result = await FirebaseService.getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);

          // Check if financial data exists
          if (result.data.financialProfile?.hasData) {
            calculateScore(result.data);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate credit score using AI
   */
  const calculateScore = (data) => {
    try {
      // Calculate age from date of birth
      const age = data.dateOfBirth 
        ? new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear()
        : 30;

      // Create financial profile
      const profile = new UserFinancialProfile({
        monthlyIncome: data.financialProfile.income,
        monthlyExpenses: data.financialProfile.expenses,
        existingDebts: data.financialProfile.debts,
        age: age,
        employmentType: data.financialProfile.employment,
        employmentYears: data.financialProfile.employmentYears,
        requestedLoanAmount: data.financialProfile.requestedLoanAmount,
      });

      // Calculate score
      const calculator = new CreditScoreCalculator();
      const result = calculator.calculateScore(profile);
      setScoreResult(result);

      // Make loan decision
      const decisionService = new LoanDecisionService();
      const decision = decisionService.makeDecision(profile);
      setLoanDecision(decision);

    } catch (error) {
      console.error('Calculation error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!userData?.financialProfile?.hasData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calculator-outline" size={80} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Financial Data</Text>
        <Text style={styles.emptyDescription}>
          Please enter your financial information first to calculate your credit score
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Credit Score Analysis</Text>
        <Text style={styles.subtitle}>AI-Powered Assessment</Text>
      </View>

      {/* Credit Score Card */}
      {scoreResult && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your Credit Score</Text>
          <Text style={styles.scoreValue}>{scoreResult.score}</Text>
          <Text style={styles.scoreRating}>{scoreResult.rating}</Text>
          
          <View style={styles.scoreBar}>
            <View 
              style={[
                styles.scoreProgress, 
                { 
                  width: `${((scoreResult.score - 300) / 550) * 100}%`,
                  backgroundColor: getRiskColor(scoreResult.riskLevel)
                }
              ]} 
            />
          </View>
          
          <View style={styles.scoreRange}>
            <Text style={styles.rangeText}>300</Text>
            <Text style={styles.rangeText}>850</Text>
          </View>
        </View>
      )}

      {/* Risk Assessment */}
      {scoreResult && (
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Ionicons 
              name="shield-checkmark" 
              size={24} 
              color={getRiskColor(scoreResult.riskLevel)} 
            />
            <Text style={styles.riskTitle}>Risk Level</Text>
          </View>
          <Text style={[
            styles.riskLevel, 
            { color: getRiskColor(scoreResult.riskLevel) }
          ]}>
            {scoreResult.riskLevel}
          </Text>
        </View>
      )}

      {/* Loan Decision */}
      {loanDecision && (
        <View style={[
          styles.decisionCard,
          { borderColor: loanDecision.approved ? COLORS.success : COLORS.error }
        ]}>
          <View style={styles.decisionHeader}>
            <Ionicons 
              name={loanDecision.approved ? "checkmark-circle" : "close-circle"} 
              size={32} 
              color={loanDecision.approved ? COLORS.success : COLORS.error} 
            />
            <Text style={[
              styles.decisionTitle,
              { color: loanDecision.approved ? COLORS.success : COLORS.error }
            ]}>
              {loanDecision.approved ? 'Loan Approved' : 'Loan Not Approved'}
            </Text>
          </View>
          
          <View style={styles.confidenceBar}>
            <Text style={styles.confidenceLabel}>
              Approval Probability: {loanDecision.confidence}%
            </Text>
            <View style={styles.confidenceBarContainer}>
              <View 
                style={[
                  styles.confidenceProgress,
                  { 
                    width: `${loanDecision.confidence}%`,
                    backgroundColor: loanDecision.approved ? COLORS.success : COLORS.error
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Score Breakdown */}
      {scoreResult?.breakdown && (
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          {Object.entries(scoreResult.breakdown).map(([key, item]) => (
            <View key={key} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>{item.value}</Text>
              </View>
              <View style={[
                styles.impactBadge,
                { backgroundColor: getImpactColor(item.impact) }
              ]}>
                <Text style={styles.impactText}>{item.impact}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Loan Recommendations */}
      {loanDecision?.approved && loanDecision.recommendations && (
        <View style={styles.recommendationsCard}>
          <Text style={styles.sectionTitle}>Loan Recommendations</Text>
          {loanDecision.recommendations.map((rec, index) => (
            <View key={index} style={styles.loanOption}>
              <View style={styles.loanIconContainer}>
                <Ionicons name={rec.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.loanContent}>
                <Text style={styles.loanType}>{rec.type}</Text>
                <Text style={styles.loanDescription}>{rec.description}</Text>
                <View style={styles.loanDetails}>
                  <Text style={styles.loanDetail}>
                    Max: ${rec.maxAmount.toLocaleString()}
                  </Text>
                  <Text style={styles.loanDetail}>
                    Rate: {rec.interestRate}
                  </Text>
                  <Text style={styles.loanDetail}>
                    Term: {rec.term}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Improvement Recommendations (if not approved) */}
      {!loanDecision?.approved && loanDecision?.recommendations && (
        <View style={styles.improvementCard}>
          <Text style={styles.sectionTitle}>How to Improve</Text>
          {loanDecision.recommendations.map((rec, index) => (
            <View key={index} style={styles.improvementItem}>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(rec.priority) }
              ]}>
                <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
              </View>
              <View style={styles.improvementContent}>
                <Text style={styles.improvementTitle}>{rec.title}</Text>
                <Text style={styles.improvementDescription}>{rec.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Explanation Section */}
      {loanDecision?.reasons && (
        <View style={styles.explanationCard}>
          <Text style={styles.sectionTitle}>AI Explanation</Text>
          {loanDecision.reasons.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Ionicons 
                name="information-circle-outline" 
                size={20} 
                color={COLORS.primary} 
              />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// Helper functions
const getRiskColor = (riskLevel) => {
  const colors = {
    'Very Low': COLORS.success,
    'Low': '#27AE60',
    'Moderate': COLORS.warning,
    'High': '#E67E22',
    'Very High': COLORS.error
  };
  return colors[riskLevel] || COLORS.textLight;
};

const getImpactColor = (impact) => {
  if (impact === 'Positive') return COLORS.success + '20';
  if (impact === 'Negative') return COLORS.error + '20';
  return COLORS.textLight + '20';
};

const getPriorityColor = (priority) => {
  if (priority === 'high') return COLORS.error;
  if (priority === 'medium') return COLORS.warning;
  return COLORS.info;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.background,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    marginBottom: 20,
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
  scoreCard: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  scoreRating: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  rangeText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  riskCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
  },
  riskLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  decisionCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  decisionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  confidenceBar: {
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  confidenceBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceProgress: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownLeft: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  impactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  recommendationsCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  loanOption: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  loanIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  loanContent: {
    flex: 1,
  },
  loanType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  loanDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  loanDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  loanDetail: {
    fontSize: 12,
    color: COLORS.primary,
    marginRight: 16,
    fontWeight: '500',
  },
  improvementCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  improvementItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    height: 24,
    marginRight: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  improvementContent: {
    flex: 1,
  },
  improvementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  improvementDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  explanationCard: {
    backgroundColor: COLORS.primary + '10',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
    marginLeft: 12,
  },
});

export default CreditScoreScreen;