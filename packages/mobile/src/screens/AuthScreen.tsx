import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const handleAuth = async () => {
    if (!inputValue || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    // Tumhara correct Mac IP address
    const API_URL = 'http://10.190.47.168:3000/api/auth';
    const endpoint = isLogin ? '/login' : '/signup';

    const payload = isLogin
      ? { identifier: inputValue, password }
      : { 
          username, 
          email: authMethod === 'email' ? inputValue : undefined, 
          phoneNumber: authMethod === 'phone' ? inputValue : undefined, 
          password 
        };

    try {
      const response = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        // Token save karke naye account me login karo
        await AsyncStorage.setItem('userToken', data.token);
        navigation.replace('Home'); 
      } else {
        Alert.alert('Error', data.message || data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Backend server se connect nahi ho paya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        
        {/* Header Icon */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
             <Ionicons name="chatbubbles" size={40} color="#4DACFF" />
          </View>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Log in to securely connect with friends' : 'Join PingUp and start chatting securely'}
          </Text>
        </View>

        {/* Form Area */}
        <View style={styles.formContainer}>
          
          {/* Email vs Phone Toggle (Sirf signup me dikhega for simplicity, ya login me bhi use kar sakte ho) */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, authMethod === 'email' && styles.toggleBtnActive]}
              onPress={() => setAuthMethod('email')}
            >
              <Ionicons name="mail" size={16} color={authMethod === 'email' ? '#12102A' : '#FFF'} />
              <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}> Email</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, authMethod === 'phone' && styles.toggleBtnActive]}
              onPress={() => setAuthMethod('phone')}
            >
              <Ionicons name="call" size={16} color={authMethod === 'phone' ? '#12102A' : '#FFF'} />
              <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}> Mobile</Text>
            </TouchableOpacity>
          </View>

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
            <Ionicons name={authMethod === 'email' ? "mail-outline" : "call-outline"} size={20} color="#6B6B8A" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={authMethod === 'email' ? 'Email Address' : 'Mobile Number'}
              placeholderTextColor="#6B6B8A"
              keyboardType={authMethod === 'email' ? 'email-address' : 'phone-pad'}
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

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{isLogin ? 'Login' : 'Sign Up'}</Text>}
          </TouchableOpacity>
        </View>

        {/* Switch Mode */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Login'}</Text>
          </TouchableOpacity>
        </View>

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