// app/services/LoanDecisionService.js
// ═══════════════════════════════════════════════════════════════
// LOAN DECISION SERVICE — OpenAI + Egyptian Banking Rules
// Flow:
//   1. Check Egyptian hard eligibility (age, income, employment, DTI)
//   2. Call OpenAI for real AI prediction
//   3. If OpenAI fails → use rule-based fallback (CreditScoreCalculator)
//   4. Return unified result object consumed by credit.js + RiskChart
// ═══════════════════════════════════════════════════════════════

import CreditScoreCalculator from './CreditScoreCalculator';
import { predictLoanEligibility } from './OpenAiService';
import { AIBasedStrategy } from './ScoringStrategy';

class LoanDecisionService {
  constructor() {
    this.calculator         = new CreditScoreCalculator(new AIBasedStrategy());
    this.APPROVAL_THRESHOLD = 580;
    this.MIN_INCOME_EGP     = 10000;
    this.MAX_DTI            = 50;
  }

  /**
   * Main entry point — async because it calls OpenAI
   * @param {UserFinancialProfile} profile
   * @returns {Promise<object>} unified decision object
   */
  async makeDecision(profile) {

    // ── Step 1: Egyptian hard eligibility ─────────────────────
    const eligibilityIssues = profile.getEgyptianEligibilityIssues
      ? profile.getEgyptianEligibilityIssues()
      : this._fallbackEligibility(profile);

    if (eligibilityIssues.length > 0) {
      return {
        approved:          false,
        confidence:        0,
        score:             300,
        riskLevel:         'Very High',
        rating:            'Poor',
        hardReject:        true,
        hardRejectReasons: eligibilityIssues,
        reasons: [
          '❌ Personal Loan DENIED — Egyptian bank eligibility requirements not met',
          ...eligibilityIssues,
        ],
        positiveFactors:   [],
        negativeFactors:   eligibilityIssues,
        recommendations:   this._buildImprovementRecs(profile),
        interestRateRange: [0, 0],
        maxLoanAmount:     0,
        breakdown:         this._buildFallbackBreakdown(profile),
        financialHealthSummary: profile.getFinancialHealthSummary
          ? profile.getFinancialHealthSummary()
          : 'Poor financial health',
        source: 'eligibility-check',
      };
    }

    // ── Step 2: Try OpenAI prediction ─────────────────────────
    const profileData = {
      ...profile.toJSON(),
      dti:                    profile.calculateDTI(),
      disposableIncome:       profile.calculateDisposableIncome(),
      savingsRate:            profile.calculateSavingsRate(),
      employmentStabilityScore: profile.getEmploymentStabilityScore(),
      loanToIncomeRatio:      profile.calculateLoanToIncomeRatio(),
    };

    const aiResult = await predictLoanEligibility(profileData);

    if (aiResult.success && aiResult.data) {
      return this._buildFromAI(aiResult.data, profile);
    }

    // ── Step 3: Rule-based fallback ────────────────────────────
    console.warn('OpenAI unavailable — using rule-based fallback');
    return this._buildFromRules(profile);
  }

  // ── Build result from OpenAI response ─────────────────────
  _buildFromAI(ai, profile) {
    const approved = ai.approved === true;

    // Normalise factorScores → breakdown format expected by RiskChart
    const breakdown = {};
    if (ai.factorScores) {
      Object.entries(ai.factorScores).forEach(([key, f]) => {
        breakdown[key] = {
          label:  f.label,
          value:  f.value,
          impact: f.impact,
          score:  f.score,
          maxScore: f.maxScore,
        };
      });
    }

    const recs = approved
      ? [{
          type:         'Personal Loan (قرض شخصي)',
          description:  'Unsecured personal loan — salary transfer to bank required',
          maxAmount:    ai.maxLoanAmount || 0,
          interestRate: `${ai.interestRateMin}% – ${ai.interestRateMax}% per annum`,
          term:         `Up to ${ai.loanTermMonths || 84} months`,
          icon:         'person',
          suitability:  ai.creditScore >= 700 ? 'Highly Suitable' : 'Suitable',
          notes:        'Employer must be on bank approved list. Salary transfer mandatory.',
        }]
      : (ai.recommendations || this._buildImprovementRecs(profile));

    return {
      approved,
      confidence:        ai.approvalProbability    || 0,
      score:             ai.creditScore            || 300,
      riskLevel:         ai.riskLevel              || 'Very High',
      rating:            ai.rating                 || 'Poor',
      hardReject:        false,
      hardRejectReasons: [],
      reasons:           ai.reasons               || [],
      positiveFactors:   ai.positiveFactors        || [],
      negativeFactors:   ai.negativeFactors        || [],
      recommendations:   recs,
      interestRateRange: [ai.interestRateMin || 0, ai.interestRateMax || 0],
      maxLoanAmount:     ai.maxLoanAmount          || 0,
      recommendedMonthlyInstallment: ai.recommendedMonthlyInstallment || 0,
      breakdown,
      financialHealthSummary: ai.financialHealthSummary || '',
      source: 'openai',
    };
  }

