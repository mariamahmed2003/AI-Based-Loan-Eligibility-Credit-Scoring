// app/services/CreditScoreCalculator.js
// ═══════════════════════════════════════════════════════════════
// CREDIT SCORE CALCULATOR
// SOLID: Dependency Injection - Strategy pattern implementation
// Uses different scoring strategies interchangeably
// ═══════════════════════════════════════════════════════════════

import {
  AggressiveStrategy,
  AIBasedStrategy,
  BalancedStrategy,
  ConservativeStrategy
} from './ScoringStrategy';

/**
 * Credit Score Calculator Class
 * Calculates credit scores using different strategies
 * Implements Strategy Pattern for flexibility
 */
class CreditScoreCalculator {
  /**
   * Constructor
   * @param {ScoringStrategy} strategy - Scoring strategy to use (default: AI-Based)
   */
  constructor(strategy = null) {
    // Default to AI-Based strategy if none provided
    this.strategy = strategy || new AIBasedStrategy();
  }

  /**
   * Set scoring strategy
   * @param {ScoringStrategy} strategy - New scoring strategy
   */
  setStrategy(strategy) {
    this.strategy = strategy;
  }

  /**
   * Calculate credit score using current strategy
   * @param {UserFinancialProfile} profile - User's financial profile
   * @returns {object} - Score and details
   */
  calculateScore(profile) {
    // Validate profile first
    const validation = profile.validate();
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        score: 300
      };
    }

    // Calculate score using strategy
    const score = this.strategy.calculateScore(profile);

    // Get risk level
    const riskLevel = this.getRiskLevel(score);

    // Get score rating
    const rating = this.getScoreRating(score);

    return {
      success: true,
      score: score,
      riskLevel: riskLevel,
      rating: rating,
      strategy: this.strategy.getName(),
      breakdown: this.getScoreBreakdown(profile, score)
    };
  }

  /**
   * Calculate scores using all strategies for comparison
   * @param {UserFinancialProfile} profile - User's financial profile
   * @returns {object} - Scores from all strategies
   */
  calculateAllScores(profile) {
    const strategies = [
      new ConservativeStrategy(),
      new BalancedStrategy(),
      new AggressiveStrategy(),
      new AIBasedStrategy()
    ];

    const results = {};

    strategies.forEach(strategy => {
      this.setStrategy(strategy);
      const result = this.calculateScore(profile);
      results[strategy.getName()] = result;
    });

    return results;
  }

  /**
   * Get risk level based on credit score
   * @param {number} score - Credit score
   * @returns {string} - Risk level
   */
  getRiskLevel(score) {
    if (score >= 750) return 'Very Low';
    if (score >= 700) return 'Low';
    if (score >= 650) return 'Moderate';
    if (score >= 600) return 'High';
    return 'Very High';
  }

  /**
   * Get score rating description
   * @param {number} score - Credit score
   * @returns {string} - Rating description
   */
  getScoreRating(score) {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  }

  /**
   * Get color for risk level (for UI)
   * @param {string} riskLevel - Risk level
   * @returns {string} - Color code
   */
  getRiskColor(riskLevel) {
    const colors = {
      'Very Low': '#2ECC71',    // Green
      'Low': '#27AE60',          // Dark Green
      'Moderate': '#F39C12',     // Orange
      'High': '#E67E22',         // Dark Orange
      'Very High': '#E74C3C'     // Red
    };
    return colors[riskLevel] || '#95A5A6';
  }

  /**
   * Get detailed score breakdown
   * @param {UserFinancialProfile} profile - User's financial profile
   * @param {number} score - Calculated credit score
   * @returns {object} - Detailed breakdown
   */
  getScoreBreakdown(profile, score) {
    return {
      dti: {
        value: profile.calculateDTI().toFixed(2) + '%',
        label: 'Debt-to-Income Ratio',
        impact: this.getImpactLevel(profile.calculateDTI(), [20, 36, 50])
      },
      income: {
        value: '$' + profile.monthlyIncome.toLocaleString(),
        label: 'Monthly Income',
        impact: this.getImpactLevel(profile.monthlyIncome, [3000, 5000, 10000], false)
      },
      employment: {
        value: profile.getEmploymentStabilityScore() + '/100',
        label: 'Employment Stability',
        impact: this.getImpactLevel(profile.getEmploymentStabilityScore(), [40, 60, 80], false)
      },
      savings: {
        value: profile.calculateSavingsRate().toFixed(2) + '%',
        label: 'Savings Rate',
        impact: this.getImpactLevel(profile.calculateSavingsRate(), [5, 10, 20], false)
      },
      age: {
        value: profile.age + ' years',
        label: 'Age',
        impact: this.getAgeImpact(profile.age)
      }
    };
  }

  /**
   * Get impact level (Positive/Neutral/Negative)
   * @param {number} value - Value to check
   * @param {array} thresholds - Threshold array [bad, okay, good]
   * @param {boolean} lowerIsBetter - If true, lower values are better
   * @returns {string} - Impact level
   */
  getImpactLevel(value, thresholds, lowerIsBetter = true) {
    if (lowerIsBetter) {
      if (value < thresholds[0]) return 'Positive';
      if (value < thresholds[1]) return 'Neutral';
      return 'Negative';
    } else {
      if (value > thresholds[2]) return 'Positive';
      if (value > thresholds[1]) return 'Neutral';
      return 'Negative';
    }
  }

  /**
   * Get age impact (special handling for age)
   * @param {number} age - Age value
   * @returns {string} - Impact level
   */
  getAgeImpact(age) {
    if (age >= 30 && age <= 50) return 'Positive';
    if ((age >= 25 && age < 30) || (age > 50 && age <= 60)) return 'Neutral';
    return 'Negative';
  }

  /**
   * Get approval probability percentage
   * @param {number} score - Credit score
   * @returns {number} - Approval probability (0-100)
   */
  getApprovalProbability(score) {
    if (score >= 750) return 95;
    if (score >= 700) return 85;
    if (score >= 650) return 70;
    if (score >= 600) return 50;
    if (score >= 550) return 30;
    return 15;
  }
}

export default CreditScoreCalculator;