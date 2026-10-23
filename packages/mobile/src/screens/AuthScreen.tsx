// @ts-nocheck
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, 
  ActivityIndicator, ScrollView, Animated, Easing 
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
  webClientId: '693083297584-96rv4qgm51dtakav07o9ntj4vhkvqtqf.apps.googleusercontent.com',
});

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState('email');
  
  // States for Email & common inputs
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // States for Phone OTP
  const [otpCode, setOtpCode] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0); // ✨ NAYA: Resend Timer
  
  // FIXED LOADING STATE
  const [loadingType, setLoadingType] = useState(null); 
  
  const navigation = useNavigation();
  const { signIn } = useContext(AuthContext);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance Animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

        // Shimmer Animation Loop (Web pe band)
    let shimmerLoop: any = null;
    if (Platform.OS !== 'web') {
      shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, { 
          toValue: 1, 
          duration: 2000, 
          useNativeDriver: true,
          easing: Easing.linear
        })
      );
      shimmerLoop.start();
    }

    return () => {
      if (shimmerLoop) shimmerLoop.stop();
    };
  }, []);

  // ✨ NAYA: Resend Timer Effect
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const API_BASE = 'http://10.190.47.168:3000/api/auth';

  const handleToggleMethod = (method) => {
    setAuthMethod(method);
    setConfirmResult(null);
    setOtpCode('');
    setInputValue('');
    setResendTimer(0);
  };

  // 📧 1. EMAIL AUTHENTICATION
  const handleEmailAuth = async () => {
    if (!inputValue || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoadingType('email');
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
        await AsyncStorage.setItem('userId', data.user.id.toString());
        signIn(data.token);
      } else {
        Alert.alert('Error', data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Backend server se connect nahi ho paya.');
    } finally {
      setLoadingType(null); // ✨ FIX: Always clear loading
    }
  };

  // 🌐 3. GOOGLE SIGN IN
  const handleGoogleSignIn = async () => {
    try {
      setLoadingType('google');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      try { await GoogleSignin.signOut(); } catch (e) {}
      
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken || (userInfo.data && userInfo.data.idToken);

      if (!idToken) throw new Error('Google ID token is missing.');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const authInstance = getAuth();
      const userCredential = await signInWithCredential(authInstance, googleCredential);
      
      const userEmail = userCredential.user.email;
      const firebaseUid = userCredential.user.uid;

      const BACKEND_URL = 'http://10.190.47.168:3000/api/auth/unified-login'; 

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, authProvider: 'google', firebaseUid })
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
        signIn(data.token); 
      } else {
        Alert.alert('Backend Error', data.message || 'Database me save nahi hua.');
      }
      
    } catch (error) {
      console.error('Google Login Error:', error);
      Alert.alert('Authentication Failed', 'Google login failed. Please try again.');
    } finally {
      setLoadingType(null); // ✨ FIX: Always clear loading
    }
  };

  // 📞 2. PHONE OTP SEND (Bug Fixed & Resend Added)
  const sendOTP = async (isResending = false) => {
    const phone = inputValue.replace(/\D/g, '');
    if (phone.length !== 10) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile number.');
      return;
    }

    setLoadingType(isResending ? 'resend' : 'otp');
    try {
      const firebaseAuth = getAuth();
      const confirmation = await signInWithPhoneNumber(firebaseAuth, `+91${phone}`);
      setConfirmResult(confirmation);
      setResendTimer(30); // ✨ 30 sec timer start
      Alert.alert('Verify Number', `OTP sent to +91 ${inputValue}`, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('OTP Error', error?.message || 'Firebase error');
    } finally {
      setLoadingType(null); // ✨ FIX: Always clear loading
    }
  };

  // ✅ 3. PHONE OTP VERIFY
  const verifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('OTP Required', 'Please enter the 6-digit code.');
      return;
    }
    setLoadingType('verify');
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
        await AsyncStorage.setItem('userId', data.user.id.toString());
        signIn(data.token);
      } else {
        Alert.alert('Error', 'Backend verification failed!');
      }
    } catch (error) {
      Alert.alert('Error', 'Galat OTP! Wapas try karo.');
    } finally {
      setLoadingType(null); // ✨ FIX: Always clear loading
    }
  };

  const handlePrimaryAction = () => {
    if (authMethod === 'email') handleEmailAuth();
    else {
      if (!confirmResult) sendOTP(false);
      else verifyOTP();
    }
  };

  // ✨ NAYA: Change Number logic
  const handleChangeNumber = () => {
    setConfirmResult(null);
    setOtpCode('');
    setInputValue('');
    setResendTimer(0);
  };

  const isPrimaryLoading = ['email', 'otp', 'verify'].includes(loadingType);
  const isAnythingLoading = loadingType !== null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300]
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* ✨ Background Glows */}
      <View pointerEvents="none" style={styles.bgGlow1} />
      <View pointerEvents="none" style={styles.bgGlow2} />
      <View pointerEvents="none" style={styles.bgGlow3} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* ✨ Header & Logo */}
            <View style={styles.headerContainer}>
              <View style={styles.logoOuter}>
                <View style={styles.logoMiddle}>
                  <View style={styles.logoInner}>
                    <Ionicons name="chatbubbles" size={38} color="#4DACFF" />
                  </View>
                </View>
              </View>
              <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <Text style={styles.subtitle}>
                {isLogin 
                  ? (authMethod === 'email' ? 'Log in with your email to connect.' : 'Log in with your mobile number to continue.')
                  : (authMethod === 'email' ? 'Join PingUp and experience premium chatting.' : 'Sign up with your mobile number to join PingUp.')}
              </Text>
            </View>

            {/* ✨ Glassmorphism Form Card */}
            <View style={styles.formCard}>
              
              {/* Toggle Switch */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, authMethod === 'email' && styles.toggleBtnActive]}
                  onPress={() => handleToggleMethod('email')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail" size={16} color={authMethod === 'email' ? '#12102A' : '#6B6B8A'} />
                  <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}> Email</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, authMethod === 'phone' && styles.toggleBtnActive]}
                  onPress={() => handleToggleMethod('phone')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={16} color={authMethod === 'phone' ? '#12102A' : '#6B6B8A'} />
                  <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}> Mobile</Text>
                </TouchableOpacity>
              </View>

              {/* Email Inputs */}
              {authMethod === 'email' && (
                <>
                  {!isLogin && (
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color="#4DACFF" style={styles.inputIcon} />
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
                    <Ionicons name="mail-outline" size={20} color="#4DACFF" style={styles.inputIcon} />
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
                    <Ionicons name="lock-closed-outline" size={20} color="#4DACFF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#6B6B8A"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{padding: 5}}>
                      <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#6B6B8A" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Phone Inputs */}
              {authMethod === 'phone' && (
                <>
                  {!confirmResult ? (
                    <View style={styles.inputWrapper}>
                      <Text style={{color: '#4DACFF', fontSize: 16, marginRight: 10, fontWeight: '800'}}>+91</Text>
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
                        <Ionicons name="keypad-outline" size={20} color="#4DACFF" style={styles.inputIcon} />
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
                      <View style={styles.otpActionsRow}>
                        <TouchableOpacity onPress={handleChangeNumber}>
                          <Text style={styles.changeNumberText}>Change Number?</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          onPress={() => sendOTP(true)} 
                          disabled={resendTimer > 0 || isAnythingLoading}
                        >
                          {loadingType === 'resend' ? (
                            <ActivityIndicator size="small" color="#4DACFF" />
                          ) : (
                            <Text style={[styles.resendText, resendTimer > 0 && { color: '#6B6B8A' }]}>
                              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}

              {/* ✨ Primary Button with Shimmer (Always mounted, opacity controlled) */}
              <TouchableOpacity 
                style={[styles.primaryBtn, isAnythingLoading && { opacity: 0.7 }]} 
                onPress={handlePrimaryAction} 
                disabled={isAnythingLoading}
                activeOpacity={0.8}
              >
                                {Platform.OS !== 'web' && (
                  <Animated.View 
                    pointerEvents="none"
                    style={[
                      styles.shimmer, 
                      { 
                        transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }],
                        opacity: isPrimaryLoading ? 0 : 0.6 
                      }
                    ]} 
                  />
                )}

                {isPrimaryLoading ? (
                  <ActivityIndicator color="#12102A" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {authMethod === 'email' 
                      ? (isLogin ? 'Login' : 'Create Account') 
                      : (!confirmResult 
                          ? (isLogin ? 'Send Login OTP' : 'Send Signup OTP') 
                          : (isLogin ? 'Verify & Login' : 'Verify & Sign Up'))}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign-In Button */}
              <TouchableOpacity 
                style={[styles.googleBtn, isAnythingLoading && { opacity: 0.7 }]} 
                onPress={handleGoogleSignIn} 
                disabled={isAnythingLoading}
                activeOpacity={0.8}
              >
                {loadingType === 'google' ? (
                  <ActivityIndicator color="#12102A" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                    <Text style={styles.googleBtnText}>Google</Text>
                  </View>
                )}
              </TouchableOpacity>

            </View>

            {/* ✨ Switch Login/Signup */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Login'}</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  
  bgGlow1: {
    position: 'absolute', top: -120, right: -100,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(77,172,255,0.08)',
  },
  bgGlow2: {
    position: 'absolute', bottom: -150, left: -100,
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(155,89,182,0.06)',
  },
  bgGlow3: {
    position: 'absolute', top: '30%', left: '10%',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(77,255,184,0.03)',
  },

  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  
  headerContainer: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  logoOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(77,172,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  logoMiddle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(77,172,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15,
  },
  title: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', marginBottom: 10, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#A0A0C0', textAlign: 'center', paddingHorizontal: 10, lineHeight: 22, fontWeight: '500' },
  
  formCard: { 
    backgroundColor: 'rgba(26, 24, 58, 0.6)', 
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
  },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(18,16,42,0.8)', borderRadius: 16, padding: 5, marginBottom: 20 },
  toggleBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  toggleBtnActive: { backgroundColor: '#4DACFF', shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  toggleText: { color: '#6B6B8A', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  toggleTextActive: { color: '#12102A', fontWeight: '900' },
  
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.04)', 
    borderRadius: 16, marginBottom: 14, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', 
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  
  // ✨ OTP Actions Row
  otpActionsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15, 
    alignItems: 'center' 
  },
  changeNumberText: { 
    color: '#FF6B6B', 
    fontSize: 13, 
    fontWeight: '700' 
  },
  resendText: { 
    color: '#4DACFF', 
    fontSize: 13, 
    fontWeight: '700' 
  },

  primaryBtn: { 
    backgroundColor: '#4DACFF', 
    height: 56,
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 10, 
    overflow: 'hidden', 
    shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8,
  },
  primaryBtnText: { color: '#12102A', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#6B6B8A', marginHorizontal: 12, fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  googleBtn: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  googleBtnText: { color: '#12102A', fontSize: 16, fontWeight: '800' },

  switchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  switchText: { color: '#A0A0C0', fontSize: 14, fontWeight: '500' },
  switchTextBold: { color: '#4DACFF', fontSize: 14, fontWeight: '900' }
});