  // ── Rule-based fallback ────────────────────────────────────
  _buildFromRules(profile) {
    const scoreResult     = this.calculator.calculateScore(profile);
    const score           = scoreResult.success ? scoreResult.score : 300;
    const riskLevel       = scoreResult.riskLevel  || 'Very High';
    const rating          = scoreResult.rating      || 'Poor';
    const approved        = score >= this.APPROVAL_THRESHOLD;
    const confidence      = this.calculator.getApprovalProbability(score);
    const explanation     = this._generateExplanation(profile, score, approved);
    const interestRange   = this._getInterestRange(score);
    const maxLoan         = this._getMaxLoan(profile, score);

    const recs = approved
      ? [{
          type:         'Personal Loan (قرض شخصي)',
          description:  'Unsecured personal loan — salary transfer required',
          maxAmount:    maxLoan,
          interestRate: `${interestRange[0]}% – ${interestRange[1]}% per annum`,
          term:         'Up to 84 months',
          icon:         'person',
          suitability:  score >= 700 ? 'Highly Suitable' : 'Suitable',
          notes:        'Employer must be on bank approved list. Salary transfer mandatory.',
        }]
      : this._buildImprovementRecs(profile);

    return {
      approved,
      confidence,
      score,
      riskLevel,
      rating,
      hardReject:        false,
      hardRejectReasons: [],
      reasons:           explanation.reasons,
      positiveFactors:   explanation.positiveFactors,
      negativeFactors:   explanation.negativeFactors,
      recommendations:   recs,
      interestRateRange: interestRange,
      maxLoanAmount:     maxLoan,
      breakdown:         scoreResult.breakdown || this._buildFallbackBreakdown(profile),
      financialHealthSummary: profile.getFinancialHealthSummary(),
      source: 'rule-based',
    };
  }

  // ── Breakdown when CreditScoreCalculator isn't called ─────
  _buildFallbackBreakdown(profile) {
    const dti    = profile.calculateDTI();
    const sr     = profile.calculateSavingsRate();
    const empSc  = profile.getEmploymentStabilityScore();
    return {
      dti:        { label: 'Debt-to-Income Ratio',   value: `${dti.toFixed(1)}%`,    impact: dti < 20 ? 'Positive' : dti < 40 ? 'Neutral' : 'Negative' },
      income:     { label: 'Monthly Income',          value: `EGP ${profile.monthlyIncome.toLocaleString()}`, impact: profile.monthlyIncome >= 20000 ? 'Positive' : profile.monthlyIncome >= 10000 ? 'Neutral' : 'Negative' },
      employment: { label: 'Employment Stability',    value: `${empSc}/100`,          impact: empSc >= 70 ? 'Positive' : empSc >= 50 ? 'Neutral' : 'Negative' },
      savings:    { label: 'Savings Rate',            value: `${sr.toFixed(1)}%`,     impact: sr >= 15 ? 'Positive' : sr >= 5 ? 'Neutral' : 'Negative' },
      age:        { label: 'Age Factor',              value: `${profile.age} years`,  impact: profile.age >= 30 && profile.age <= 50 ? 'Positive' : 'Neutral' },
    };
  }

  // ── Explanation generator (rule-based) ────────────────────
  _generateExplanation(profile, score, approved) {
    const pos = [], neg = [], reasons = [];
    const dti = profile.calculateDTI();
    const sr  = profile.calculateSavingsRate();
    const emp = profile.getEmploymentStabilityScore();
    const lti = profile.calculateLoanToIncomeRatio();

    // DTI
    if      (dti < 20) { pos.push('Excellent DTI'); reasons.push(`DTI of ${dti.toFixed(1)}% is excellent`); }
    else if (dti < 40) { pos.push('Acceptable DTI'); reasons.push(`DTI of ${dti.toFixed(1)}% is within Egyptian bank range`); }
    else if (dti < 50) { neg.push('High DTI');       reasons.push(`DTI of ${dti.toFixed(1)}% is high — banks prefer under 40%`); }
    else               { neg.push('DTI exceeds limit'); reasons.push(`DTI of ${dti.toFixed(1)}% exceeds the 50% Egyptian limit`); }

    // Income
    if      (profile.monthlyIncome >= 30000) { pos.push('Strong income');              reasons.push(`Monthly income EGP ${profile.monthlyIncome.toLocaleString()} is strong`); }
    else if (profile.monthlyIncome >= 15000) { pos.push('Adequate income');             }
    else if (profile.monthlyIncome >= 10000) { pos.push('Income meets minimum');        reasons.push('Income meets the EGP 10,000 Egyptian minimum'); }
    else                                     { neg.push('Income below minimum');        reasons.push(`Income EGP ${profile.monthlyIncome.toLocaleString()} is below EGP 10,000 minimum`); }

    // Employment
    if      (emp >= 85) { pos.push('Stable permanent employment'); reasons.push('Permanent employment — strongly preferred by Egyptian banks'); }
    else if (emp >= 60) { pos.push('Acceptable employment');        }
    else if (emp > 0)   { neg.push('Limited employment stability'); reasons.push('Employment stability needs improvement'); }
    else                { neg.push('No employment');                reasons.push('Unemployed — Egyptian banks require active employment'); }

    // Savings
    if      (sr > 20) pos.push('Excellent savings discipline');
    else if (sr > 10) pos.push('Good savings habits');
    else if (sr > 0)  neg.push('Limited savings capacity');
    else              { neg.push('No savings capacity'); reasons.push('No disposable income — high risk'); }

    // Age
    if      (profile.age >= 30 && profile.age <= 50) pos.push('Optimal age (30–50)');
    else if (profile.age >= 21 && profile.age <= 65) pos.push('Age within eligible range');

    // LTI
    if      (lti > 5) { neg.push('Very high loan amount'); reasons.push('Requested loan is very large relative to annual income'); }
    else if (lti > 3) { neg.push('High loan-to-income ratio'); }
    else if (lti <= 2){ pos.push('Reasonable loan amount'); }

    if (approved) reasons.unshift(`✅ Personal Loan APPROVED — Score ${score} meets requirements`);
    else          reasons.unshift(`❌ Personal Loan DENIED — Score ${score} below threshold (${this.APPROVAL_THRESHOLD})`);

    return { positiveFactors: pos, negativeFactors: neg, reasons };
  }

