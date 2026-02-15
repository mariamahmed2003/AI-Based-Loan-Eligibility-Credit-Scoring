// app/components/CustomInput.js
// ═══════════════════════════════════════════════════════════════
// CUSTOM INPUT COMPONENT - Reusable text input with validation
// ═══════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import COLORS from '../utils/colors';

/**
 * Custom Input Component
 * @param {string} placeholder - Input placeholder text
 * @param {string} value - Input value
 * @param {function} onChangeText - Function called when text changes
 * @param {boolean} secureTextEntry - Hide text (for passwords)
 * @param {string} keyboardType - Keyboard type (default, email, numeric, etc.)
 * @param {string} error - Error message to display
 * @param {string} iconName - Icon name from Ionicons
 * @param {boolean} multiline - Allow multiple lines
 * @param {object} style - Additional styles
 */
const CustomInput = ({ 
  placeholder, 
  value, 
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error = '',
  iconName = null,
  multiline = false,
  style,
  editable = true,
  maxLength
}) => {
  
  // State to toggle password visibility
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {/* Input Container */}
      <View style={[
        styles.inputContainer, 
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError
      ]}>
        {/* Left Icon (if provided) */}
        {iconName && (
          <Ionicons 
            name={iconName} 
            size={20} 
            color={error ? COLORS.error : (isFocused ? COLORS.primary : COLORS.textLight)} 
            style={styles.icon}
          />
        )}
        
        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !editable && styles.disabledInput
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize="none"
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={editable}
          maxLength={maxLength}
        />
        
        {/* Password Visibility Toggle (for password fields) */}
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={COLORS.textLight} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Error Message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    minHeight: 50,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  disabledInput: {
    backgroundColor: COLORS.background,
    color: COLORS.textLight,
  },
  eyeIcon: {
    padding: 5,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default CustomInput;