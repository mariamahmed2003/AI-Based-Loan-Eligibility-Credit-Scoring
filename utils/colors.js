/**
 * COLOR SCHEME CONSTANTS
 * Centralized color management for consistent theming across the app
 * Following the project's color scheme requirements
 */

export const COLORS = {
  // Primary Colors
  primary: '#0A2540',        // Navy Blue - Main brand color
  secondary: '#1F6AE1',      // Royal Blue - Secondary actions
  accent: '#2ECC71',         // Emerald Green - Success, positive actions
  
  // Background Colors
  background: '#F5F7FA',     // Off-White - Main background
  cardBackground: '#FFFFFF', // Pure White - Card backgrounds
  
  // Text Colors
  text: '#2C2C2C',          // Dark Gray - Primary text
  textLight: '#6B7280',     // Light Gray - Secondary text
  textWhite: '#FFFFFF',     // White text for dark backgrounds
  
  // Status Colors
  error: '#E74C3C',         // Soft Red - Errors, high risk
  success: '#27AE60',       // Green - Success messages
  warning: '#F39C12',       // Orange - Warnings, medium risk
  info: '#3498DB',          // Blue - Information
  
  // Credit Score Risk Levels
  riskHigh: '#E74C3C',      // High risk - Red
  riskMedium: '#F39C12',    // Medium risk - Orange
  riskLow: '#F1C40F',       // Low risk - Yellow
  riskVeryLow: '#2ECC71',   // Very low risk - Green
  
  // UI Elements
  border: '#E5E7EB',        // Border color
  disabled: '#9CA3AF',      // Disabled state
  shadow: '#000000',        // Shadow color
  
  // Gradients (for advanced UI)
  gradientStart: '#0A2540',
  gradientEnd: '#1F6AE1',
  
  // Chart Colors
  chartPrimary: '#1F6AE1',
  chartSecondary: '#2ECC71',
  chartTertiary: '#F39C12',
  chartGrid: '#E5E7EB',
};

/**
 * Get color based on credit score
 * @param {number} score - Credit score (0-100)
 * @returns {string} - Corresponding color
 */
export const getScoreColor = (score) => {
  if (score >= 80) return COLORS.riskVeryLow;  // Excellent
  if (score >= 60) return COLORS.riskLow;      // Good
  if (score >= 40) return COLORS.riskMedium;   // Fair
  return COLORS.riskHigh;                       // Poor
};

/**
 * Get risk level text based on score
 * @param {number} score - Credit score (0-100)
 * @returns {string} - Risk level description
 */
export const getRiskLevel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
};

/**
 * Get approval probability based on score
 * @param {number} score - Credit score (0-100)
 * @returns {string} - Approval probability
 */
export const getApprovalProbability = (score) => {
  if (score >= 80) return 'Very High (85-95%)';
  if (score >= 60) return 'Moderate (60-80%)';
  if (score >= 40) return 'Low (30-50%)';
  return 'Very Low (5-25%)';
};

export default COLORS;