// app/services/UserFinancialProfile.js
// ═══════════════════════════════════════════════════════════════
// USER FINANCIAL PROFILE CLASS
// SOLID: Single Responsibility - Manages user financial data only
// OOP: Encapsulation of financial data and validation
// ═══════════════════════════════════════════════════════════════

/**
 * UserFinancialProfile Class
 * Represents a user's complete financial profile
 * Used for credit score calculation and loan decisions
 */
class UserFinancialProfile {
  /**
   * Constructor
   * @param {number} monthlyIncome - User's monthly income
   * @param {number} monthlyExpenses - User's monthly expenses
   * @param {number} existingDebts - User's existing debt amount
   * @param {number} age - User's age
   * @param {string} employmentType - Type of employment (permanent, contract, self-employed, unemployed)
   * @param {number} employmentYears - Years of employment
   * @param {number} requestedLoanAmount - Amount of loan requested
   */
  constructor(data = {}) {
    this.monthlyIncome = data.monthlyIncome || 0;
    this.monthlyExpenses = data.monthlyExpenses || 0;
    this.existingDebts = data.existingDebts || 0;
    this.age = data.age || 0;
    this.employmentType = data.employmentType || 'unemployed';
    this.employmentYears = data.employmentYears || 0;
    this.requestedLoanAmount = data.requestedLoanAmount || 0;
  }

  /**
   * Calculate Debt-to-Income Ratio (DTI)
   * Lower is better (under 36% is ideal)
   * @returns {number} - DTI ratio as percentage
   */
  calculateDTI() {
    if (this.monthlyIncome === 0) return 100;
    
    const totalMonthlyDebt = this.monthlyExpenses + (this.existingDebts / 12);
    const dti = (totalMonthlyDebt / this.monthlyIncome) * 100;
    
    return Math.min(dti, 100); // Cap at 100%
  }

  /**
   * Calculate Monthly Disposable Income
   * Money left after expenses and existing debt payments
   * @returns {number} - Disposable income
   */
  calculateDisposableIncome() {
    const monthlyDebtPayment = this.existingDebts / 12;
    const disposableIncome = this.monthlyIncome - this.monthlyExpenses - monthlyDebtPayment;
    
    return Math.max(disposableIncome, 0);
  }

  /**
   * Calculate Savings Rate
   * Percentage of income that can be saved
   * @returns {number} - Savings rate as percentage
   */
  calculateSavingsRate() {
    if (this.monthlyIncome === 0) return 0;
    
    const disposableIncome = this.calculateDisposableIncome();
    const savingsRate = (disposableIncome / this.monthlyIncome) * 100;
    
    return Math.max(savingsRate, 0);
  }

  /**
   * Calculate Loan-to-Income Ratio
   * Requested loan amount compared to annual income
   * @returns {number} - Loan-to-income ratio
   */
  calculateLoanToIncomeRatio() {
    const annualIncome = this.monthlyIncome * 12;
    if (annualIncome === 0) return 0;
    
    return this.requestedLoanAmount / annualIncome;
  }

  /**
   * Get Employment Stability Score (0-100)
   * Based on employment type and years of employment
   * @returns {number} - Employment stability score
   */
  getEmploymentStabilityScore() {
    let baseScore = 0;
    
    // Base score by employment type
    switch (this.employmentType.toLowerCase()) {
      case 'permanent':
        baseScore = 80;
        break;
      case 'contract':
        baseScore = 60;
        break;
      case 'self-employed':
        baseScore = 50;
        break;
      case 'unemployed':
        baseScore = 0;
        break;
      default:
        baseScore = 40;
    }
    
    // Add bonus for years of employment (up to 20 points)
    const yearsBonus = Math.min(this.employmentYears * 2, 20);
    
    return Math.min(baseScore + yearsBonus, 100);
  }

  /**
   * Get Age Risk Score (0-100)
   * Younger and older ages have higher risk
   * Peak earning age (30-50) has lower risk
   * @returns {number} - Age risk score (lower is better)
   */
  getAgeRiskScore() {
    if (this.age < 21) return 70; // Too young
    if (this.age < 25) return 50;
    if (this.age < 30) return 30;
    if (this.age < 50) return 10; // Peak earning years
    if (this.age < 60) return 20;
    if (this.age < 65) return 40;
    return 60; // Retirement age
  }

  /**
   * Validate if profile has all required data
   * @returns {object} - {isValid: boolean, errors: array}
   */
  validate() {
    const errors = [];
    
    if (this.monthlyIncome <= 0) {
      errors.push('Monthly income must be greater than 0');
    }
    
    if (this.monthlyExpenses < 0) {
      errors.push('Monthly expenses cannot be negative');
    }
    
    if (this.existingDebts < 0) {
      errors.push('Existing debts cannot be negative');
    }
    
    if (this.age < 18) {
      errors.push('Age must be at least 18');
    }
    
    if (this.age > 100) {
      errors.push('Please enter a valid age');
    }
    
    if (this.employmentYears < 0) {
      errors.push('Employment years cannot be negative');
    }
    
    if (this.requestedLoanAmount <= 0) {
      errors.push('Requested loan amount must be greater than 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Export profile data as plain object
   * @returns {object} - Profile data
   */
  toJSON() {
    return {
      monthlyIncome: this.monthlyIncome,
      monthlyExpenses: this.monthlyExpenses,
      existingDebts: this.existingDebts,
      age: this.age,
      employmentType: this.employmentType,
      employmentYears: this.employmentYears,
      requestedLoanAmount: this.requestedLoanAmount,
      // Calculated metrics
      dti: this.calculateDTI(),
      disposableIncome: this.calculateDisposableIncome(),
      savingsRate: this.calculateSavingsRate(),
      loanToIncomeRatio: this.calculateLoanToIncomeRatio(),
      employmentStability: this.getEmploymentStabilityScore(),
      ageRiskScore: this.getAgeRiskScore()
    };
  }

  /**
   * Get summary of financial health
   * @returns {string} - Summary message
   */
  getFinancialHealthSummary() {
    const dti = this.calculateDTI();
    const savingsRate = this.calculateSavingsRate();
    
    if (dti < 20 && savingsRate > 20) {
      return 'Excellent financial health';
    } else if (dti < 36 && savingsRate > 10) {
      return 'Good financial health';
    } else if (dti < 50) {
      return 'Fair financial health';
    } else {
      return 'Poor financial health - high debt burden';
    }
  }
}

export default UserFinancialProfile;