// utils/validators.js
// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS - Input validation throughout the app
// ═══════════════════════════════════════════════════════════════

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate password strength
 * Must be at least 6 characters
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate name (first/last name)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }
  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} can only contain letters` };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  const phoneRegex = /^\d{10,15}$/;
  const cleanPhone = phone.replace(/[\s-()]/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Invalid phone number (10-15 digits)' };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate age (must be 18 or older)
 * @param {Date} dateOfBirth - Date of birth
 * @returns {object} - { isValid: boolean, error: string, age: number }
 */
export const validateAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return { isValid: false, error: 'Date of birth is required', age: 0 };
  }
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return { isValid: false, error: 'You must be at least 18 years old', age };
  }
  
  if (age > 100) {
    return { isValid: false, error: 'Please enter a valid date of birth', age };
  }
  
  return { isValid: true, error: '', age };
};

/**
 * Validate income (must be positive number)
 * @param {string|number} income - Income to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateIncome = (income) => {
  if (!income || income === '') {
    return { isValid: false, error: 'Income is required' };
  }
  const numIncome = parseFloat(income);
  if (isNaN(numIncome)) {
    return { isValid: false, error: 'Income must be a number' };
  }
  if (numIncome <= 0) {
    return { isValid: false, error: 'Income must be greater than 0' };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate expense (must be non-negative number)
 * @param {string|number} expense - Expense to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateExpense = (expense) => {
  if (expense === '' || expense === null || expense === undefined) {
    return { isValid: false, error: 'Expense is required' };
  }
  const numExpense = parseFloat(expense);
  if (isNaN(numExpense)) {
    return { isValid: false, error: 'Expense must be a number' };
  }
  if (numExpense < 0) {
    return { isValid: false, error: 'Expense cannot be negative' };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate gender selection
 * @param {string} gender - Gender to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateGender = (gender) => {
  if (!gender || gender === '') {
    return { isValid: false, error: 'Please select your gender' };
  }
  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(gender.toLowerCase())) {
    return { isValid: false, error: 'Invalid gender selection' };
  }
  return { isValid: true, error: '' };
};

export default {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validatePhone,
  validateAge,
  validateIncome,
  validateExpense,
  validateGender,
};