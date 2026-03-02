// components/RiskChart.js
// ═══════════════════════════════════════════════════════════════
// RISK CHART COMPONENT
// Visual representation of financial health / credit risk
// Shows: Score Gauge, Risk Zone Bar, Factor Radar, DTI Ring
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

// ── Risk zone colors ──────────────────────────────────────────
const RISK_COLORS = {
  'Very Low': '#2ECC71',
  'Low':      '#27AE60',
  'Moderate': '#F39C12',
  'High':     '#E67E22',
  'Very High':'#E74C3C',
};

// ── Zone segments with flex proportional to actual score ranges ──
// Total range: 300–850 = 550 points
// Very High: 300–549 = 249 pts  → flex ≈ 249/550
// High:      550–579 = 30 pts   → flex ≈ 30/550
// Moderate:  580–649 = 70 pts   → flex ≈ 70/550
// Low:       650–749 = 100 pts  → flex ≈ 100/550
// Very Low:  750–850 = 101 pts  → flex ≈ 101/550
// Using multiplied values for readability (×550):
const ZONE_SEGMENTS = [
  { label: 'Very High', color: '#E74C3C', range: '300–549',  flex: 249 },
  { label: 'High',      color: '#E67E22', range: '550–579',  flex: 30  },
  { label: 'Moderate',  color: '#F39C12', range: '580–649',  flex: 70  },
  { label: 'Low',       color: '#27AE60', range: '650–749',  flex: 100 },
  { label: 'Very Low',  color: '#2ECC71', range: '750–850',  flex: 101 },
];

// ── Score → percentage position on zone bar (300–850 range) ──────
// Returns 0–100 where 0 = score of 300, 100 = score of 850
const scoreToPercent = (score) =>
  Math.min(100, Math.max(0, ((score - 300) / 550) * 100));

// ── DTI classification helpers (Egyptian banking standards) ───────
// ≤ 30%     → Positive / Ideal       → Green  (#2ECC71)
// 31%–40%   → Neutral  / Acceptable  → Orange (#F39C12)
// > 40%     → Negative / High        → Red    (#E74C3C)
const getDTIColor = (dti) => {
  if (dti <= 30) return '#2ECC71';
  if (dti <= 40) return '#F39C12';
  return '#E74C3C';
};

const getDTISublabel = (dti) => {
  if (dti <= 30) return 'Ideal';
  if (dti <= 40) return 'Acceptable';
  return 'High';
};

// ── Single animated bar ───────────────────────────────────────
const AnimatedBar = ({ value, maxValue, color, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = Math.min(100, Math.max(0, (value / maxValue) * 100));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

// ── Circular ring (DTI / Savings) ─────────────────────────────
const RingIndicator = ({ percent, color, size = 72, strokeWidth = 8, label, sublabel }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [clamped]);

  // We simulate the ring with a View arc using borders
  const rotation = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ alignItems: 'center', width: size + 20 }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Filled arc overlay */}
        <Animated.View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: clamped > 75 ? color : 'transparent',
          borderRightColor: clamped > 50 ? color : 'transparent',
          borderBottomColor: clamped > 25 ? color : 'transparent',
          borderLeftColor: color,
          transform: [{ rotate: rotation }],
        }} />
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#2C2C2C' }}>
          {Math.round(clamped)}%
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'center' }}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={{ fontSize: 10, color: color, fontWeight: '600', textAlign: 'center' }}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
};

