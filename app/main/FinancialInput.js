// app/(main)/financial.js
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// CustomButton removed - using TouchableOpacity directly for full style control
import FirebaseService from '../../services/FirebaseService';
import UserFinancialProfile from '../../services/UserFinancialProfile';

// Theme configuration - Updated to match SignInScreen COLORS
const THEME = {
  primary: '#0A2540',       // Navy Blue
  accent: '#2ECC71',         // Emerald Green
  background: '#F5F7FA',     // Off-White
  card: '#FFFFFF',           // Pure White
  text: '#2C2C2C',           // Dark Gray
  textLight: '#6B7280',     // Light Gray
  inputBg: '#F5F7FA',        // Matches COLORS.background from SignIn
  error: '#E53E3E',
};

// ─── Inline CustomInput ────────────────────────────────────────────────────────
const CustomInput = ({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  containerStyle,
  error,
  placeholderTextColor,
  editable = true,
  autoCapitalize = 'none',
  autoCorrect = false,
  onBlur,
  onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur && onBlur(e);
  };

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          !editable && styles.inputContainerDisabled,
          containerStyle,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || THEME.textLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={isSecure}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={THEME.primary}
        />

        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIconWrapper}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={THEME.textLight}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={THEME.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

const FinancialInputScreen = () => {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    existingDebts: '',
    employmentType: 'permanent',
    employmentYears: '',
    requestedLoanAmount: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadExistingData();
  }, []);

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

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const income = parseFloat(formData.monthlyIncome);
    const expenses = parseFloat(formData.monthlyExpenses);
    const debts = parseFloat(formData.existingDebts);
    const years = parseFloat(formData.employmentYears);
    const loanAmount = parseFloat(formData.requestedLoanAmount);

    if (!formData.monthlyIncome || isNaN(income) || income <= 0) 
      newErrors.monthlyIncome = 'Required';
    if (!formData.monthlyExpenses || isNaN(expenses) || expenses < 0) 
      newErrors.monthlyExpenses = 'Required';
    if (!formData.existingDebts || isNaN(debts) || debts < 0) 
      newErrors.existingDebts = 'Required';
    if (!formData.employmentYears || isNaN(years) || years < 0) 
      newErrors.employmentYears = 'Required';
    if (!formData.requestedLoanAmount || isNaN(loanAmount) || loanAmount <= 0) 
      newErrors.requestedLoanAmount = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Attention', 'Please complete all fields to calculate your score.');
      return;
    }

    setLoading(true);

    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) return;

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

      const validation = profile.validate();
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        setLoading(false);
        return;
      }

      const result = await FirebaseService.saveFinancialProfile(user.uid, {
        income: parseFloat(formData.monthlyIncome),
        expenses: parseFloat(formData.monthlyExpenses),
        debts: parseFloat(formData.existingDebts),
        employment: formData.employmentType,
        employmentYears: parseFloat(formData.employmentYears),
        requestedLoanAmount: parseFloat(formData.requestedLoanAmount),
        hasData: true,
      });

      if (result.success) {
        Alert.alert(
          'Profile Updated',
          'Your financial analysis is ready.',
          [{ text: 'View Score', onPress: () => router.push('/main/CreditScore') }]
        );
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: THEME.card }}
    >
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Financial Profile</Text>
          <Text style={styles.subtitle}>Enter your details for an AI credit assessment</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Income</Text>
            <CustomInput 
              placeholder="Enter your Income"
              value={formData.monthlyIncome}
              onChangeText={(t) => updateField('monthlyIncome', t)}
              keyboardType="numeric"
              error={errors.monthlyIncome}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Expenses</Text>
            <CustomInput 
              placeholder="Enter your Expenses"
              value={formData.monthlyExpenses}
              onChangeText={(t) => updateField('monthlyExpenses', t)}
              keyboardType="numeric"
              error={errors.monthlyExpenses}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Existing Debts</Text>
            <CustomInput 
              placeholder="Enter total debt"
              value={formData.existingDebts}
              onChangeText={(t) => updateField('existingDebts', t)}
              keyboardType="numeric"
              error={errors.existingDebts}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employment Type</Text>
            <View style={[
              styles.inputContainer,
              { paddingHorizontal: 8, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent' }
            ]}>
              <Picker
                selectedValue={formData.employmentType}
                onValueChange={(v) => updateField('employmentType', v)}
                style={styles.picker}
                dropdownIconColor={THEME.textLight}
              >
                <Picker.Item label="Permanent" value="permanent" />
                <Picker.Item label="Contract" value="contract" />
                <Picker.Item label="Self-Employed" value="self-employed" />
                <Picker.Item label="Unemployed" value="unemployed" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employment Years</Text>
            <CustomInput 
              placeholder="How many years?"
              value={formData.employmentYears}
              onChangeText={(t) => updateField('employmentYears', t)}
              keyboardType="numeric"
              error={errors.employmentYears}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loan Amount Requested</Text>
            <CustomInput 
              placeholder="Enter amount"
              value={formData.requestedLoanAmount}
              onChangeText={(t) => updateField('requestedLoanAmount', t)}
              keyboardType="numeric"
              error={errors.requestedLoanAmount}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.pillButton}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.pillButtonText}>
            {loading ? 'Saving...' : 'Save & Calculate Score'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.secureFooter}>
          <Ionicons name="lock-closed" size={14} color={THEME.textLight} />
          <Text style={styles.footerText}>Secure AI Processing</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textLight,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.primary,
    marginBottom: 8,
    marginLeft: 4,
  },
  // ── Shared input container (pill shape matching screenshot) ──
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'transparent',
    height: 58,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: 'transparent',
    backgroundColor: THEME.card,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  inputContainerError: {
    borderColor: THEME.error,
    backgroundColor: '#FFF5F5',
  },
  inputContainerDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    fontWeight: '400',
    paddingVertical: 0,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  rightIconWrapper: {
    padding: 4,
    marginLeft: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 6,
  },
  errorText: {
    fontSize: 12,
    color: THEME.error,
    marginLeft: 4,
    fontWeight: '500',
  },
  picker: {
    flex: 1,
    color: THEME.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  // ── Button ──
  pillButton: {
    backgroundColor: THEME.accent,
    borderRadius: 30,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  pillButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secureFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  footerText: {
    fontSize: 12,
    color: THEME.textLight,
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default FinancialInputScreen;