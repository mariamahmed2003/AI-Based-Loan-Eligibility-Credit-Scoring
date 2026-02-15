// app/(main)/financial.js
// ═══════════════════════════════════════════════════════════════
// FINANCIAL INPUT SCREEN
// Users enter income, expenses, debts, employment info
// Validates and saves to Firebase
// ═══════════════════════════════════════════════════════════════

import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import FirebaseService from '../../services/FirebaseService';
import UserFinancialProfile from '../../services/UserFinancialProfile';
import COLORS from '../../utils/colors';

const FinancialInputScreen = () => {
  // Form State
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    existingDebts: '',
    employmentType: 'permanent',
    employmentYears: '',
    requestedLoanAmount: '',
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadExistingData();
  }, []);

  /**
   * Load existing financial data if available
   */
  const loadExistingData = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        const result = await FirebaseService.getUserData(user.uid);
        if (result.success && result.data.financialProfile?.hasData) {
          const fp = result.data.financialProfile;
          setFormData({
            monthlyIncome: fp.income?.toString() || '',
            monthlyExpenses: fp.expenses?.toString() || '',
            existingDebts: fp.debts?.toString() || '',
            employmentType: fp.employment || 'permanent',
            employmentYears: fp.employmentYears?.toString() || '',
            requestedLoanAmount: fp.requestedLoanAmount?.toString() || '',
          });
        }
        setUserData(result.data);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  /**
   * Update form field
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    const newErrors = {};

    // Monthly Income
    const income = parseFloat(formData.monthlyIncome);
    if (!formData.monthlyIncome || isNaN(income) || income <= 0) {
      newErrors.monthlyIncome = 'Please enter a valid monthly income';
    }

    // Monthly Expenses
    const expenses = parseFloat(formData.monthlyExpenses);
    if (!formData.monthlyExpenses || isNaN(expenses) || expenses < 0) {
      newErrors.monthlyExpenses = 'Please enter valid monthly expenses';
    }

    // Check if expenses exceed income
    if (income > 0 && expenses > income) {
      Alert.alert(
        'Warning',
        'Your expenses exceed your income. This will negatively impact your credit score.',
        [{ text: 'OK' }]
      );
    }

    // Existing Debts
    const debts = parseFloat(formData.existingDebts);
    if (!formData.existingDebts || isNaN(debts) || debts < 0) {
      newErrors.existingDebts = 'Please enter existing debts (enter 0 if none)';
    }

    // Employment Years
    const years = parseFloat(formData.employmentYears);
    if (!formData.employmentYears || isNaN(years) || years < 0) {
      newErrors.employmentYears = 'Please enter years of employment';
    }

    // Requested Loan Amount
    const loanAmount = parseFloat(formData.requestedLoanAmount);
    if (!formData.requestedLoanAmount || isNaN(loanAmount) || loanAmount <= 0) {
      newErrors.requestedLoanAmount = 'Please enter requested loan amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    // Validate
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in again');
        return;
      }

      // Create financial profile to validate
      const age = userData?.dateOfBirth 
        ? new Date().getFullYear() - new Date(userData.dateOfBirth).getFullYear()
        : 30;

      const profile = new UserFinancialProfile({
        monthlyIncome: parseFloat(formData.monthlyIncome),
        monthlyExpenses: parseFloat(formData.monthlyExpenses),
        existingDebts: parseFloat(formData.existingDebts),
        age: age,
        employmentType: formData.employmentType,
        employmentYears: parseFloat(formData.employmentYears),
        requestedLoanAmount: parseFloat(formData.requestedLoanAmount),
      });

      // Validate profile
      const validation = profile.validate();
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        setLoading(false);
        return;
      }

      // Save to Firebase
      const result = await FirebaseService.saveFinancialProfile(user.uid, {
        income: parseFloat(formData.monthlyIncome),
        expenses: parseFloat(formData.monthlyExpenses),
        debts: parseFloat(formData.existingDebts),
        employment: formData.employmentType,
        employmentYears: parseFloat(formData.employmentYears),
        requestedLoanAmount: parseFloat(formData.requestedLoanAmount),
      });

      if (result.success) {
        Alert.alert(
          'Success',
          'Financial profile saved successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Financial Information</Text>
        <Text style={styles.subtitle}>
          Enter your financial details to calculate credit score
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Monthly Income */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Monthly Income *</Text>
          <CustomInput 
            placeholder="5000"
            value={formData.monthlyIncome}
            onChangeText={(text) => updateField('monthlyIncome', text)}
            keyboardType="numeric"
            iconName="cash-outline"
            error={errors.monthlyIncome}
          />
        </View>

        {/* Monthly Expenses */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Monthly Expenses *</Text>
          <CustomInput 
            placeholder="3000"
            value={formData.monthlyExpenses}
            onChangeText={(text) => updateField('monthlyExpenses', text)}
            keyboardType="numeric"
            iconName="trending-down-outline"
            error={errors.monthlyExpenses}
          />
        </View>

        {/* Existing Debts */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Existing Debts *</Text>
          <Text style={styles.helperText}>
            Total outstanding debt (credit cards, loans, etc.)
          </Text>
          <CustomInput 
            placeholder="10000"
            value={formData.existingDebts}
            onChangeText={(text) => updateField('existingDebts', text)}
            keyboardType="numeric"
            iconName="card-outline"
            error={errors.existingDebts}
          />
        </View>

        {/* Employment Type */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Employment Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.employmentType}
              onValueChange={(value) => updateField('employmentType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Permanent Employment" value="permanent" />
              <Picker.Item label="Contract Employment" value="contract" />
              <Picker.Item label="Self-Employed" value="self-employed" />
              <Picker.Item label="Unemployed" value="unemployed" />
            </Picker>
          </View>
        </View>

        {/* Employment Years */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Years of Employment *</Text>
          <CustomInput 
            placeholder="5"
            value={formData.employmentYears}
            onChangeText={(text) => updateField('employmentYears', text)}
            keyboardType="numeric"
            iconName="briefcase-outline"
            error={errors.employmentYears}
          />
        </View>

        {/* Requested Loan Amount */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Requested Loan Amount *</Text>
          <CustomInput 
            placeholder="50000"
            value={formData.requestedLoanAmount}
            onChangeText={(text) => updateField('requestedLoanAmount', text)}
            keyboardType="numeric"
            iconName="wallet-outline"
            error={errors.requestedLoanAmount}
          />
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Why we need this information:</Text>
        <Text style={styles.infoText}>
          • Calculate your debt-to-income ratio{'\n'}
          • Assess employment stability{'\n'}
          • Determine loan eligibility{'\n'}
          • Provide accurate credit score
        </Text>
      </View>

      {/* Save Button */}
      <CustomButton 
        title="Save & Calculate Score"
        onPress={handleSave}
        loading={loading}
        style={styles.saveButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  form: {
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: 40,
  },
});

export default FinancialInputScreen;