// ── Score pointer on zone bar ─────────────────────────────────
const ZoneBar = ({ score }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = scoreToPercent(score);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: pct,
      tension: 60,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // Pointer half-width is 3px. We clamp so it never overflows the bar.
  // At 0% we clamp left to 0, at 100% we clamp to 100% minus the pointer width.
  const POINTER_WIDTH = 6;

  return (
    <View style={{ marginTop: 6 }}>
      {/* Segments — flex values are proportional to actual score ranges */}
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
        {ZONE_SEGMENTS.map((seg) => (
          <View key={seg.label} style={{ flex: seg.flex, backgroundColor: seg.color }} />
        ))}
      </View>

      {/* Pointer — rendered OUTSIDE the bar so overflow: hidden doesn't clip it */}
      <View style={{ position: 'relative', height: 22, marginTop: -22 }} pointerEvents="none">
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            // Translate so the centre of the pointer aligns with the score position.
            // We subtract half the pointer width (3px) to centre it.
            left: anim.interpolate({
              inputRange:  [0,   100],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
            width: POINTER_WIDTH,
            height: 22,
            backgroundColor: '#0A2540',
            borderRadius: 3,
            // Shift left by half pointer width to centre on the score position
            marginLeft: -(POINTER_WIDTH / 2),
          }}
        />
      </View>

      {/* Range labels — positioned to match segment boundaries */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={zoneStyles.rangeLabel}>300</Text>
        {/* 550 is at (249/550)*100 ≈ 45.27% from left */}
        <Text style={[zoneStyles.rangeLabel, { position: 'absolute', left: '45.27%' }]}>550</Text>
        {/* 580 is at (280/550)*100 ≈ 50.9% from left */}
        <Text style={[zoneStyles.rangeLabel, { position: 'absolute', left: '50.9%' }]}>580</Text>
        {/* 650 is at (350/550)*100 ≈ 63.6% from left */}
        <Text style={[zoneStyles.rangeLabel, { position: 'absolute', left: '63.6%' }]}>650</Text>
        {/* 750 is at (450/550)*100 ≈ 81.8% from left */}
        <Text style={[zoneStyles.rangeLabel, { position: 'absolute', left: '81.8%' }]}>750</Text>
        <Text style={zoneStyles.rangeLabel}>850</Text>
      </View>

      {/* Zone legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 }}>
        {ZONE_SEGMENTS.map((seg) => (
          <View key={seg.label} style={zoneStyles.legendItem}>
            <View style={[zoneStyles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={zoneStyles.legendText}>{seg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const zoneStyles = StyleSheet.create({
  rangeLabel: { fontSize: 10, color: '#6B7280' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 11, color: '#6B7280' },
});

// ── Factor rows (breakdown bars) ──────────────────────────────
const FACTOR_CONFIG = [
  { key: 'dti',        label: 'Debt-to-Income',      icon: '📉', maxValue: 100, lowerIsBetter: true },
  { key: 'income',     label: 'Income Strength',     icon: '💰', maxValue: 100, lowerIsBetter: false },
  { key: 'employment', label: 'Employment Stability', icon: '💼', maxValue: 100, lowerIsBetter: false },
  { key: 'savings',    label: 'Savings Rate',         icon: '🏦', maxValue: 100, lowerIsBetter: false },
  { key: 'age',        label: 'Age Factor',           icon: '📅', maxValue: 100, lowerIsBetter: false },
];

const impactToScore = (impact) => {
  if (impact === 'Positive') return 80;
  if (impact === 'Neutral')  return 50;
  return 20;
};

const impactToColor = (impact) => {
  if (impact === 'Positive') return '#2ECC71';
  if (impact === 'Neutral')  return '#F39C12';
  return '#E74C3C';
};

// ═══════════════════════════════════════════════════════════════
// MAIN RISK CHART COMPONENT
// Props:
//   scoreResult  — from CreditScoreCalculator.calculateScore()
//   loanDecision — from LoanDecisionService.makeDecision()
//   profile      — UserFinancialProfile instance (optional, for raw values)
// ═══════════════════════════════════════════════════════════════
const RiskChart = ({ scoreResult, loanDecision, profile }) => {
  if (!scoreResult) return null;

  const { score, riskLevel, breakdown } = scoreResult;
  const riskColor = RISK_COLORS[riskLevel] || '#95A5A6';

  // DTI value for ring
  const dtiRaw = breakdown?.dti?.value
    ? parseFloat(breakdown.dti.value)
    : 0;

  // Savings value for ring
  const savingsRaw = breakdown?.savings?.value
    ? parseFloat(breakdown.savings.value)
    : 0;

  // Approval confidence
  const confidence = loanDecision?.confidence ?? 0;

  return (
    <View style={styles.container}>

      {/* ── 1. SCORE ZONE BAR ─────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Risk Zone</Text>
        <View style={styles.scoreBadgeRow}>
          <View style={[styles.scoreBadge, { backgroundColor: riskColor + '20', borderColor: riskColor }]}>
            <Text style={[styles.scoreBadgeText, { color: riskColor }]}>{score}</Text>
          </View>
          <View>
            <Text style={[styles.riskLevelText, { color: riskColor }]}>{riskLevel} Risk</Text>
            <Text style={styles.ratingText}>{scoreResult.rating}</Text>
          </View>
        </View>
        <ZoneBar score={score} />
      </View>

      {/* ── 2. KEY METRICS RINGS ──────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔢 Key Metrics</Text>
        <View style={styles.ringsRow}>
          {/* FIX: DTI ring uses getDTIColor() and getDTISublabel()
              matching Egyptian banking thresholds:
              ≤ 30% = Ideal (green), 31–40% = Acceptable (orange), >40% = High (red) */}
          <RingIndicator
            percent={Math.min(100, dtiRaw)}
            color={getDTIColor(dtiRaw)}
            label="Debt-to-Income"
            sublabel={getDTISublabel(dtiRaw)}
          />
          <RingIndicator
            percent={Math.min(100, savingsRaw * 3)}
            color={savingsRaw > 20 ? '#2ECC71' : savingsRaw > 10 ? '#F39C12' : '#E74C3C'}
            label="Savings Rate"
            sublabel={savingsRaw > 10 ? 'Healthy' : 'Low'}
          />
          <RingIndicator
            percent={confidence}
            color={loanDecision?.approved ? '#2ECC71' : '#E74C3C'}
            label="Approval Chance"
            sublabel={loanDecision?.approved ? 'Approved' : 'Declined'}
          />
        </View>
      </View>

      {/* ── 3. FACTOR BREAKDOWN BARS ─────────────────────── */}
      {breakdown && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Factor Analysis</Text>
          {FACTOR_CONFIG.map((factor, i) => {
            const item = breakdown[factor.key];
            if (!item) return null;
            const barValue = impactToScore(item.impact);
            const barColor = impactToColor(item.impact);
            return (
              <View key={factor.key} style={styles.factorRow}>
                <Text style={styles.factorIcon}>{factor.icon}</Text>
                <View style={styles.factorMid}>
                  <View style={styles.factorLabelRow}>
                    <Text style={styles.factorLabel}>{item.label || factor.label}</Text>
                    <Text style={styles.factorValue}>{item.value}</Text>
                  </View>
                  <AnimatedBar
                    value={barValue}
                    maxValue={100}
                    color={barColor}
                    delay={i * 120}
                  />
                </View>
                <View style={[styles.impactPill, { backgroundColor: barColor + '25' }]}>
                  <Text style={[styles.impactPillText, { color: barColor }]}>
                    {item.impact}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 4. POSITIVE / NEGATIVE FACTORS ───────────────── */}
      {loanDecision && (
        loanDecision.positiveFactors?.length > 0 ||
        loanDecision.negativeFactors?.length > 0
      ) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚖️ Strengths & Weaknesses</Text>
          <View style={styles.swRow}>
            {/* Strengths */}
            <View style={styles.swColumn}>
              <Text style={styles.swHeader}>✅ Strengths</Text>
              {(loanDecision.positiveFactors || []).map((f, i) => (
                <View key={i} style={styles.swItem}>
                  <View style={[styles.swDot, { backgroundColor: '#2ECC71' }]} />
                  <Text style={styles.swText}>{f}</Text>
                </View>
              ))}
              {(!loanDecision.positiveFactors || loanDecision.positiveFactors.length === 0) && (
                <Text style={styles.swEmpty}>None identified</Text>
              )}
            </View>

            {/* Divider */}
            <View style={styles.swDivider} />

            {/* Weaknesses */}
            <View style={styles.swColumn}>
              <Text style={styles.swHeader}>⚠️ Weaknesses</Text>
              {(loanDecision.negativeFactors || []).map((f, i) => (
                <View key={i} style={styles.swItem}>
                  <View style={[styles.swDot, { backgroundColor: '#E74C3C' }]} />
                  <Text style={styles.swText}>{f}</Text>
                </View>
              ))}
              {(!loanDecision.negativeFactors || loanDecision.negativeFactors.length === 0) && (
                <Text style={styles.swEmpty}>None identified</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── 5. OVERALL HEALTH BAR ─────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏥 Overall Financial Health</Text>
        <View style={styles.healthBarWrapper}>
          {/* Gradient segments */}
          <View style={styles.healthSegments}>
            {['#E74C3C', '#E67E22', '#F39C12', '#27AE60', '#2ECC71'].map((c, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>

          {/* Pointer — clamped between 2% and 95% to stay visible */}
          <View style={[
            styles.healthPointer,
            { left: `${Math.min(95, Math.max(2, scoreToPercent(score)))}%` }
          ]}>
            <View style={[styles.healthPointerDot, { backgroundColor: riskColor }]} />
            <Text style={[styles.healthPointerLabel, { color: riskColor }]}>{score}</Text>
          </View>
        </View>

        {/* Labels */}
        <View style={styles.healthLabels}>
          <Text style={{ fontSize: 10, color: '#E74C3C' }}>Poor</Text>
          <Text style={{ fontSize: 10, color: '#F39C12' }}>Fair</Text>
          <Text style={{ fontSize: 10, color: '#2ECC71' }}>Excellent</Text>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 14,
  },
  // Score badge
  scoreBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  scoreBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadgeText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  riskLevelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Rings
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  // Factor rows
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  factorIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  factorMid: {
    flex: 1,
    gap: 6,
  },
  factorLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  factorLabel: {
    fontSize: 13,
    color: '#2C2C2C',
    fontWeight: '500',
  },
  factorValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  impactPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  impactPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Strengths & Weaknesses
  swRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swColumn: {
    flex: 1,
  },
  swDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  swHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 10,
  },
  swItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  swDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  swText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  swEmpty: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Health bar
  healthBarWrapper: {
    height: 30,
    borderRadius: 10,
    overflow: 'visible',
    marginBottom: 6,
  },
  healthSegments: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthPointer: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    transform: [{ translateX: -6 }],
  },
  healthPointerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  healthPointerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  healthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
});

export default RiskChart;