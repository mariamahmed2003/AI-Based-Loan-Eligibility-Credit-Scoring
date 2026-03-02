// app/services/ScoringStrategy.js
// ═══════════════════════════════════════════════════════════════
// SCORING STRATEGIES — Egyptian Banking Rules, EGP
// All strategies ONLY call methods that exist in UserFinancialProfile.
// AIBasedStrategy is the primary one used by LoanDecisionService.
// Conservative/Standard/Aggressive are used by calculateAllScores().
// ═══════════════════════════════════════════════════════════════

class ScoringStrategy {
  calculateScore(profile) { throw new Error('calculateScore must be implemented'); }
  getName()               { throw new Error('getName must be implemented'); }
}

// ── Conservative — strict, for large loan amounts ───────────
class ConservativeScoringStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 0;

    // Income (EGP annual) — 30 pts max
    const income = profile.getTotalIncome();
    if      (income >= 600000) score += 30;
    else if (income >= 360000) score += 22;
    else if (income >= 240000) score += 14;
    else if (income >= 120000) score += 6;

    // DTI — Egyptian cap 50%, ideal under 35% — 25 pts max
    const dti = profile.getDebtToIncomeRatio();
    if      (dti < 20) score += 25;
    else if (dti < 30) score += 18;
    else if (dti < 40) score += 10;
    else if (dti < 50) score += 4;

    // Savings rate — 20 pts max
    const sr = profile.getSavingsToIncomeRatio();
    if      (sr >= 25) score += 20;
    else if (sr >= 15) score += 14;
    else if (sr >= 10) score += 8;
    else if (sr >= 5)  score += 3;

    // Employment stability — 15 pts max
    score += Math.floor(profile.getEmploymentStability() * 0.15);

    // Age (Egyptian 21–65) — 10 pts max
    if      (profile.age >= 35 && profile.age <= 55) score += 10;
    else if (profile.age >= 25 && profile.age <= 60) score += 7;
    else if (profile.age >= 21 && profile.age <= 65) score += 3;

    return Math.min(Math.max(score, 0), 100);
  }
  getName() { return 'Conservative'; }
}
const ConservativeStrategy = ConservativeScoringStrategy;

// ── Balanced / Standard ─────────────────────────────────────
class StandardScoringStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 0;

    // Income — 25 pts max
    const income = profile.getTotalIncome();
    if      (income >= 480000) score += 25;
    else if (income >= 300000) score += 18;
    else if (income >= 180000) score += 12;
    else if (income >= 120000) score += 6;

    // DTI — 30 pts max
    const dti = profile.getDebtToIncomeRatio();
    if      (dti < 20) score += 30;
    else if (dti < 30) score += 22;
    else if (dti < 40) score += 14;
    else if (dti < 50) score += 6;

    // Annual disposable income — 20 pts max
    const disposable = profile.getDisposableIncome();
    if      (disposable >= 300000) score += 20;
    else if (disposable >= 180000) score += 14;
    else if (disposable >= 60000)  score += 8;
    else if (disposable > 0)       score += 3;

    // Employment stability — 15 pts max
    score += Math.floor(profile.getEmploymentStability() * 0.15);

    // Net worth estimate — 10 pts max
    const nw = profile.getNetWorth();
    if      (nw >= 500000) score += 10;
    else if (nw >= 200000) score += 7;
    else if (nw >= 60000)  score += 4;
    else if (nw > 0)       score += 2;

    return Math.min(Math.max(score, 0), 100);
  }
  getName() { return 'Standard'; }
}
const BalancedStrategy = StandardScoringStrategy;

// ── Aggressive — lenient, for small/first loans ─────────────
class AggressiveScoringStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 20; // base

    // Income — 20 pts max
    const income = profile.getTotalIncome();
    if      (income >= 300000) score += 20;
    else if (income >= 180000) score += 14;
    else if (income >= 144000) score += 9;
    else if (income >= 120000) score += 4;

    // DTI (more lenient) — 25 pts max
    const dti = profile.getDebtToIncomeRatio();
    if      (dti < 30) score += 25;
    else if (dti < 40) score += 18;
    else if (dti < 50) score += 10;

    // Monthly disposable — 15 pts max
    const disposable = profile.calculateDisposableIncome();
    if      (disposable >= 20000) score += 15;
    else if (disposable >= 10000) score += 10;
    else if (disposable >= 5000)  score += 6;
    else if (disposable > 0)      score += 2;

    // Employment type — 15 pts max
    if      (profile.employmentType === 'permanent')     score += 15;
    else if (profile.employmentType === 'contract')      score += 10;
    else if (profile.employmentType === 'self-employed') score += 7;

    // Employment years — 10 pts max
    if      (profile.employmentYears >= 5)   score += 10;
    else if (profile.employmentYears >= 3)   score += 7;
    else if (profile.employmentYears >= 1)   score += 5;
    else if (profile.employmentYears >= 0.5) score += 2;

    // Age — 15 pts max
    if      (profile.age >= 25 && profile.age <= 55) score += 15;
    else if (profile.age >= 21 && profile.age <= 65) score += 8;

    return Math.min(Math.max(score, 0), 100);
  }
  getName() { return 'Aggressive'; }
}

