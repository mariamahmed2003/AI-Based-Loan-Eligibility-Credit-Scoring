// app/(main)/credit.js
// ═══════════════════════════════════════════════════════════════
// CREDIT SCORE SCREEN — OpenAI + Egyptian Banking Rules
// Handles async LoanDecisionService.makeDecision()
// Displays: score, AI explanation, breakdown, loan options or tips
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RiskChart from '../../components/RiskChart';
import CreditScoreCalculator from '../../services/CreditScoreCalculator';
import FirebaseService from '../../services/FirebaseService';
import LoanDecisionService from '../../services/LoanDecisionService';
import UserFinancialProfile from '../../services/UserFinancialProfile';
import COLORS from '../../utils/colors';

const screenWidth = Dimensions.get('window').width;

// ── Must match the key used in financial.js ─────────────────────
const SECRET_KEY = 'your-secure-secret-key-here';

const decryptAES = (ciphertext) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed', error);
    return '';
  }
};

// Safe parse: returns a number or 0, never NaN
const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// ── FIX 1: Correct risk level based on actual numeric score ─────
// The rule-based calculator can return a mismatched riskLevel label.
// This function recomputes it deterministically so the label always
// matches the position on the gradient bar shown in RiskChart:
//   300–549  → Very High  (red zone)
//   550–579  → High       (orange zone)
//   580–649  → Moderate   (yellow zone)
//   650–749  → Low        (dark-green zone)
//   750–850  → Very Low   (bright-green zone)
const getRiskLevelFromScore = (score) => {
  if (score >= 750) return 'Very Low';
  if (score >= 650) return 'Low';
  if (score >= 580) return 'Moderate';
  if (score >= 550) return 'High';
  return 'Very High';
};

const getRatingFromScore = (score) => {
  if (score >= 750) return 'Excellent';
  if (score >= 650) return 'Very Good';
  if (score >= 580) return 'Good';
  if (score >= 500) return 'Fair';
  return 'Poor';
};

// ── FIX 2: Robust age derivation ────────────────────────────────
// Handles all possible field locations and formats:
//   • Root-level dateOfBirth (ISO string or YYYY-MM-DD)
//   • Nested profile.dateOfBirth
//   • Root-level age (number or numeric string)
//   • Nested profile.age
//   • Router params (freshAge) passed in as a plain number
// Falls back to 25 — a neutral adult age that does not skew scoring.
const deriveAge = (data, freshAge = null) => {
  // ── Priority 0: fresh router param ──────────────────────────
  if (freshAge !== null && freshAge !== undefined && freshAge !== '') {
    const parsed = parseInt(freshAge, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 100) return parsed;
  }

  // ── Priority 1: dateOfBirth at root level ────────────────────
  if (data?.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age > 0 && age < 100) return age;
    }
  }

  // ── Priority 2: dateOfBirth nested under profile ─────────────
  if (data?.profile?.dateOfBirth) {
    const dob = new Date(data.profile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age > 0 && age < 100) return age;
    }
  }

  // ── Priority 3: dateOfBirth inside financialProfile ──────────
  if (data?.financialProfile?.dateOfBirth) {
    const dob = new Date(data.financialProfile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age > 0 && age < 100) return age;
    }
  }

  // ── Priority 4: age stored directly as a number at root ──────
  if (data?.age !== undefined && data?.age !== null && data?.age !== '') {
    const parsed = parseInt(data.age, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 100) return parsed;
  }

  // ── Priority 5: age nested under profile ─────────────────────
  if (data?.profile?.age !== undefined && data?.profile?.age !== null) {
    const parsed = parseInt(data.profile.age, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 100) return parsed;
  }

  // ── Priority 6: age nested under financialProfile ────────────
  if (data?.financialProfile?.age !== undefined && data?.financialProfile?.age !== null) {
    const parsed = parseInt(data.financialProfile.age, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 100) return parsed;
  }

  // ── Priority 7: birthYear stored directly ────────────────────
  if (data?.birthYear) {
    const age = new Date().getFullYear() - parseInt(data.birthYear, 10);
    if (age > 0 && age < 100) return age;
  }

  // ── Fallback: neutral adult, does not skew scoring ───────────
  console.warn('[deriveAge] Could not determine age from profile data. Using fallback: 25');
  return 25;
};

