// @ts-nocheck
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Firebase Auth Import
import {
  getAuth,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithCredential
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '693083297584-96rv4qgm51dtakav07o9ntj4vhkvqtqf.apps.googleusercontent.com', // Jo Firebase se copy ki hai
});

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState('email');
  
  // States for Email & common inputs
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // States for Phone OTP
  const [otpCode, setOtpCode] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // ⚠️ Apna IP address yahan confirm kar lena agar change hua ho
  const API_BASE = 'http://10.190.47.168:3000/api/auth';

  const handleToggleMethod = (method) => {
    setAuthMethod(method);
    setConfirmResult(null);
    setOtpCode('');
    setInputValue('');
  };

  // 📧 1. EMAIL AUTHENTICATION
  const handleEmailAuth = async () => {
    if (!inputValue || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    const endpoint = isLogin ? '/login' : '/signup';
    const payload = isLogin
      ? { identifier: inputValue, password }
      : { username, email: inputValue, password };

    try {
      const response = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        navigation.replace('Home'); 
      } else {
        Alert.alert('Error', data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Backend server se connect nahi ho paya.');
    } finally {
      setLoading(false);
    }
  };

  // 🌐 3. GOOGLE SIGN IN (FINAL - WITH BACKEND INTEGRATION)
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      try {
         await GoogleSignin.signOut();
      } catch (e) {
         // Ignore
      }
      
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken || (userInfo.data && userInfo.data.idToken);

      if (!idToken) throw new Error('Google ID token is missing.');

      // 1. Firebase Login
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const authInstance = getAuth();
      const userCredential = await signInWithCredential(authInstance, googleCredential);
      
      const userEmail = userCredential.user.email;
      const firebaseUid = userCredential.user.uid;

      // ✨ 2. API CALL TO YOUR NODE.JS BACKEND
      // DHYAN DEIN: 'localhost' phone me kaam nahi karta. Apne Mac ka Local IP address yahan daalein (jaise 192.168.1.x)
      const BACKEND_URL = 'http://10.190.47.168:3000/api/auth/unified-login'; 

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          authProvider: 'google',
          firebaseUid: firebaseUid
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Backend wala JWT Token aur User info phone me save karo
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
        
        console.log("Database me user save ho gaya:", data.user.username);
        
        // Final: Home Screen par le jao
        navigation.replace('Home'); 
      } else {
        Alert.alert('Backend Error', data.message || 'Database me save nahi hua.');
      }
      
    } catch (error) {
      console.error('Google Login Error:', error);
      Alert.alert('Authentication Failed', 'We could not sign you in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 📞 2. PHONE OTP SEND
  
const sendOTP = async () => {
  const phone = inputValue.replace(/\D/g, '');

  if (phone.length !== 10) {
    Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile number.');
    return;
  }

  setLoading(true);

  try {
    const firebaseAuth = getAuth();

    const confirmation = await signInWithPhoneNumber(
      firebaseAuth,
      `+91${phone}`
    );

    setConfirmResult(confirmation);

    Alert.alert(
  'Verify Your Number',
  `A 6-digit verification code has been sent to +91 ${inputValue}.`,
  [{ text: 'Continue', style: 'default' }]
);
  } catch (error: any) {
    console.error('OTP Send Error:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);

    Alert.alert(
      'OTP Error',
      error?.message || String(error) || 'Unknown Firebase error'
    );
  } finally {
    setLoading(false);
  }
};


  // ✅ 3. PHONE OTP VERIFY
  const verifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('OTP Required', 'Please enter the verification code.');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await confirmResult.confirm(otpCode);
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch(`${API_BASE}/verify-firebase-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, phoneNumber: `+91${inputValue}` })
      });
      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        navigation.replace('Home');
      } else {
        Alert.alert('Error', 'Backend verification failed!');
      }
    } catch (error) {
      console.error('Verify Error:', error);
      Alert.alert('Error', 'Galat OTP! Wapas try karo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (authMethod === 'email') {
      handleEmailAuth();
    } else {
      if (!confirmResult) sendOTP();
      else verifyOTP();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
             <Ionicons name="chatbubbles" size={40} color="#4DACFF" />
          </View>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Log in to securely connect with friends' : 'Join PingUp and start chatting securely'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, authMethod === 'email' && styles.toggleBtnActive]}
              onPress={() => handleToggleMethod('email')}
            >
              <Ionicons name="mail" size={16} color={authMethod === 'email' ? '#12102A' : '#FFF'} />
              <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}> Email</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, authMethod === 'phone' && styles.toggleBtnActive]}
              onPress={() => handleToggleMethod('phone')}
            >
              <Ionicons name="call" size={16} color={authMethod === 'phone' ? '#12102A' : '#FFF'} />
              <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}> Mobile</Text>
            </TouchableOpacity>
          </View>

          {authMethod === 'email' && (
            <>
              {!isLogin && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#6B6B8A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a Username"
                    placeholderTextColor="#6B6B8A"
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                  />
                </View>
              )}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#6B6B8A" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#6B6B8A"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={inputValue}
                  onChangeText={setInputValue}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B6B8A" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#6B6B8A"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </>
          )}

          {authMethod === 'phone' && (
            <>
              {!confirmResult ? (
                <View style={styles.inputWrapper}>
                  <Text style={{color: '#FFF', fontSize: 16, marginRight: 10}}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    placeholderTextColor="#6B6B8A"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={inputValue}
                    onChangeText={setInputValue}
                  />
                </View>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="keypad-outline" size={20} color="#6B6B8A" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#6B6B8A"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />
                  </View>
                  <TouchableOpacity onPress={() => setConfirmResult(null)} style={{alignItems: 'flex-end', marginBottom: 10}}>
                    <Text style={{color: '#4DACFF', fontSize: 12}}>Change Number?</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handlePrimaryAction} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.primaryBtnText}>
                {authMethod === 'email' 
                  ? (isLogin ? 'Login' : 'Sign Up') 
                  : (!confirmResult ? 'Send OTP' : 'Verify & Login')}
              </Text>
            )}
          </TouchableOpacity>

          {/* ✨ YAHAN SE NAYA GOOGLE BUTTON SHURU HAI ✨ */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 25 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <Text style={{ color: '#A0A0C0', marginHorizontal: 10, fontSize: 14 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: '#FFF', shadowColor: 'rgba(255,255,255,0.3)', marginTop: 0 }]} 
            onPress={handleGoogleSignIn} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#12102A" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="logo-google" size={22} color="#DB4437" style={{ marginRight: 10 }} />
                <Text style={[styles.primaryBtnText, { color: '#12102A' }]}>
                  Continue with Google
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {/* ✨ GOOGLE BUTTON YAHAN KHATAM HUA ✨ */}

        </View>

        {authMethod === 'email' && (
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Login'}</Text>
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  inner: { flex: 1, padding: 25, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(77, 172, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#A0A0C0', textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { marginBottom: 30 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#1A183A', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#4DACFF' },
  toggleText: { color: '#FFF', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  toggleTextActive: { color: '#12102A' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A183A', borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', paddingVertical: 16, fontSize: 16 },
  primaryBtn: { backgroundColor: '#4DACFF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  switchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: '#A0A0C0', fontSize: 14 },
  switchTextBold: { color: '#4DACFF', fontSize: 14, fontWeight: 'bold' }
});