// ── AI-Based (primary strategy, 300–850 scale) ───────────────
// This is a rule-based fallback that closely mirrors the OpenAI
// prompt weights so results are consistent when API is unavailable.
class AIBasedStrategy extends ScoringStrategy {
  calculateScore(profile) {
    let score = 300;

    // 1. DTI — Weight 30% → max 165 pts
    const dti = profile.getDebtToIncomeRatio();
    if      (dti < 20) score += 165;
    else if (dti < 35) score += 121;
    else if (dti < 40) score += 77;
    else if (dti < 50) score += 33;
    // >= 50 = 0 (Egyptian hard cap)

    // 2. Monthly Income (EGP) — Weight 25% → max 137 pts
    const mi = profile.monthlyIncome;
    if      (mi >= 50000) score += 137;
    else if (mi >= 25000) score += 103;
    else if (mi >= 15000) score += 66;
    else if (mi >= 10000) score += 33;
    // < 10,000 = 0 (below Egyptian minimum)

    // 3. Employment Stability — Weight 20% → max 110 pts
    score += Math.floor(profile.getEmploymentStabilityScore() * 1.10);

    // 4. Employment Duration — Weight 10% → max 55 pts
    const yrs = profile.employmentYears;
    if      (yrs >= 5)   score += 55;
    else if (yrs >= 3)   score += 38;
    else if (yrs >= 1)   score += 27;
    else if (yrs >= 0.5) score += 16;
    // < 0.5 = 0 (probation not complete)

    // 5. Savings Rate — Weight 10% → max 55 pts
    const sr = profile.calculateSavingsRate();
    if      (sr >= 25) score += 55;
    else if (sr >= 15) score += 38;
    else if (sr >= 10) score += 27;
    else if (sr >= 5)  score += 16;
    else               score += 5;

    // 6. Age — Weight 5% → max 27 pts
    const age = profile.age;
    if      (age >= 30 && age <= 50) score += 27;
    else if (age >= 25 && age <= 55) score += 22;
    else if (age >= 21 && age <= 60) score += 16;
    else if (age >= 21 && age <= 65) score += 5;

    // Loan-to-income penalty
    const lti = profile.calculateLoanToIncomeRatio();
    if      (lti > 7) score -= 80;
    else if (lti > 5) score -= 50;
    else if (lti > 4) score -= 30;
    else if (lti > 3) score -= 15;

    return Math.min(Math.max(Math.round(score), 300), 850);
  }
  getName() { return 'AI-Based'; }
}

// ── Factory ─────────────────────────────────────────────────
class ScoringStrategyFactory {
  static getStrategy(loanAmount) {
    if      (loanAmount >= 2000000) return new ConservativeScoringStrategy();
    else if (loanAmount >= 500000)  return new StandardScoringStrategy();
    else                            return new AggressiveScoringStrategy();
  }

  static getStrategyByName(name) {
    switch (name.toLowerCase()) {
      case 'conservative': return new ConservativeScoringStrategy();
      case 'standard':     return new StandardScoringStrategy();
      case 'aggressive':   return new AggressiveScoringStrategy();
      case 'ai-based':     return new AIBasedStrategy();
      default:             return new StandardScoringStrategy();
    }
  }

  static getAllStrategies() {
    return [
      new ConservativeScoringStrategy(),
      new StandardScoringStrategy(),
      new AggressiveScoringStrategy(),
      new AIBasedStrategy(),
    ];
  }
}

export {
  AggressiveScoringStrategy,
  AggressiveScoringStrategy as AggressiveStrategy,
  AIBasedStrategy,
  BalancedStrategy,
  ConservativeScoringStrategy,
  ConservativeStrategy,
  ScoringStrategy,
  ScoringStrategyFactory,
  StandardScoringStrategy
};
