// app/services/UserFinancialProfile.js
// ═══════════════════════════════════════════════════════════════
// USER FINANCIAL PROFILE — Egyptian Banking Rules, EGP
// ALL methods used by CreditScoreCalculator + ScoringStrategies
// are fully implemented to prevent any crashes.
// ═══════════════════════════════════════════════════════════════

class UserFinancialProfile {
  constructor(data = {}) {
    this.monthlyIncome       = data.monthlyIncome       || 0;
    this.monthlyExpenses     = data.monthlyExpenses     || 0;
    this.existingDebts       = data.existingDebts       || 0;
    this.age                 = data.age                 || 0;
    this.employmentType      = data.employmentType      || 'unemployed';
    this.employmentYears     = data.employmentYears     || 0;
    this.requestedLoanAmount = data.requestedLoanAmount || 0;

    // Aliases used by Aggressive strategy
    this.employmentStatus = this.employmentType;
    this.yearsAtJob       = this.employmentYears;
  }

  // ── CORE CALCULATIONS ──────────────────────────────────────

  /** DTI — Egyptian banks hard cap at 50% */
  calculateDTI() {
    if (this.monthlyIncome === 0) return 100;
    const monthlyDebt = this.monthlyExpenses + (this.existingDebts / 12);
    return Math.min((monthlyDebt / this.monthlyIncome) * 100, 100);
  }

  /** Monthly disposable income after all obligations */
  calculateDisposableIncome() {
    const monthlyDebt = this.existingDebts / 12;
    return Math.max(this.monthlyIncome - this.monthlyExpenses - monthlyDebt, 0);
  }

  /** Savings rate as % of monthly income */
  calculateSavingsRate() {
    if (this.monthlyIncome === 0) return 0;
    return Math.max((this.calculateDisposableIncome() / this.monthlyIncome) * 100, 0);
  }

  /** Requested loan / annual income */
  calculateLoanToIncomeRatio() {
    const annual = this.monthlyIncome * 12;
    if (annual === 0) return 0;
    return this.requestedLoanAmount / annual;
  }

  // ── REQUIRED ALIASES (used by Conservative + Standard strategies) ──

  /** Annual income */
  getTotalIncome() {
    return this.monthlyIncome * 12;
  }

  /** DTI alias */
  getDebtToIncomeRatio() {
    return this.calculateDTI();
  }

  /** Annual disposable income */
  getDisposableIncome() {
    return this.calculateDisposableIncome() * 12;
  }

  /** Savings rate alias */
  getSavingsToIncomeRatio() {
    return this.calculateSavingsRate();
  }

  /**
   * Net worth estimate.
   * We don't collect asset data, so we estimate conservatively
   * as 12× monthly disposable income.
   */
  getNetWorth() {
    return this.calculateDisposableIncome() * 12;
  }

  /**
   * Employment stability score 0–100.
   * Egyptian banks strongly prefer permanent government or private employment.
   */
  getEmploymentStabilityScore() {
    let base = 0;
    switch (this.employmentType.toLowerCase()) {
      case 'permanent':     base = 85; break;
      case 'contract':      base = 60; break;
      case 'self-employed': base = 50; break;
      case 'unemployed':    base = 0;  break;
      default:              base = 40;
    }
    const yearsBonus = Math.min(this.employmentYears * 2, 15);
    return Math.min(base + yearsBonus, 100);
  }

  /** Alias used by some strategies */
  getEmploymentStability() {
    return this.getEmploymentStabilityScore();
  }

  /**
   * Age risk score 0–100 (lower = less risky).
   * Egyptian rules: eligible 21–65; peak earning age 30–55.
   */
  getAgeRiskScore() {
    if (this.age < 21 || this.age > 65) return 100;
    if (this.age <= 30) return 25;
    if (this.age <= 55) return 10;
    if (this.age <= 60) return 20;
    return 35;
  }

  // ── EGYPTIAN HARD ELIGIBILITY CHECK ───────────────────────

  getEgyptianEligibilityIssues() {
    const issues = [];
    if (this.age < 21)
      issues.push('Must be at least 21 years old (Egyptian banking requirement)');
    if (this.age > 65)
      issues.push('Must be under 65 years old (Egyptian banking requirement)');
    if (this.monthlyIncome < 10000)
      issues.push(`Monthly income must be at least EGP 10,000 (yours: EGP ${this.monthlyIncome.toLocaleString()})`);
    if (this.employmentType === 'unemployed')
      issues.push('Must be employed to apply for a loan');
    if (this.employmentYears < 0.5)
      issues.push('Must have completed probation period (minimum 6 months)');
    if (this.calculateDTI() > 50)
      issues.push(`DTI of ${this.calculateDTI().toFixed(1)}% exceeds the Egyptian bank maximum of 50%`);
    return issues;
  }

  // ── VALIDATION ─────────────────────────────────────────────

  validate() {
    const errors = [];
    if (this.monthlyIncome <= 0)       errors.push('Monthly income must be greater than 0');
    if (this.monthlyExpenses < 0)      errors.push('Monthly expenses cannot be negative');
    if (this.existingDebts < 0)        errors.push('Existing debts cannot be negative');
    if (this.age < 18)                 errors.push('Age must be at least 18');
    if (this.age > 100)                errors.push('Please enter a valid age');
    if (this.employmentYears < 0)      errors.push('Employment years cannot be negative');
    if (this.requestedLoanAmount <= 0) errors.push('Requested loan amount must be greater than 0');
    return { isValid: errors.length === 0, errors };
  }

  toJSON() {
    return {
      monthlyIncome:            this.monthlyIncome,
      monthlyExpenses:          this.monthlyExpenses,
      existingDebts:            this.existingDebts,
      age:                      this.age,
      employmentType:           this.employmentType,
      employmentYears:          this.employmentYears,
      requestedLoanAmount:      this.requestedLoanAmount,
      dti:                      this.calculateDTI(),
      disposableIncome:         this.calculateDisposableIncome(),
      savingsRate:              this.calculateSavingsRate(),
      loanToIncomeRatio:        this.calculateLoanToIncomeRatio(),
      employmentStabilityScore: this.getEmploymentStabilityScore(),
      ageRiskScore:             this.getAgeRiskScore(),
    };
  }

  getFinancialHealthSummary() {
    const dti = this.calculateDTI();
    const sr  = this.calculateSavingsRate();
    if (dti < 20 && sr > 20) return 'Excellent financial health';
    if (dti < 36 && sr > 10) return 'Good financial health';
    if (dti < 50)             return 'Fair financial health';
    return 'Poor financial health — high debt burden';
  }
}

export default UserFinancialProfile;