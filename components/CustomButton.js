// app/components/CustomButton.js
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import COLORS from '../utils/colors';

const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false,
  disabled = false,
  style 
}) => {
  
  // Determine button style
  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    } else {
      switch (variant) {
        case 'primary':
          baseStyle.push(styles.primary);
          break;
        case 'secondary':
          baseStyle.push(styles.secondary);
          break;
        case 'outline':
          baseStyle.push(styles.outline);
          break;
        case 'danger':
          baseStyle.push(styles.danger);
          break;
        default:
          baseStyle.push(styles.primary);
      }
    }

    if (style) {
      baseStyle.push(style); // add user-provided style
    }

    return baseStyle;
  };

  // Determine text style
  const getTextStyle = () => {
    if (variant === 'outline') {
      return [styles.buttonText, styles.outlineText];
    }
    return styles.buttonText;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? COLORS.primary : COLORS.white} 
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    elevation: 2, // Android shadow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow || '#000', // fallback to black
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    elevation: 0,
  },
  danger: {
    backgroundColor: COLORS.error,
  },
  disabled: {
    backgroundColor: COLORS.disabled,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  outlineText: {
    color: COLORS.primary,
  },
});

export default CustomButton;
