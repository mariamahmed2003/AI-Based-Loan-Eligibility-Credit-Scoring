// app/services/LoanDecisionService.js
// ═══════════════════════════════════════════════════════════════
// LOAN DECISION SERVICE
// SOLID: Single Responsibility - Handles loan approval decisions only
// Provides explainable AI output for loan decisions
// ═══════════════════════════════════════════════════════════════

import CreditScoreCalculator from './CreditScoreCalculator';
import { AIBasedStrategy } from './ScoringStrategy';

/**
 * Loan Decision Service Class
 * Makes loan approval decisions based on credit score and other factors
 * Provides explainable AI reasoning
 */
class LoanDecisionService {
  constructor() {
    // Use AI-Based strategy for decisions
    this.calculator = new CreditScoreCalculator(new AIBasedStrategy());
  }

  /**
   * Make loan decision
   * @param {UserFinancialProfile} profile - User's financial profile
   * @returns {object} - Decision with explanation
   */
  makeDecision(profile) {
    // Calculate credit score
    const scoreResult = this.calculator.calculateScore(profile);

    if (!scoreResult.success) {
      return {
        approved: false,
        confidence: 0,
        score: 300,
        reasons: scoreResult.errors,
        recommendations: this.getImprovementRecommendations(profile)
      };
    }

    const { score, riskLevel } = scoreResult;

    // Get approval probability
    const approvalProbability = this.calculator.getApprovalProbability(score);

    // Make decision
    const approved = score >= 580; // Minimum threshold for approval

    // Get explanation
    const explanation = this.generateExplanation(profile, score, approved);

    // Get recommendations
    const recommendations = approved 
      ? this.getLoanRecommendations(profile, score)
      : this.getImprovementRecommendations(profile);

    return {
      approved: approved,
      confidence: approvalProbability,
      score: score,
      riskLevel: riskLevel,
      reasons: explanation.reasons,
      positiveFactors: explanation.positiveFactors,
      negativeFactors: explanation.negativeFactors,
      recommendations: recommendations,
      interestRateRange: this.getInterestRateRange(score),
      maxLoanAmount: this.getMaxLoanAmount(profile, score),
      breakdown: scoreResult.breakdown
    };
  }

  /**
   * Generate explainable AI output
   * @param {UserFinancialProfile} profile - User's financial profile
   * @param {number} score - Credit score
   * @param {boolean} approved - Approval decision
   * @returns {object} - Explanation with reasons
   */
  generateExplanation(profile, score, approved) {
    const positiveFactors = [];
    const negativeFactors = [];
    const reasons = [];

    // Analyze DTI
    const dti = profile.calculateDTI();
    if (dti < 20) {
      positiveFactors.push('Excellent debt-to-income ratio');
      reasons.push('Your debt-to-income ratio is excellent (under 20%)');
    } else if (dti < 36) {
      positiveFactors.push('Good debt-to-income ratio');
      reasons.push('Your debt-to-income ratio is within acceptable range');
    } else if (dti < 50) {
      negativeFactors.push('High debt-to-income ratio');
      reasons.push('Your debt-to-income ratio is high (' + dti.toFixed(1) + '%)');
    } else {
      negativeFactors.push('Very high debt burden');
      reasons.push('Your debt-to-income ratio is too high (' + dti.toFixed(1) + '%)');
    }

    // Analyze Income
    if (profile.monthlyIncome > 5000) {
      positiveFactors.push('Strong income level');
      reasons.push('Your monthly income is strong');
    } else if (profile.monthlyIncome > 3000) {
      positiveFactors.push('Adequate income level');
    } else {
      negativeFactors.push('Low income level');
      reasons.push('Your income level may limit loan approval');
    }

    // Analyze Employment
    const employmentScore = profile.getEmploymentStabilityScore();
    if (employmentScore > 70) {
      positiveFactors.push('Stable employment history');
      reasons.push('Your employment is stable and secure');
    } else if (employmentScore > 50) {
      positiveFactors.push('Acceptable employment status');
    } else if (employmentScore > 0) {
      negativeFactors.push('Limited employment stability');
      reasons.push('Your employment stability could be stronger');
    } else {
      negativeFactors.push('No current employment');
      reasons.push('Currently unemployed - major risk factor');
    }

    // Analyze Savings
    const savingsRate = profile.calculateSavingsRate();
    if (savingsRate > 20) {
      positiveFactors.push('Excellent savings discipline');
      reasons.push('You demonstrate excellent financial discipline');
    } else if (savingsRate > 10) {
      positiveFactors.push('Good savings habits');
    } else if (savingsRate > 0) {
      negativeFactors.push('Limited savings');
    } else {
      negativeFactors.push('No savings capacity');
      reasons.push('No disposable income for savings - high risk');
    }

    // Analyze Age
    if (profile.age >= 30 && profile.age <= 50) {
      positiveFactors.push('Optimal age range for borrowing');
    } else if (profile.age < 25) {
      negativeFactors.push('Young borrower - limited credit history expected');
    } else if (profile.age > 60) {
      negativeFactors.push('Near retirement age - repayment concerns');
    }

    // Analyze Loan Amount
    const loanToIncome = profile.calculateLoanToIncomeRatio();
    if (loanToIncome > 4) {
      negativeFactors.push('Loan amount too high relative to income');
      reasons.push('Requested loan amount is very high compared to your income');
    } else if (loanToIncome > 3) {
      negativeFactors.push('High loan-to-income ratio');
    } else if (loanToIncome < 2) {
      positiveFactors.push('Reasonable loan amount requested');
    }

    // Final decision reason
    if (approved) {
      reasons.unshift('✅ Loan APPROVED - Credit score meets minimum requirements');
    } else {
      reasons.unshift('❌ Loan DENIED - Credit score below minimum threshold (580)');
    }

    return {
      reasons,
      positiveFactors,
      negativeFactors
    };
  }

