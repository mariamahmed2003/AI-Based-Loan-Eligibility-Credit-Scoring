// app/Auth/signupscreen.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import FirebaseService from '../../services/FirebaseService';
import COLORS from '../../utils/colors';
import {
  validateAge,
  validateConfirmPassword,
  validateEmail,
  validateGender,
  validateName,
  validatePassword,
} from '../../utils/validators';

const SignUpScreen = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '', 
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  
  const [dateInput, setDateInput] = useState('');
  const [tempSelectedDate, setTempSelectedDate] = useState(null);

  // --- NEW STATES FOR YEAR PICKER ---
  const [showYearPicker, setShowYearPicker] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
  // ---------------------------------

  const genderOptions = ['Male', 'Female', 'Other'];

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const firstNameValidation = validateName(formData.firstName, 'First name');
    if (!firstNameValidation.isValid) newErrors.firstName = firstNameValidation.error;
    const lastNameValidation = validateName(formData.lastName, 'Last name');
    if (!lastNameValidation.isValid) newErrors.lastName = lastNameValidation.error;
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) newErrors.email = emailValidation.error;
    
    if (!formData.phone || formData.phone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number';
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) newErrors.password = passwordValidation.error;
    const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (!confirmPasswordValidation.isValid) newErrors.confirmPassword = confirmPasswordValidation.error;
    const genderValidation = validateGender(formData.gender);
    if (!genderValidation.isValid) newErrors.gender = genderValidation.error;
    const ageValidation = validateAge(formData.dateOfBirth);
    if (!ageValidation.isValid) newErrors.dateOfBirth = ageValidation.error;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }
    if (!agreeToTerms) {
      Alert.alert('Terms Required', 'You must agree to the terms.');
      return;
    }
    
    setLoading(true);
    
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;
      const d = formData.dateOfBirth;
      const formattedDOB = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const result = await FirebaseService.signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: fullName,
        phone: formData.phone,
        dateOfBirth: formattedDOB, 
        gender: formData.gender,
      });
      
      if (result && result.success) {
        Alert.alert(
          'Success!', 
          'User registered successfully!', 
          [{ 
            text: 'OK', 
            onPress: () => {
              // Navigating to the 'main' group and 'home' screen
              // Based on your Root _layout.js name="main"
              router.replace('/main/home');
            } 
          }],
          { cancelable: false }
        );
      } else if (result?.error?.includes('auth/email-already-in-use')) {
        // Handling the error seen in your console
        Alert.alert(
          'Account Exists',
          'This email is already in use. Please sign in instead.',
          [{ text: 'Go to Sign In', onPress: () => router.replace('/Auth/signinscreen') }]
        );
      } else {
        Alert.alert('Sign Up Failed', result?.error || "Registration failed");
      }
    } catch (error) {
      console.error("Signup Error:", error);
      Alert.alert('Error', 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert('Google Sign-In', 'Google Sign-In logic would go here.');
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const selectGender = (gender) => {
    updateField('gender', gender);
    setShowGenderDropdown(false);
  };

  const onDayPress = (day) => {
    const selectedDate = new Date(day.year, day.month - 1, day.day, 12, 0, 0);
    setTempSelectedDate(selectedDate);
  };

  const handleConfirmDate = () => {
    if (tempSelectedDate) {
      updateField('dateOfBirth', tempSelectedDate);
      setDateInput(formatDate(tempSelectedDate));
      setShowDatePicker(false);
      setTempSelectedDate(null);
      setShowYearPicker(false);
    }
  };

  const handleCancelDate = () => {
    setShowDatePicker(false);
    setTempSelectedDate(null);
    setShowYearPicker(false);
  };

  const handleManualDateInput = (text) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length >= 2) cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    if (cleaned.length >= 5) cleaned = cleaned.substring(0, 5) + '/' + cleaned.substring(5);
    if (cleaned.length > 10) cleaned = cleaned.substring(0, 10);
    setDateInput(cleaned);
    if (cleaned.length === 10) {
      const parts = cleaned.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
        const date = new Date(year, month - 1, day, 12, 0, 0);
        updateField('dateOfBirth', date);
      }
    }
  };

  const getMarkedDate = () => {
    const marked = {};
    const targetDate = tempSelectedDate || formData.dateOfBirth;
    if (targetDate) {
      const dateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      marked[dateString] = {
        selected: true,
        selectedColor: '#98E4B6',
        selectedTextColor: '#000000',
      };
    }
    return marked;
  };

  const openCalendar = () => {
    if (!formData.dateOfBirth) {
        setTempSelectedDate(new Date(2000, 0, 1));
    } else {
        setTempSelectedDate(formData.dateOfBirth);
    }
    setShowDatePicker(true);
  };

  const handleYearSelect = (year) => {
    const newDate = tempSelectedDate ? new Date(tempSelectedDate) : new Date(2000, 0, 1);
    newDate.setFullYear(year);
    setTempSelectedDate(newDate);
    setShowYearPicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join us and start your journey</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput style={[styles.input, errors.firstName && styles.inputError]} placeholder="First Name" value={formData.firstName} onChangeText={(text) => updateField('firstName', text)} />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <TextInput style={[styles.input, errors.lastName && styles.inputError]} placeholder="Last Name" value={formData.lastName} onChangeText={(text) => updateField('lastName', text)} />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="Email" value={formData.email} onChangeText={(text) => updateField('email', text.toLowerCase())} keyboardType="email-address" autoCapitalize="none" />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <TextInput 
              style={[styles.input, errors.phone && styles.inputError]} 
              placeholder="Phone Number" 
              value={formData.phone} 
              onChangeText={(text) => updateField('phone', text)} 
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity style={[styles.dropdownButton, errors.gender && styles.inputError]} onPress={() => setShowGenderDropdown(!showGenderDropdown)}>
              <Text style={[styles.dropdownText, !formData.gender && styles.placeholderText]}>{formData.gender || 'Gender'}</Text>
              <Ionicons name={showGenderDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textLight} />
            </TouchableOpacity>
            {showGenderDropdown && (
              <View style={styles.dropdownMenu}>
                {genderOptions.map((gender, index) => (
                  <TouchableOpacity key={gender} style={[styles.dropdownItem, index === genderOptions.length - 1 && styles.dropdownItemLast]} onPress={() => selectGender(gender)}>
                    <Text style={styles.dropdownItemText}>{gender}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={[styles.input, errors.dateOfBirth && styles.inputError, { paddingRight: 55 }]} 
                placeholder="Date of Birth" 
                value={dateInput} 
                onChangeText={handleManualDateInput} 
                keyboardType="numeric" 
                maxLength={10} 
                cursorColor={COLORS.accent} 
              />
              <TouchableOpacity onPress={openCalendar} style={styles.iconInside}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={[styles.input, errors.password && styles.inputError, { paddingRight: 55 }]} 
                placeholder="Password" 
                value={formData.password} 
                onChangeText={(text) => updateField('password', text)} 
                secureTextEntry={!showPassword} 
                cursorColor={COLORS.accent} 
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                style={styles.iconInside}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={22} 
                  color={COLORS.textLight} 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={[styles.input, errors.confirmPassword && styles.inputError, { paddingRight: 55 }]} 
                placeholder="Confirm Password" 
                value={formData.confirmPassword} 
                onChangeText={(text) => updateField('confirmPassword', text)} 
                secureTextEntry={!showConfirmPassword} 
                cursorColor={COLORS.accent} 
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                style={styles.iconInside}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={22} 
                  color={COLORS.textLight} 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreeToTerms(!agreeToTerms)}>
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
              {agreeToTerms && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
            </View>
            <Text style={styles.checkboxLabel}>I agree to the Terms and Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.signUpButton, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Loading..." : "Sign Up"}</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
              style={styles.googleIcon} 
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity 
                    style={styles.yearSelectorTrigger} 
                    onPress={() => setShowYearPicker(!showYearPicker)}
                >
                    <Text style={styles.calendarTitle}>
                        {tempSelectedDate ? tempSelectedDate.getFullYear() : 'Select Year'}
                    </Text>
                    <Ionicons name={showYearPicker ? "chevron-up" : "chevron-down"} size={20} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {showYearPicker ? (
                <View style={styles.yearPickerContainer}>
                    <FlatList
                        data={years}
                        keyExtractor={(item) => item.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={[
                                    styles.yearItem, 
                                    tempSelectedDate?.getFullYear() === item && styles.yearItemSelected
                                ]}
                                onPress={() => handleYearSelect(item)}
                            >
                                <Text style={[
                                    styles.yearItemText,
                                    tempSelectedDate?.getFullYear() === item && styles.yearItemTextSelected
                                ]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                        initialNumToRender={20}
                        getItemLayout={(data, index) => (
                            {length: 50, offset: 50 * index, index}
                        )}
                    />
                </View>
              ) : (
                <Calendar
                  current={tempSelectedDate ? tempSelectedDate.toISOString().split('T')[0] : '2000-01-01'}
                  onDayPress={onDayPress}
                  markedDates={getMarkedDate()}
                  theme={{
                    backgroundColor: COLORS.white,
                    calendarBackground: COLORS.white,
                    selectedDayBackgroundColor: '#98E4B6',
                    selectedDayTextColor: '#000000',
                    todayTextColor: '#98E4B6',
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    arrowColor: '#98E4B6',
                    monthTextColor: '#000000',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                  }}
                />
              )}

              <View style={styles.calendarActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelDate}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.okButton, !tempSelectedDate && styles.okButtonDisabled]} 
                  onPress={handleConfirmDate}
                  disabled={!tempSelectedDate}
                >
                  <Text style={styles.okButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 8 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textLight, marginBottom: 32 },
  form: { width: '100%' },
  inputContainer: { marginBottom: 16 },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  input: { backgroundColor: COLORS.white, borderRadius: 30, borderWidth: 1, borderColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, color: COLORS.text },
  iconInside: { position: 'absolute', right: 20, height: '100%', width: 40, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  inputError: { borderColor: COLORS.error },
  placeholderText: { color: COLORS.textLight },
  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: 30, borderWidth: 1, borderColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 16 },
  dropdownText: { fontSize: 16, color: COLORS.text },
  dropdownMenu: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 8, overflow: 'hidden', elevation: 4, zIndex: 1000 },
  dropdownItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemText: { fontSize: 16, color: COLORS.text },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: COLORS.textLight, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkboxLabel: { fontSize: 14, color: COLORS.text, flex: 1 },
  signUpButton: { backgroundColor: COLORS.accent, borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginBottom: 24, height: 56, justifyContent: 'center'  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textWhite },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 6, marginLeft: 20 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 10, color: COLORS.textLight },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 30, paddingVertical: 14, height: 56 },
  googleIcon: { width: 24, height: 24, marginRight: 10 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarContainer: { backgroundColor: '#FFFFFF', borderRadius: 25, width: 350, maxWidth: '90%', overflow: 'hidden', elevation: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  yearSelectorTrigger: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calendarTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  closeButton: { padding: 4 },
  yearPickerContainer: { height: 350, backgroundColor: '#fff' },
  yearItem: { padding: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  yearItemSelected: { backgroundColor: '#98E4B6' },
  yearItemText: { fontSize: 18, color: '#333' },
  yearItemTextSelected: { fontWeight: 'bold', color: '#000' },
  calendarActions: { flexDirection: 'row', padding: 16, gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#2d4150', paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
  cancelButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  okButton: { flex: 1, backgroundColor: '#98E4B6', paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
  okButtonDisabled: { opacity: 0.5 },
  okButtonText: { color: '#000', fontWeight: '600', fontSize: 16 },
});

export default SignUpScreen;