// app/services/FirebaseService.js
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

class FirebaseService {
  
  /**
   * Standard Email/Password Sign Up
   */
  async signUp(userData) {
    try {
      const { email, password, firstName, lastName, dateOfBirth, gender, phone } = userData;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        firstName: firstName,
        lastName: lastName,
        displayName: `${firstName} ${lastName}`,
        dateOfBirth: dateOfBirth,
        gender: gender,
        phone: phone || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ User created successfully:', user.uid);
      return { success: true, user };
      
    } catch (error) {
      console.error('❌ Sign up error:', error.code, error.message);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Google Sign-In using Access Token
   * Updated to follow your requested static structure while maintaining Firestore logic
   */
  async signInWithGoogle(accessToken) {
    try {
      // 1. Create the credential using the accessToken
      // Note: Passing null as the first param (idToken) and accessToken as the second
      const credential = GoogleAuthProvider.credential(null, accessToken);
      
      // 2. Sign in to Firebase with that credential
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      // 3. Store user in Firestore ONLY if they are new
      if (!userDoc.exists()) {
        const nameParts = user.displayName ? user.displayName.split(' ') : ['User', ''];
        await setDoc(userDocRef, {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          assistiveMode: null,
        });
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('❌ Google Sign-in error:', error.code);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }
  
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ User signed in successfully:', user.uid);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Sign in error:', error.code, error.message);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }
  
  async signOut() {
    try {
      await signOut(auth);
      console.log('✅ User signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: error.message };
    }
  }
  
  getCurrentUser() {
    return auth.currentUser;
  }
  
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
  
  async getUserData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      } else {
        return { success: false, error: 'User data not found' };
      }
    } catch (error) {
      console.error('❌ Get user data error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async updateUserProfile(userId, updates) {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        ...updates, 
        updatedAt: serverTimestamp() 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async saveFinancialProfile(userId, financialData) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        financialProfile: { 
          ...financialData, 
          hasData: true, 
          lastUpdated: serverTimestamp() 
        },
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password is too weak',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid email or password',
    };
    return errorMessages[errorCode] || 'An error occurred. Please try again';
  }
}

export default new FirebaseService();