const CreditScoreScreen = () => {
  const params = useLocalSearchParams();

  const [userData,     setUserData]     = useState(null);
  const [scoreResult,  setScoreResult]  = useState(null);
  const [loanDecision, setLoanDecision] = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSource,     setAiSource]     = useState(null);

  useEffect(() => { loadAndCalculate(); }, []);

  const loadAndCalculate = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        const result = await FirebaseService.getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);

          const hasFreshParams =
            params?.freshIncome && params.freshIncome !== '';

          if (hasFreshParams) {
            const freshData = {
              ...result.data,
              financialProfile: {
                hasData:             true,
                income:              params.freshIncome,
                expenses:            params.freshExpenses,
                debts:               params.freshDebts,
                employment:          params.freshEmployment,
                employmentYears:     params.freshEmpYears,
                requestedLoanAmount: params.freshLoanAmount,
              },
            };
            // Pass freshAge separately so deriveAge can pick it up at highest priority
            await calculateScore(freshData, true, params.freshAge ?? null);
          } else if (result.data.financialProfile?.hasData) {
            await calculateScore(result.data, false, null);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // alreadyDecrypted = true  → plain numbers from fresh router params
  // alreadyDecrypted = false → AES ciphertexts from Firebase
  // freshAge         = number|string|null → age from router params (highest priority)
  const calculateScore = async (data, alreadyDecrypted = false, freshAge = null) => {
    try {
      setAiLoading(true);

      // ── FIX 2 applied — robust age derivation ──────────────
      const age = deriveAge(data, freshAge);

      const fp = data.financialProfile;

      const income     = alreadyDecrypted ? fp.income              : decryptAES(fp.income);
      const expenses   = alreadyDecrypted ? fp.expenses            : decryptAES(fp.expenses);
      const debts      = alreadyDecrypted ? fp.debts               : decryptAES(fp.debts);
      const empYears   = alreadyDecrypted ? fp.employmentYears     : decryptAES(fp.employmentYears);
      const loanAmount = alreadyDecrypted ? fp.requestedLoanAmount : decryptAES(fp.requestedLoanAmount);

      const userProfile = new UserFinancialProfile({
        monthlyIncome:       safeNum(income),
        monthlyExpenses:     safeNum(expenses),
        existingDebts:       safeNum(debts),
        age,
        employmentType:      fp.employment,
        employmentYears:     safeNum(empYears),
        requestedLoanAmount: safeNum(loanAmount),
      });

      setProfile(userProfile);

      const calculator = new CreditScoreCalculator();
      const ruleScore  = calculator.calculateScore(userProfile);

      // ── FIX 1 applied ──────────────────────────────────────
      // Override whatever riskLevel/rating the calculator returned
      // with the values derived directly from the numeric score,
      // so the label always matches the colour zone on the chart.
      const correctedRuleScore = {
        ...ruleScore,
        riskLevel: getRiskLevelFromScore(ruleScore.score),
        rating:    getRatingFromScore(ruleScore.score),
      };
      setScoreResult(correctedRuleScore);

      const decisionService = new LoanDecisionService();
      const decision = await decisionService.makeDecision(userProfile);
      setLoanDecision(decision);
      setAiSource(decision.source);

      if (decision.source === 'openai' && decision.score) {
        setScoreResult({
          ...correctedRuleScore,
          score:     decision.score,
          riskLevel: getRiskLevelFromScore(decision.score),
          rating:    getRatingFromScore(decision.score),
          breakdown: decision.breakdown || correctedRuleScore?.breakdown,
        });
      }

    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Loading states ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A2540" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!userData?.financialProfile?.hasData && !params?.freshIncome) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calculator-outline" size={80} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Financial Data Yet</Text>
        <Text style={styles.emptyDescription}>
          Please complete your Financial Profile first so the AI can calculate your loan eligibility.
        </Text>
      </View>
    );
  }

  if (aiLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.loadingText}>AI is analyzing your profile...</Text>
        <Text style={styles.loadingSubText}>Using Egyptian banking standards</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Credit Score Analysis</Text>
        <View style={styles.sourceTag}>
          <Ionicons
            name={aiSource === 'openai' ? 'sparkles' : 'calculator-outline'}
            size={12}
            color={aiSource === 'openai' ? '#2ECC71' : '#F39C12'}
          />
          <Text style={[styles.sourceText, { color: aiSource === 'openai' ? '#2ECC71' : '#F39C12' }]}>
            {aiSource === 'openai' ? 'AI-Powered (GPT-4)' : 'Rule-Based Analysis'}
          </Text>
        </View>
      </View>

      {/* ── Hard Reject Banner ──────────────────────────────── */}
      {loanDecision?.hardReject && (
        <View style={styles.hardRejectBanner}>
          <Ionicons name="alert-circle" size={28} color="#FFF" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.hardRejectTitle}>Egyptian Bank Requirements Not Met</Text>
            <Text style={styles.hardRejectSubtitle}>
              You currently do not qualify for a personal loan in Egypt.
            </Text>
          </View>
        </View>
      )}

      {/* ── Score Card ──────────────────────────────────────── */}
      {scoreResult && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your Credit Score</Text>
          <Text style={[styles.scoreValue, { color: getRiskColor(scoreResult.riskLevel) }]}>
            {scoreResult.score}
          </Text>
          <Text style={styles.scoreRating}>{scoreResult.rating}</Text>

          <View style={styles.scoreBar}>
            <View style={[
              styles.scoreProgress,
              {
                width: `${Math.min(((scoreResult.score - 300) / 550) * 100, 100)}%`,
                backgroundColor: getRiskColor(scoreResult.riskLevel),
              },
            ]} />
          </View>

          <View style={styles.scoreRange}>
            <Text style={styles.rangeText}>300</Text>
            <Text style={styles.rangeText}>850</Text>
          </View>

          {/* Scale legend */}
          <View style={styles.scaleLegend}>
            {[
              { color:'#E74C3C', label:'Poor',      min:300 },
              { color:'#E67E22', label:'Fair',       min:500 },
              { color:'#F39C12', label:'Good',       min:580 },
              { color:'#27AE60', label:'Very Good',  min:650 },
              { color:'#2ECC71', label:'Excellent',  min:750 },
            ].map(s => (
              <View key={s.label} style={{ alignItems:'center', flex:1 }}>
                <View style={{ width:10, height:10, borderRadius:5, backgroundColor:s.color, marginBottom:3 }} />
                <Text style={{ fontSize:8, color:'#9CA3AF' }}>{s.label}</Text>
                <Text style={{ fontSize:8, color:'#9CA3AF' }}>{s.min}+</Text>
              </View>
            ))}
          </View>

          {/* Financial health summary */}
          {loanDecision?.financialHealthSummary && (
            <View style={styles.healthSummary}>
              <Text style={styles.healthSummaryText}>{loanDecision.financialHealthSummary}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Risk Chart ──────────────────────────────────────── */}
      {scoreResult && (
        <RiskChart
          scoreResult={{
            ...scoreResult,
            breakdown: loanDecision?.breakdown || scoreResult.breakdown,
          }}
          loanDecision={loanDecision}
          profile={profile}
        />
      )}

      {/* ── Decision Card ───────────────────────────────────── */}
      {loanDecision && (
        <View style={[
          styles.decisionCard,
          { borderColor: loanDecision.approved ? '#2ECC71' : '#E74C3C' },
        ]}>
          <View style={styles.decisionHeader}>
            <Ionicons
              name={loanDecision.approved ? 'checkmark-circle' : 'close-circle'}
              size={36}
              color={loanDecision.approved ? '#2ECC71' : '#E74C3C'}
            />
            <View style={{ flex:1, marginLeft:12 }}>
              <Text style={[styles.decisionTitle, { color: loanDecision.approved ? '#2ECC71' : '#E74C3C' }]}>
                {loanDecision.approved ? '✅ Personal Loan Approved' : '❌ Personal Loan Declined'}
              </Text>
              <Text style={styles.decisionSubtitle}>
                {loanDecision.hardReject
                  ? 'Hard eligibility requirements not met'
                  : loanDecision.approved
                    ? 'You meet Egyptian bank standards'
                    : 'Score or profile below threshold'}
              </Text>
            </View>
          </View>

          {/* Approval probability */}
          {!loanDecision.hardReject && (
            <View style={{ marginTop:8 }}>
              <Text style={styles.confidenceLabel}>
                Approval Probability: {loanDecision.confidence}%
              </Text>
              <View style={styles.confidenceBarContainer}>
                <View style={[
                  styles.confidenceProgress,
                  {
                    width: `${loanDecision.confidence}%`,
                    backgroundColor: loanDecision.approved ? '#2ECC71' : '#E74C3C',
                  },
                ]} />
              </View>
            </View>
          )}

          {/* Max loan + rate if approved */}
          {loanDecision.approved && loanDecision.maxLoanAmount > 0 && (
            <>
              <View style={styles.loanInfoRow}>
                <Ionicons name="cash-outline" size={18} color="#27AE60" />
                <Text style={styles.loanInfoText}>
                  Max Loan: EGP {loanDecision.maxLoanAmount.toLocaleString()}
                </Text>
              </View>
              {loanDecision.interestRateRange?.[0] > 0 && (
                <View style={styles.loanInfoRow}>
                  <Ionicons name="trending-up-outline" size={18} color="#0A2540" />
                  <Text style={styles.loanInfoText}>
                    Interest: {loanDecision.interestRateRange[0]}%–{loanDecision.interestRateRange[1]}% p.a.
                  </Text>
                </View>
              )}
              {loanDecision.recommendedMonthlyInstallment > 0 && (
                <View style={styles.loanInfoRow}>
                  <Ionicons name="calendar-outline" size={18} color="#0A2540" />
                  <Text style={styles.loanInfoText}>
                    Est. Monthly Installment: EGP {loanDecision.recommendedMonthlyInstallment.toLocaleString()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* ── Score Breakdown ─────────────────────────────────── */}
      {(loanDecision?.breakdown || scoreResult?.breakdown) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          {Object.entries(loanDecision?.breakdown || scoreResult?.breakdown || {}).map(([key, item]) => (
            <View key={key} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>{item.value}</Text>
                {item.score != null && item.maxScore != null && (
                  <Text style={styles.breakdownScore}>{item.score}/{item.maxScore} pts</Text>
                )}
              </View>
              <View style={[styles.impactBadge, { backgroundColor: getImpactColor(item.impact) }]}>
                <Text style={styles.impactText}>{item.impact}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Approved: Loan recommendation ───────────────────── */}
      {loanDecision?.approved && loanDecision.recommendations?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Loan Options</Text>
          {loanDecision.recommendations.map((rec, i) => (
            <View key={i} style={styles.loanOption}>
              <View style={styles.loanIcon}>
                <Ionicons name={rec.icon || 'person'} size={24} color="#0A2540" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.loanType}>{rec.type}</Text>
                <Text style={styles.loanDesc}>{rec.description}</Text>
                <View style={styles.loanDetails}>
                  <Text style={styles.loanDetail}>Max: EGP {rec.maxAmount?.toLocaleString()}</Text>
                  <Text style={styles.loanDetail}>
                    Rate: {Array.isArray(rec.interestRate)
                      ? `${rec.interestRate[0]}%–${rec.interestRate[1]}%`
                      : rec.interestRate}
                  </Text>
                  <Text style={styles.loanDetail}>Term: {rec.term}</Text>
                </View>
                {rec.notes && <Text style={styles.loanNote}>{rec.notes}</Text>}
                {rec.suitability && (
                  <View style={styles.suitabilityBadge}>
                    <Text style={styles.suitabilityText}>{rec.suitability}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Declined: Improvement tips ───────────────────────── */}
      {!loanDecision?.approved && loanDecision?.recommendations?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How to Improve Your Eligibility</Text>
          {loanDecision.recommendations.map((rec, i) => (
            <View key={i} style={styles.improvementItem}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                <Text style={styles.priorityText}>{rec.priority?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.improvementHeader}>
                  <Ionicons name={rec.icon || 'information-circle-outline'} size={16} color="#0A2540" style={{ marginRight: 6 }} />
                  <Text style={styles.improvementTitle}>{rec.title}</Text>
                </View>
                <Text style={styles.improvementDesc}>{rec.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── AI Explanation ───────────────────────────────────── */}
      {loanDecision?.reasons?.length > 0 && (
        <View style={[styles.card, { backgroundColor: '#EBF8FF' }]}>
          <Text style={styles.sectionTitle}>AI Explanation</Text>
          {loanDecision.reasons.map((reason, i) => (
            <View key={i} style={styles.reasonItem}>
              <Ionicons
                name={i === 0 ? (loanDecision.approved ? 'checkmark-circle' : 'close-circle') : 'information-circle-outline'}
                size={18}
                color={i === 0 ? (loanDecision.approved ? '#2ECC71' : '#E74C3C') : '#0A2540'}
              />
              <Text style={[
                styles.reasonText,
                i === 0 && { fontWeight: 'bold', fontSize: 14 },
              ]}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Recalculate button ───────────────────────────────── */}
      <TouchableOpacity
        style={styles.recalcButton}
        onPress={loadAndCalculate}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={18} color="#0A2540" />
        <Text style={styles.recalcText}>Recalculate</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

// ── Helpers ────────────────────────────────────────────────────
const getRiskColor = (riskLevel) => ({
  'Very Low':  '#2ECC71',
  'Low':       '#27AE60',
  'Moderate':  '#F39C12',
  'High':      '#E67E22',
  'Very High': '#E74C3C',
}[riskLevel] || '#95A5A6');

const getImpactColor = (impact) => {
  if (impact === 'Positive') return '#2ECC7120';
  if (impact === 'Negative') return '#E74C3C20';
  return '#F39C1220';
};

const getPriorityColor = (priority) => {
  if (priority === 'high')   return '#E74C3C';
  if (priority === 'medium') return '#F39C12';
  return '#3498DB';
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F5F7FA' },
  contentContainer: { padding: 20, paddingBottom: 40 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA', gap: 12 },
  loadingText:      { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  loadingSubText:   { fontSize: 13, color: '#9CA3AF' },

  emptyContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle:       { fontSize: 22, fontWeight: 'bold', color: '#2C2C2C', marginTop: 20, marginBottom: 10 },
  emptyDescription: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  header:     { marginBottom: 16, marginTop: 10 },
  title:      { fontSize: 26, fontWeight: 'bold', color: '#2C2C2C' },
  sourceTag:  { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  sourceText: { fontSize: 12, fontWeight: '600' },

  hardRejectBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E74C3C', borderRadius: 14,
    padding: 16, marginBottom: 16,
  },
  hardRejectTitle:    { fontSize: 15, fontWeight: 'bold',  color: '#FFF' },
  hardRejectSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },

  scoreCard: {
    backgroundColor: '#FFF', padding: 24, borderRadius: 20,
    alignItems: 'center', marginBottom: 16,
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  scoreLabel:    { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  scoreValue:    { fontSize: 72, fontWeight: 'bold', marginBottom: 6 },
  scoreRating:   { fontSize: 18, fontWeight: '600', color: '#2C2C2C', marginBottom: 16 },
  scoreBar:      { width: '100%', height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  scoreProgress: { height: '100%', borderRadius: 4 },
  scoreRange:    { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  rangeText:     { fontSize: 11, color: '#9CA3AF' },
  scaleLegend:   { flexDirection: 'row', width: '100%', marginTop: 4 },
  healthSummary: { marginTop: 14, backgroundColor: '#F0FFF4', padding: 10, borderRadius: 10, width: '100%' },
  healthSummaryText: { fontSize: 13, color: '#27AE60', textAlign: 'center', fontWeight: '600' },

  decisionCard: {
    backgroundColor: '#FFF', padding: 20, borderRadius: 16,
    marginBottom: 16, borderLeftWidth: 5,
    elevation: 3,
  },
  decisionHeader:         { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  decisionTitle:          { fontSize: 17, fontWeight: 'bold' },
  decisionSubtitle:       { fontSize: 12, color: '#6B7280', marginTop: 3 },
  confidenceLabel:        { fontSize: 13, color: '#2C2C2C', marginBottom: 6, fontWeight: '600' },
  confidenceBarContainer: { width: '100%', height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  confidenceProgress:     { height: '100%', borderRadius: 4 },
  loanInfoRow:            { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  loanInfoText:           { fontSize: 14, color: '#2C2C2C', fontWeight: '600' },

  card: {
    backgroundColor: '#FFF', padding: 20, borderRadius: 16,
    marginBottom: 16, elevation: 2,
  },
  sectionTitle:   { fontSize: 17, fontWeight: 'bold', color: '#2C2C2C', marginBottom: 16 },

  breakdownItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  breakdownLeft:  { flex: 1 },
  breakdownLabel: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  breakdownValue: { fontSize: 15, fontWeight: '600', color: '#2C2C2C' },
  breakdownScore: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  impactBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  impactText:     { fontSize: 11, fontWeight: '600', color: '#2C2C2C' },

  loanOption:  { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 12 },
  loanIcon:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 14, elevation: 1 },
  loanType:    { fontSize: 15, fontWeight: '700', color: '#2C2C2C', marginBottom: 4 },
  loanDesc:    { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  loanDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  loanDetail:  { fontSize: 12, color: '#0A2540', fontWeight: '500' },
  loanNote:    { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  suitabilityBadge: { alignSelf: 'flex-start', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  suitabilityText:  { fontSize: 11, color: '#059669', fontWeight: '600' },

  improvementItem:   { flexDirection: 'row', marginBottom: 16, gap: 10 },
  priorityBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, height: 24, alignSelf: 'flex-start' },
  priorityText:      { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  improvementHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  improvementTitle:  { fontSize: 14, fontWeight: '600', color: '#2C2C2C', flex: 1 },
  improvementDesc:   { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  reasonItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  reasonText: { flex: 1, fontSize: 13, color: '#0A2540', lineHeight: 20 },

  recalcButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#0A2540', borderRadius: 30,
    paddingVertical: 14, marginTop: 8, gap: 8,
  },
  recalcText: { fontSize: 15, fontWeight: '600', color: '#0A2540' },
});

export default CreditScoreScreen;