  /**
   * Get improvement recommendations for rejected loans
   * @param {UserFinancialProfile} profile - User's financial profile
   * @returns {array} - List of recommendations
   */
  getImprovementRecommendations(profile) {
    const recommendations = [];

    const dti = profile.calculateDTI();
    if (dti > 36) {
      recommendations.push({
        title: 'Reduce Your Debt-to-Income Ratio',
        description: 'Your DTI is ' + dti.toFixed(1) + '%. Try to reduce expenses or pay down existing debts to get below 36%.',
        priority: 'high',
        icon: 'trending-down'
      });
    }

    if (profile.monthlyIncome < 3000) {
      recommendations.push({
        title: 'Increase Your Income',
        description: 'Consider additional income sources or negotiate a raise to improve your financial position.',
        priority: 'high',
        icon: 'trending-up'
      });
    }

    const employmentScore = profile.getEmploymentStabilityScore();
    if (employmentScore < 50) {
      recommendations.push({
        title: 'Improve Employment Stability',
        description: 'Seek permanent employment or build a longer employment history.',
        priority: 'medium',
        icon: 'briefcase'
      });
    }

    const savingsRate = profile.calculateSavingsRate();
    if (savingsRate < 10) {
      recommendations.push({
        title: 'Build Your Savings',
        description: 'Try to save at least 10% of your monthly income to demonstrate financial discipline.',
        priority: 'medium',
        icon: 'wallet'
      });
    }

    if (profile.existingDebts > 0) {
      recommendations.push({
        title: 'Pay Down Existing Debts',
        description: 'Focus on reducing your existing debt burden before applying for new loans.',
        priority: 'high',
        icon: 'card'
      });
    }

    const loanToIncome = profile.calculateLoanToIncomeRatio();
    if (loanToIncome > 3) {
      recommendations.push({
        title: 'Request a Lower Loan Amount',
        description: 'Consider requesting a smaller loan amount relative to your annual income.',
        priority: 'medium',
        icon: 'cash'
      });
    }

    return recommendations;
  }

  /**
   * Get loan recommendations for approved loans
   * @param {UserFinancialProfile} profile - User's financial profile
   * @param {number} score - Credit score
   * @returns {array} - List of loan options
   */
  getLoanRecommendations(profile, score) {
    const recommendations = [];
    const maxAmount = this.getMaxLoanAmount(profile, score);
    const interestRange = this.getInterestRateRange(score);

    // Personal Loan
    recommendations.push({
      type: 'Personal Loan',
      description: 'Unsecured loan for any purpose',
      maxAmount: maxAmount,
      interestRate: interestRange,
      term: '1-5 years',
      icon: 'person',
      suitability: score >= 700 ? 'Highly Suitable' : 'Suitable'
    });

    // Home Loan (if income is sufficient)
    if (profile.monthlyIncome > 5000) {
      recommendations.push({
        type: 'Home Loan',
        description: 'Mortgage for home purchase',
        maxAmount: maxAmount * 5, // Higher for mortgages
        interestRate: (interestRange[0] - 1) + '% - ' + (interestRange[1] - 1) + '%',
        term: '15-30 years',
        icon: 'home',
        suitability: score >= 680 ? 'Highly Suitable' : 'Suitable'
      });
    }

    // Auto Loan
    recommendations.push({
      type: 'Auto Loan',
      description: 'Loan for vehicle purchase',
      maxAmount: Math.min(maxAmount * 2, profile.monthlyIncome * 48),
      interestRate: (interestRange[0] - 0.5) + '% - ' + (interestRange[1] - 0.5) + '%',
      term: '3-7 years',
      icon: 'car',
      suitability: score >= 650 ? 'Suitable' : 'Fair'
    });

    // Business Loan (if self-employed)
    if (profile.employmentType.toLowerCase() === 'self-employed') {
      recommendations.push({
        type: 'Business Loan',
        description: 'Loan for business purposes',
        maxAmount: maxAmount * 1.5,
        interestRate: (interestRange[0] + 1) + '% - ' + (interestRange[1] + 2) + '%',
        term: '1-10 years',
        icon: 'briefcase',
        suitability: score >= 670 ? 'Suitable' : 'Consider'
      });
    }

    return recommendations;
  }

  /**
   * Get interest rate range based on credit score
   * @param {number} score - Credit score
   * @returns {array} - [minRate, maxRate]
   */
  getInterestRateRange(score) {
    if (score >= 750) return [4.5, 6.5];
    if (score >= 700) return [6.5, 8.5];
    if (score >= 650) return [8.5, 11.5];
    if (score >= 600) return [11.5, 14.5];
    return [14.5, 18.5];
  }

  /**
   * Calculate maximum loan amount
   * @param {UserFinancialProfile} profile - User's financial profile
   * @param {number} score - Credit score
   * @returns {number} - Maximum loan amount
   */
  getMaxLoanAmount(profile, score) {
    const annualIncome = profile.monthlyIncome * 12;
    const disposableIncome = profile.calculateDisposableIncome();
    
    // Base multiplier on credit score
    let multiplier = 1;
    if (score >= 750) multiplier = 4;
    else if (score >= 700) multiplier = 3.5;
    else if (score >= 650) multiplier = 3;
    else if (score >= 600) multiplier = 2.5;
    else multiplier = 2;

    // Calculate based on annual income and disposable income
    const maxByIncome = annualIncome * multiplier;
    const maxByDisposable = disposableIncome * 36; // 3 years of disposable income

    // Return the more conservative amount
    return Math.floor(Math.min(maxByIncome, maxByDisposable));
  }
}

export default LoanDecisionService;