// app/services/ScoringStrategy.js
// Strategy Pattern for different scoring algorithms (SOLID - Open/Closed Principle)

/**
 * ScoringStrategy Interface (Abstract Base)
 * Defines contract for all scoring strategies
 */
class ScoringStrategy {
  /**
   * Calculate credit score
   * @param {UserFinancialProfile} profile - User financial profile
   * @returns {number} Credit score (0-100)
   */
  calculateScore(profile) {
    throw new Error('calculateScore must be implemented by subclass');
  }

  /**
   * Get strategy name
   * @returns {string} Strategy name
   */
  getName() {
    throw new Error('getName must be implemented by subclass');
  }
}

/**
 * ConservativeScoringStrategy - Strict scoring model
 * Used for high-risk scenarios or large loan amounts
 */
class ConservativeScoringStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 0;

    // Income factor (30 points max)
    const income = profile.getTotalIncome();
    if (income >= 100000) score += 30;
    else if (income >= 50000) score += 20;
    else if (income >= 30000) score += 10;
    else if (income >= 15000) score += 5;

    // Debt-to-Income ratio (25 points max) - CRITICAL
    const dti = profile.getDebtToIncomeRatio();
    if (dti < 20) score += 25;
    else if (dti < 30) score += 20;
    else if (dti < 40) score += 10;
    else if (dti < 50) score += 5;
    // Above 50% DTI = 0 points

    // Savings (20 points max)
    const savingsRatio = profile.getSavingsToIncomeRatio();
    if (savingsRatio >= 30) score += 20;
    else if (savingsRatio >= 20) score += 15;
    else if (savingsRatio >= 10) score += 10;
    else if (savingsRatio >= 5) score += 5;

    // Employment stability (15 points max)
    const stability = profile.getEmploymentStability();
    score += Math.floor(stability * 0.15);

    // Age factor (10 points max)
    if (profile.age >= 35 && profile.age <= 55) score += 10;
    else if (profile.age >= 25 && profile.age < 60) score += 7;
    else if (profile.age >= 21) score += 3;

    return Math.min(Math.max(score, 0), 100);
  }

  getName() {
    return 'Conservative';
  }
}

/**
 * StandardScoringStrategy - Balanced scoring model
 * Default strategy for general loan applications
 */
class StandardScoringStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 0;

    // Income factor (25 points max)
    const income = profile.getTotalIncome();
    if (income >= 80000) score += 25;
    else if (income >= 40000) score += 18;
    else if (income >= 20000) score += 12;
    else if (income >= 10000) score += 6;

    // Debt-to-Income ratio (30 points max)
    const dti = profile.getDebtToIncomeRatio();
    if (dti < 25) score += 30;
    else if (dti < 35) score += 22;
    else if (dti < 45) score += 15;
    else if (dti < 60) score += 8;

    // Disposable income (20 points max)
    const disposable = profile.getDisposableIncome();
    if (disposable >= 30000) score += 20;
    else if (disposable >= 15000) score += 15;
    else if (disposable >= 5000) score += 10;
    else if (disposable > 0) score += 5;

    // Employment stability (15 points max)
    const stability = profile.getEmploymentStability();
    score += Math.floor(stability * 0.15);

    // Assets (10 points max)
    const netWorth = profile.getNetWorth();
    if (netWorth >= 500000) score += 10;
    else if (netWorth >= 200000) score += 8;
    else if (netWorth >= 50000) score += 5;
    else if (netWorth > 0) score += 3;

    return Math.min(Math.max(score, 0), 100);
  }

  getName() {
    return 'Standard';
  }
}

/**
 * AggressiveScoringStrategy - Lenient scoring model
 * Used for small loans or first-time borrowers
 */
class AggressiveScoringStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 20; // Start with base score

    // Income factor (20 points max)
    const income = profile.getTotalIncome();
    if (income >= 50000) score += 20;
    else if (income >= 25000) score += 15;
    else if (income >= 15000) score += 10;
    else if (income >= 8000) score += 5;

    // Debt-to-Income ratio (25 points max) - More lenient
    const dti = profile.getDebtToIncomeRatio();
    if (dti < 35) score += 25;
    else if (dti < 50) score += 18;
    else if (dti < 70) score += 10;
    else if (dti < 90) score += 5;

    // Any positive disposable income (15 points max)
    const disposable = profile.getDisposableIncome();
    if (disposable >= 10000) score += 15;
    else if (disposable >= 5000) score += 12;
    else if (disposable >= 2000) score += 8;
    else if (disposable > 0) score += 5;

    // Employment (15 points max)
    if (profile.employmentStatus === 'employed') score += 15;
    else if (profile.employmentStatus === 'self-employed') score += 10;

    // Years at job bonus (10 points max)
    if (profile.yearsAtJob >= 3) score += 10;
    else if (profile.yearsAtJob >= 1) score += 7;
    else if (profile.yearsAtJob >= 0.5) score += 4;

    // Age consideration (15 points max)
    if (profile.age >= 25 && profile.age <= 60) score += 15;
    else if (profile.age >= 21) score += 10;

    return Math.min(Math.max(score, 0), 100);
  }

  getName() {
    return 'Aggressive';
  }
}

/**
 * ScoringStrategyFactory - Creates appropriate strategy
 * Follows Factory Pattern
 */
class ScoringStrategyFactory {
  /**
   * Get strategy based on loan amount
   * @param {number} loanAmount - Requested loan amount
   * @returns {ScoringStrategy} Appropriate strategy
   */
  static getStrategy(loanAmount) {
    if (loanAmount >= 500000) {
      return new ConservativeScoringStrategy();
    } else if (loanAmount >= 100000) {
      return new StandardScoringStrategy();
    } else {
      return new AggressiveScoringStrategy();
    }
  }

  /**
   * Get strategy by name
   * @param {string} strategyName - Strategy name
   * @returns {ScoringStrategy} Strategy instance
   */
  static getStrategyByName(strategyName) {
    switch (strategyName.toLowerCase()) {
      case 'conservative':
        return new ConservativeScoringStrategy();
      case 'standard':
        return new StandardScoringStrategy();
      case 'aggressive':
        return new AggressiveScoringStrategy();
      default:
        return new StandardScoringStrategy();
    }
  }

  /**
   * Get all available strategies
   * @returns {Array<ScoringStrategy>} All strategies
   */
  static getAllStrategies() {
    return [
      new ConservativeScoringStrategy(),
      new StandardScoringStrategy(),
      new AggressiveScoringStrategy(),
    ];
  }
}

export {
    AggressiveScoringStrategy, ConservativeScoringStrategy, ScoringStrategy, ScoringStrategyFactory, StandardScoringStrategy
};

