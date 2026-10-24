import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator,
  Modal, TextInput,  Alert, Linking, Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

// ✨ NAYE IMPORTS: Logout fix ke liye
import socket from '../socket'; 
import { getAuth, signOut } from 'firebase/auth';
import { getAvatarColor } from '../utils/avatarUtils';

const HeartIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="#FF3B30">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Svg>
);

export default function ProfileScreen() {
  const { signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ✨ EDIT PROFILE STATE
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updating, setUpdating] = useState(false);

  const navigation = useNavigation<any>();

  // Entrance Animation for Premium Feel
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Auth');
        return;
      }
      const response = await fetch('https://pingup-backend-v25a.onrender.com/api/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {
        setProfile(json.user);
        setNewUsername(json.user.username); // Modal ke liye initial value set ki
      }
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✨ REAL DB UPDATE FUNCTION
  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be blank.");
      return;
    }
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('https://pingup-backend-v25a.onrender.com/api/profile/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ username: newUsername })
      });
      
      const json = await response.json();
      if (json.success) {
        setProfile(json.user); // Naya naam screen par turant dikhega
        setEditModalVisible(false);
      } else {
        Alert.alert("Error", "Profile update failed.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Server error.");
    } finally {
      setUpdating(false);
    }
  };

  // ✨ SUPPORT & ABOUT FUNCTIONS
  const handleSupport = () => {
    Alert.alert(
      "Help & Support",
      "Where you want to Contact?",
      [
        { text: "Email Me", onPress: () => Linking.openURL('mailto:satyam@example.com?subject=PingUp Support Request') },
        { text: "Call Me", onPress: () => Linking.openURL('tel:+919999999999') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About PingUp",
      "Version: 2.4.0\n\nDeveloped & Designed by Satyam Kumar.\n\n🔒 All your messages and calls are strictly End-to-End Encrypted.\nYour privacy is our top priority."
    );
  };

  // ✨ UPDATED: PERFECT LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      console.log("Logging out...");

      if (socket && socket.connected) {
        socket.disconnect();
      }

      try {
        const auth = getAuth();
        await signOut(auth);
      } catch (fbError) {
        console.log("Firebase signout error (ignoring):", fbError);
      }

      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      await AsyncStorage.removeItem('userId');

      signOut();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleMenuPress = (m: any) => {
    if (m.label === 'Edit Profile') {
      setEditModalVisible(true);
    } else if (m.label === 'Help & Support') {
      navigation.navigate('HelpSupportScreen');
    } else if (m.label === 'About PingUp') {
      navigation.navigate('AboutScreen');
    } else if (m.route) {
      navigation.navigate(m.route);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }

  const username = profile?.username || 'User';
  const displayInitial = username[0].toUpperCase();

  const menu = [
    { icon: 'person-outline', label: 'Edit Profile', color: '#4DACFF' },
    { icon: 'notifications-outline', label: 'Notifications', color: '#FFB800', route: 'NotificationsScreen' },
    { icon: 'lock-closed-outline', label: 'Privacy & Security', color: '#4DFFB8', route: 'PrivacySecurityScreen' },
    { icon: 'color-palette-outline', label: 'Appearance', color: '#9B59B6' },
    { icon: 'cloud-upload-outline', label: 'Backup & Restore', color: '#4DACFF' },
    { icon: 'help-circle-outline', label: 'Help & Support', color: '#FFB800' },
    { icon: 'information-circle-outline', label: 'About PingUp', color: '#A0A0C0' },
  ];

  const accountMenu = menu.slice(0, 5);
  const supportMenu = menu.slice(5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* ===== HEADER ===== */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Profile</Text>
              <Text style={styles.subtitle}>Manage your account & preferences</Text>
            </View>
            <TouchableOpacity 
              style={styles.headerIconBtn}
              onPress={() => setEditModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color="#4DACFF" />
            </TouchableOpacity>
          </View>

          {/* ===== HERO PROFILE CARD ===== */}
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarGlowRing} />
              <View style={[styles.profileAvatar, { backgroundColor: getAvatarColor(username) }]}>
                <Text style={styles.profileInitial}>{displayInitial}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>

            {profile?.isPro && (
              <View style={styles.proChip}>
                <Ionicons name="star" size={11} color="#12102A" />
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}

            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileHandle}>
              @{username.toLowerCase().replace(/\s/g, '')}_99
            </Text>

            {/* ✅ Verified Badge */}
            <View style={styles.verifiedContainer}>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#12102A" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>

          {/* ===== MENU — ACCOUNT ===== */}
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.menuGroup}>
            {accountMenu.map((m, i) => (
              <React.Fragment key={i}>
                <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => {
          if (m.route) {
            navigation.navigate(m.route);
          } else {
            handleMenuPress(m);
          }
        }} 
        activeOpacity={0.7}
      >
        <View style={[styles.menuIcon, { backgroundColor: `${m.color}22` }]}>
          <Ionicons name={m.icon as any} size={18} color={m.color} />
        </View>
        <Text style={styles.menuLabel}>{m.label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#3A3860" />
      </TouchableOpacity>
                {i < accountMenu.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* ===== MENU — SUPPORT ===== */}
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.menuGroup}>
            {supportMenu.map((m, i) => (
              <React.Fragment key={i}>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuPress(m)} activeOpacity={0.7}>
                  <View style={[styles.menuIcon, { backgroundColor: `${m.color}22` }]}>
                    <Ionicons name={m.icon as any} size={18} color={m.color} />
                  </View>
                  <Text style={styles.menuLabel}>{m.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#3A3860" />
                </TouchableOpacity>
                {i < supportMenu.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* ===== ORIGINAL BOTTOM ELEMENTS (UNTOUCHED) ===== */}
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={14} color="#4DFFB8" />
            <Text style={styles.privacyText}>End-to-end encrypted • Face ID active</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={[styles.footerContainer, { marginBottom: 150 }]}>
            <Text style={styles.footerText}>PingUp v2.4.0 • Made with </Text>
            <HeartIcon />
            <Text style={styles.footerText}> by Satyam</Text>
          </View>

        </Animated.View>
      </ScrollView>

                  {/* ===== EDIT PROFILE MODAL (Center Card) ===== */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setEditModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBig}>
                <Ionicons name="create-outline" size={22} color="#4DACFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSub}>Update your display name</Text>
              </View>
            </View>
            
            <Text style={styles.modalInputLabel}>USERNAME</Text>
            <TextInput
              style={styles.modalInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor="#6B6B8A"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleUpdateProfile} 
                disabled={updating}
                activeOpacity={0.85}
              >
                {updating ? (
                  <ActivityIndicator color="#12102A" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },

  // ===== HEADER =====
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 0.3 },
  subtitle: { fontSize: 12.5, color: '#6B6B8A', marginTop: 3, fontWeight: '500' },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ===== HERO CARD =====
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -80, right: -80,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(77,172,255,0.1)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlowRing: {
    position: 'absolute',
    top: -8, left: -8, right: -8, bottom: -8,
    borderRadius: 44,
    backgroundColor: 'rgba(77,172,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(77,172,255,0.2)',
  },
  profileAvatar: { 
    width: 72, height: 72, borderRadius: 36, 
    justifyContent: 'center', alignItems: 'center', 
    position: 'relative',
    borderWidth: 3,
    borderColor: '#12102A',
  },
  profileInitial: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  onlineDot: { 
    position: 'absolute', 
    bottom: 2, right: 2, 
    width: 18, height: 18, borderRadius: 9, 
    backgroundColor: '#4DFFB8', 
    borderWidth: 3, 
    borderColor: '#12102A' 
  },
  proChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#FFB800', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    position: 'absolute',
    top: 16, right: 16,
  },
  proText: { color: '#12102A', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  profileName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  profileHandle: { color: '#A0A0C0', fontSize: 12.5, fontWeight: '500', textAlign: 'center' },
  
  // ===== VERIFIED BADGE =====
  verifiedContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4DFFB8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#4DFFB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  verifiedText: {
    color: '#12102A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ===== SECTION TITLE =====
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6B6B8A',
    letterSpacing: 1.3,
    marginBottom: 12,
    marginLeft: 4,
  },

  // ===== MENU GROUP =====
  menuGroup: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 16,
    gap: 14, 
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginLeft: 60,
    marginRight: 16,
  },
  menuIcon: { 
    width: 36, height: 36, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center' 
  },
  menuLabel: { flex: 1, color: '#fff', fontSize: 14.5, fontWeight: '600' },

  // ===== ORIGINAL UNTOUCHED STYLES BELOW =====
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 16 },
  privacyText: { color: '#6B6B8A', fontSize: 11, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,107,107,0.25)' },
  logoutText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },
  footerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 4 },
  footerText: { color: '#3A3860', fontSize: 12, fontWeight: '700' },

  // ===== MODAL (BOTTOM SHEET) =====
    // ===== MODAL (Center Card Style) =====
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    justifyContent: 'center', // <-- Ye center me layega
    paddingHorizontal: 20,
  },
  modalContent: { 
    width: '100%', 
    backgroundColor: '#1A183A', 
    borderRadius: 24, // <-- Charo taraf se border radius
    padding: 24,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 100,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalIconBig: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(77,172,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  modalSub: { color: '#6B6B8A', fontSize: 11.5, marginTop: 2, fontWeight: '500' },
  modalInputLabel: {
    color: '#6B6B8A', fontSize: 10.5, fontWeight: '800',
    letterSpacing: 1.2, marginBottom: 8,
  },
  modalInput: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    color: '#FFF', 
    borderRadius: 14, 
    paddingHorizontal: 15, 
    paddingVertical: 14, 
    fontSize: 15, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    fontWeight: '600',
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { 
    flex: 1,
    paddingVertical: 15, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelBtnText: { color: '#A0A0C0', fontWeight: '700', fontSize: 14 },
  saveBtn: { 
    flex: 1,
    paddingVertical: 15, 
    borderRadius: 14, 
    backgroundColor: '#4DACFF', 
    alignItems: 'center',
    shadowColor: '#4DACFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#12102A', fontWeight: '800', fontSize: 14 },
});