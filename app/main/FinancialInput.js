// app/(main)/financial.js
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import CryptoJS from 'crypto-js';
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
  View,
} from 'react-native';
import FirebaseService from '../../services/FirebaseService';

// Encryption Configuration
const SECRET_KEY = 'your-secure-secret-key-here'; 

// Theme configuration 
const THEME = {
  primary:   '#0A2540',
  accent:    '#2ECC71',
  background:'#F5F7FA',
  card:      '#FFFFFF',
  text:      '#2C2C2C',
  textLight: '#6B7280',
  inputBg:   '#F5F7FA',
  error:     '#E53E3E',
};

// ── Encryption Helpers ──────────────────────────────────────────
const encryptAES = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text.toString(), SECRET_KEY).toString();
};

const decryptAES = (ciphertext) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption failed", error);
    return '';
  }
};

// ── Shared CustomInput Component ────────────────────────────────
const CustomInput = ({
  placeholder, value, onChangeText,
  keyboardType = 'default', containerStyle,
  error, editable = true, onBlur, onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={{ width: '100%' }}>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error     && styles.inputContainerError,
        !editable && styles.inputContainerDisabled,
        containerStyle,
      ]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={THEME.textLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={(e) => { setIsFocused(true); onFocus && onFocus(e); }}
          onBlur={(e)  => { setIsFocused(false); onBlur  && onBlur(e); }}
          selectionColor={THEME.primary}
          underlineColorAndroid="transparent"
        />
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

const FinancialInputScreen = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    monthlyIncome:       '',
    monthlyExpenses:     '',
    existingDebts:       '',
    employmentType:      'permanent',
    employmentYears:     '',
    requestedLoanAmount: '',
  });

  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [userData, setUserData] = useState(null);

  useEffect(() => { loadExistingData(); }, []);

  const loadExistingData = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (user) {
        const result = await FirebaseService.getUserData(user.uid);
        if (result.success && result.data.financialProfile?.hasData) {
          const fp = result.data.financialProfile;
          // ✅ Decrypt HERE — the moment we pull from Firebase — so formData
          // always holds plain, human-readable numbers inside the app.
          setFormData({
            monthlyIncome:       decryptAES(fp.income)              || '',
            monthlyExpenses:     decryptAES(fp.expenses)            || '',
            existingDebts:       decryptAES(fp.debts)               || '',
            employmentType:      fp.employment                      || 'permanent',
            employmentYears:     decryptAES(fp.employmentYears)     || '',
            requestedLoanAmount: decryptAES(fp.requestedLoanAmount) || '',
          });
        }
        setUserData(result.data);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const updateField = (field, value) => {
    if (field === 'employmentType') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      const numericValue = value.replace(/[^0-9.]/g, '');
      setFormData(prev => ({ ...prev, [field]: numericValue }));
    }
    
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Required';
    if (!formData.monthlyExpenses) newErrors.monthlyExpenses = 'Required';
    if (!formData.existingDebts) newErrors.existingDebts = 'Required';
    if (!formData.employmentYears) newErrors.employmentYears = 'Required';
    if (!formData.requestedLoanAmount) newErrors.requestedLoanAmount = 'Required';

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

      const result = await FirebaseService.saveFinancialProfile(user.uid, {
        // ✅ Encrypt ONLY here — the boundary where data leaves the app into Firebase.
        // Everything inside the app (formData, router params) stays as plain numbers.
        income:              encryptAES(formData.monthlyIncome),
        expenses:            encryptAES(formData.monthlyExpenses),
        debts:               encryptAES(formData.existingDebts),
        employment:          formData.employmentType,           // string, no encrypt needed
        employmentYears:     encryptAES(formData.employmentYears),
        requestedLoanAmount: encryptAES(formData.requestedLoanAmount),
        hasData: true,
      });

      if (result.success) {
        // Pass plain values — no encryption, no decryption needed in CreditScore
        router.push({
          pathname: '/main/CreditScore',
          params: {
            freshIncome:     formData.monthlyIncome,
            freshExpenses:   formData.monthlyExpenses,
            freshDebts:      formData.existingDebts,
            freshEmployment: formData.employmentType,
            freshEmpYears:   formData.employmentYears,
            freshLoanAmount: formData.requestedLoanAmount,
          },
        });
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: THEME.card }}
    >
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
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
              keyboardType="decimal-pad"
              error={errors.monthlyIncome}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Expenses</Text>
            <CustomInput
              placeholder="Enter your Expenses"
              value={formData.monthlyExpenses}
              onChangeText={(t) => updateField('monthlyExpenses', t)}
              keyboardType="decimal-pad"
              error={errors.monthlyExpenses}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Existing Debts</Text>
            <CustomInput
              placeholder="Enter total debt"
              value={formData.existingDebts}
              onChangeText={(t) => updateField('existingDebts', t)}
              keyboardType="decimal-pad"
              error={errors.existingDebts}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employment Type</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.employmentType}
                onValueChange={(v) => updateField('employmentType', v)}
                style={styles.picker}
                dropdownIconColor={THEME.textLight}
                mode="dropdown"
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
              keyboardType="decimal-pad"
              error={errors.employmentYears}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loan Amount Requested</Text>
            <CustomInput
              placeholder="Enter amount"
              value={formData.requestedLoanAmount}
              onChangeText={(t) => updateField('requestedLoanAmount', t)}
              keyboardType="decimal-pad"
              error={errors.requestedLoanAmount}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.pillButton, loading && { opacity: 0.7 }]}
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
  contentContainer: { paddingHorizontal: 25, paddingTop: 40, paddingBottom: 30 },
  header: { marginBottom: 30 },
  title: { fontSize: 34, fontWeight: 'bold', color: THEME.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: THEME.textLight, marginTop: 8 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', color: THEME.primary, marginBottom: 8, marginLeft: 4 },
  
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.inputBg, borderRadius: 30,
    borderWidth: 1.5, borderColor: 'transparent',
    height: 58, paddingHorizontal: 20,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  inputContainerFocused: { backgroundColor: THEME.card, elevation: 3, shadowOpacity: 0.08 },
  inputContainerError:   { borderColor: THEME.error, backgroundColor: '#FFF5F5' },
  inputContainerDisabled:{ opacity: 0.55 },
  
  input: { 
    flex: 1, 
    fontSize: 15, 
    color: THEME.text,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  },

  pickerWrapper: {
    backgroundColor: THEME.inputBg, borderRadius: 30,
    height: 58, justifyContent: 'center', paddingHorizontal: 10,
    overflow: 'hidden',
  },
  picker: { 
    color: THEME.text,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
  },

  errorRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 6 },
  errorText: { fontSize: 12, color: THEME.error, marginLeft: 4, fontWeight: '500' },

  pillButton: {
    backgroundColor: THEME.accent, borderRadius: 30,
    height: 58, justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  pillButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  secureFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  footerText: { fontSize: 12, color: THEME.textLight, marginLeft: 5, fontWeight: '500' },
});

export default FinancialInputScreen;