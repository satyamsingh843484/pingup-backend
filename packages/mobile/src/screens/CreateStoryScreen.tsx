// @ts-nocheck
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Poppins_400Regular } from '@expo-google-fonts/poppins';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { RobotoMono_400Regular } from '@expo-google-fonts/roboto-mono';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Lobster_400Regular } from '@expo-google-fonts/lobster';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';

// ✨ NAYA: 25+ Premium, Professional & Vibrant Colors
const BACKGROUND_COLORS = [
  '#12102A', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', 
  '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93', '#1ABC9C', '#E74C3C', 
  '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#34495E', 
  '#16A085', '#27AE60', '#2980B9', '#8E44AD', '#F39C12', '#D35400', 
  '#C0392B', '#00CEC9', '#FD79A8', '#6C5CE7'
];

const FONT_STYLES = [
  { name: 'Default', id: 'default', family: undefined }, // System Default
  { name: 'Poppins', id: 'poppins', family: 'Poppins_400Regular' },
  { name: 'Playfair', id: 'playfair', family: 'PlayfairDisplay_700Bold' },
  { name: 'Roboto Mono', id: 'roboto-mono', family: 'RobotoMono_400Regular' },
  { name: 'Pacifico', id: 'pacifico', family: 'Pacifico_400Regular' },
  { name: 'Oswald', id: 'oswald', family: 'Oswald_700Bold' },
  { name: 'Montserrat', id: 'montserrat', family: 'Montserrat_700Bold' },
  { name: 'Lobster', id: 'lobster', family: 'Lobster_400Regular' },
  { name: 'Dancing', id: 'dancing', family: 'DancingScript_700Bold' },
];

export default function CreateStoryScreen() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0); 
  const [isPosting, setIsPosting] = useState(false);

    // ✨ FIX: fontError add kiya taaki web crash na ho
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    PlayfairDisplay_700Bold,
    RobotoMono_400Regular,
    Pacifico_400Regular,
    Oswald_700Bold,
    Montserrat_700Bold,
    Lobster_400Regular,
    DancingScript_700Bold,
  });

  // ✨ FIX: Blank screen ki jagah ab Loading Spinner dikhega
  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#12102A', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
        <Text style={{ color: '#FFF', marginTop: 15, fontSize: 16, fontWeight: '600' }}>
          Loading Fonts...
        </Text>
      </SafeAreaView>
    );
  }

  // Tera purana code yahan se same chalu rahega
  const currentColor = BACKGROUND_COLORS[colorIndex];
  const currentFont = FONT_STYLES[fontIndex];

  // ✨ LOGIC UNTOUCHED
  const changeColor = () => {
    setColorIndex((prev) => (prev + 1) % BACKGROUND_COLORS.length);
  };

  // ✨ NAYA LOGIC: Font change function
  const changeFont = () => {
    setFontIndex((prev) => (prev + 1) % FONT_STYLES.length);
  };

  // ✨ LOGIC UNTOUCHED (100% SAME)
  const handlePostStory = async () => {
    if (!text.trim()) return;
    setIsPosting(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('https://pingup-backend-v25a.onrender.com/api/stories/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: text,
          backgroundColor: currentColor,
          fontFamily: currentFont.id,
        })
      });

      const json = await response.json();
      if (json.success) {
        navigation.goBack(); 
      } else {
        Alert.alert("Error", "Could not post story");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network issue");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColor }]}>
      
      {/* ===== HEADER (Floating Glass Buttons) ===== */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.glassBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.rightActions}>
          {/* Font Button */}
          <TouchableOpacity 
            onPress={changeFont} 
            style={styles.glassBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="format-font" size={22} color="#FFF" />
          </TouchableOpacity>

          {/* Color Button */}
          <TouchableOpacity 
            onPress={changeColor} 
            style={styles.glassBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="color-palette-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== FULL SCREEN INPUT AREA ===== */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
        {/* ✨ NAYA: Selected Font Name Dikhane ke liye */}
        <View style={styles.fontNameContainer}>
          <Text style={styles.fontNameText}>Font: {currentFont.name}</Text>
        </View>
        <TextInput
          style={[styles.textInput, { fontFamily: currentFont.family || (Platform.OS === 'ios' ? 'System' : 'sans-serif') }]}
          placeholder="Type a status..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          maxLength={700}
          autoFocus
          value={text}
          onChangeText={setText}
          selectionColor="#FFF"
        />
      </KeyboardAvoidingView>

      {/* ===== PREMIUM POST BUTTON (FAB) ===== */}
      {text.trim().length > 0 && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={handlePostStory} 
          disabled={isPosting}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>{isPosting ? 'Posting...' : 'Post Story'}</Text>
          <Ionicons name={isPosting ? "hourglass-outline" : "send"} size={18} color="#12102A" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // ===== HEADER =====
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  glassBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },

  // ===== INPUT =====
  inputContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24,
    zIndex: 5,
  },
  textInput: { 
    color: '#FFF', 
    fontSize: 36, 
    fontWeight: '800', 
    textAlign: 'center', 
    width: '100%',
    lineHeight: 48,
    // Text Shadow taaki light background pe bhi text clear dikhe
    textShadowColor: 'rgba(0, 0, 0, 0.25)', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 6 
  },

  // ===== POST BUTTON =====
  fab: { 
    position: 'absolute', 
    right: 24, 
    bottom: Platform.OS === 'ios' ? 40 : 30, 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4DACFF', 
    paddingHorizontal: 24,
    height: 54,
    borderRadius: 27,
    gap: 10,
    zIndex: 10,
    shadowColor: '#4DACFF', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },
  fabText: {
    color: '#12102A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
    fontNameContainer: {
    position: 'absolute',
    top: 20, // Input area ke top pe
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fontNameText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  }
});