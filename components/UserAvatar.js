// app/components/UserAvatar.js
// ═══════════════════════════════════════════════════════════════
// USER AVATAR COMPONENT - Display user initials in circular avatar
// Shows first letter of user's name in a colored circle
// ═══════════════════════════════════════════════════════════════

import { StyleSheet, Text, View } from 'react-native';
import COLORS from '../utils/colors';

/**
 * User Avatar Component
 * Displays first letter of name in a circular avatar
 * @param {string} name - User's full name
 * @param {number} size - Avatar size (default: 50)
 * @param {string} backgroundColor - Custom background color
 * @param {string} textColor - Custom text color
 */
const UserAvatar = ({ 
  name = 'User', 
  size = 50,
  backgroundColor = COLORS.primary,
  textColor = COLORS.white,
  style 
}) => {
  
  /**
   * Get first letter from name
   * If name has multiple words, get first letter of first word
   */
  const getInitial = () => {
    if (!name || name.trim() === '') {
      return 'U';
    }
    
    // Get first letter of first name
    const firstName = name.trim().split(' ')[0];
    return firstName.charAt(0).toUpperCase();
  };

  /**
   * Generate consistent color based on name
   * This ensures same name always gets same color
   */
  const generateColorFromName = () => {
    if (backgroundColor !== COLORS.primary) {
      return backgroundColor; // Use custom color if provided
    }
    
    // Array of colors to choose from
    const colors = [
      '#0A2540', // Navy Blue
      '#1F6AE1', // Royal Blue
      '#2ECC71', // Green
      '#E74C3C', // Red
      '#F39C12', // Orange
      '#9B59B6', // Purple
      '#3498DB', // Light Blue
      '#16A085', // Teal
    ];
    
    // Generate index based on first letter
    const initial = getInitial();
    const charCode = initial.charCodeAt(0);
    const index = charCode % colors.length;
    
    return colors[index];
  };

  return (
    <View 
      style={[
        styles.avatar, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: generateColorFromName()
        },
        style
      ]}
    >
      <Text 
        style={[
          styles.avatarText, 
          { 
            fontSize: size * 0.4,
            color: textColor 
          }
        ]}
      >
        {getInitial()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UserAvatar;