  // ── Improvement recommendations (EGP context) ─────────────
  _buildImprovementRecs(profile) {
    const recs = [];
    const dti  = profile.calculateDTI();
    const sr   = profile.calculateSavingsRate();
    const lti  = profile.calculateLoanToIncomeRatio();

    if (dti > 40)
      recs.push({ title: 'Reduce Debt-to-Income Ratio', description: `Your DTI is ${dti.toFixed(1)}%. Egyptian banks prefer under 40%. Reduce monthly expenses or pay off existing debts.`, priority: 'high', icon: 'trending-down' });

    if (profile.monthlyIncome < this.MIN_INCOME_EGP)
      recs.push({ title: 'Increase Monthly Income', description: `Egyptian banks require at least EGP ${this.MIN_INCOME_EGP.toLocaleString()}/month. Yours is EGP ${profile.monthlyIncome.toLocaleString()}.`, priority: 'high', icon: 'trending-up' });

    if (profile.employmentType === 'unemployed')
      recs.push({ title: 'Obtain Active Employment', description: 'Egyptian banks require a salary and active employment. Seek a permanent or contract position.', priority: 'high', icon: 'briefcase' });

    if (profile.employmentYears < 0.5)
      recs.push({ title: 'Complete Probation Period', description: 'You must complete at least 6 months at your current employer before applying.', priority: 'high', icon: 'time' });

    if (profile.existingDebts > 0)
      recs.push({ title: 'Pay Down Existing Debts', description: `Reduce your EGP ${profile.existingDebts.toLocaleString()} debt to improve your DTI ratio significantly.`, priority: 'high', icon: 'card' });

    if (sr < 10)
      recs.push({ title: 'Build Savings', description: 'Aim to save at least 10% of monthly income to demonstrate financial discipline.', priority: 'medium', icon: 'wallet' });

    if (lti > 3)
      recs.push({ title: 'Request a Lower Loan Amount', description: 'Egyptian banks approve personal loans up to ~3–4× annual income. Consider a lower amount.', priority: 'medium', icon: 'cash' });

    return recs;
  }

  // ── Fallback eligibility check ─────────────────────────────
  _fallbackEligibility(profile) {
    const issues = [];
    if (profile.age < 21)                     issues.push('Must be at least 21 years old');
    if (profile.age > 65)                     issues.push('Must be under 65 years old');
    if (profile.monthlyIncome < this.MIN_INCOME_EGP)
      issues.push(`Monthly income must be at least EGP ${this.MIN_INCOME_EGP.toLocaleString()}`);
    if (profile.employmentType === 'unemployed') issues.push('Must be employed');
    if (profile.employmentYears < 0.5)        issues.push('Must complete probation (6+ months)');
    if (profile.calculateDTI() > this.MAX_DTI) issues.push(`DTI exceeds ${this.MAX_DTI}%`);
    return issues;
  }

  // ── Egyptian interest rates (CBE-based, 2024–2025) ─────────
  _getInterestRange(score) {
    if (score >= 750) return [25, 27];
    if (score >= 700) return [27, 29];
    if (score >= 650) return [29, 31];
    if (score >= 600) return [31, 33];
    return [33, 35];
  }

  // ── Max loan (40% installment rule, max 84 months) ─────────
  _getMaxLoan(profile, score) {
    const annualIncome   = profile.monthlyIncome * 12;
    let multiplier = 2;
    if      (score >= 750) multiplier = 4.0;
    else if (score >= 700) multiplier = 3.5;
    else if (score >= 650) multiplier = 3.0;
    else if (score >= 600) multiplier = 2.5;

    const maxByIncome      = annualIncome * multiplier;
    const maxInstallment   = profile.monthlyIncome * 0.40; // Egyptian 40% rule
    const maxByInstallment = maxInstallment * 84;          // 84 months max

    return Math.floor(Math.min(maxByIncome, maxByInstallment));
  }
}

export default LoanDecisionService;