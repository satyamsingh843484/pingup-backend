import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator,
  Modal, TextInput, Alert, Linking // ✨ NAYE IMPORTS
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

const HeartIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="#FF3B30">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Svg>
);

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ✨ EDIT PROFILE STATE
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updating, setUpdating] = useState(false);

  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Auth');
        return;
      }
      const response = await fetch('http://10.190.47.168:3000/api/profile/me', {
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
      const response = await fetch('http://10.190.47.168:3000/api/profile/update', {
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
        // Apna asli email/phone yahan replace kar lena
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Auth');
  };

  // ✨ MENU CLICK HANDLER
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
    { icon: 'lock-closed-outline', label: 'Privacy & Security', color: '#4DFFB8' },
    { icon: 'color-palette-outline', label: 'Appearance', color: '#9B59B6' },
    { icon: 'cloud-upload-outline', label: 'Backup & Restore', color: '#4DACFF' },
    { icon: 'help-circle-outline', label: 'Help & Support', color: '#FFB800' },
    { icon: 'information-circle-outline', label: 'About PingUp', color: '#A0A0C0' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{displayInitial}</Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileHandle}>@{username.toLowerCase().replace(/\s/g, '')}_99 • Level {profile?.streakCount ? profile.streakCount + 4 : 12} 🔥</Text>
          </View>
          {profile?.isPro && (
            <View style={styles.proChip}>
              <Ionicons name="star" size={11} color="#12102A" />
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>

        <View style={styles.statRow}>
          {[{ n: '128', l: 'Chats' }, { n: '4', l: 'Groups' }, { n: profile?.streakCount || '7', l: 'Streak' }, { n: '12', l: 'Level' }].map((s, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={styles.statNum}>{s.n}</Text>
              <Text style={styles.statLbl}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.storageCard}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cloud" size={18} color="#4DACFF" />
              <Text style={styles.cardTitle}>Storage</Text>
            </View>
            <Text style={styles.percent}>68% used</Text>
          </View>
          <View style={styles.bar}><View style={[styles.barFill, { width: '68%' }]} /></View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4DACFF' }]} /><Text style={styles.legendText}>Media 34%</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4DFFB8' }]} /><Text style={styles.legendText}>Docs 20%</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFB800' }]} /><Text style={styles.legendText}>Other 14%</Text></View>
          </View>
        </View>

        {/* Naya Menu map function jo handleMenuPress call karega */}
        {menu.map((m, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => handleMenuPress(m)}>
            <View style={[styles.menuIcon, { backgroundColor: `${m.color}20` }]}>
              <Ionicons name={m.icon as any} size={18} color={m.color} />
            </View>
            <Text style={styles.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#3A3860" />
          </TouchableOpacity>
        ))}

        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed" size={14} color="#4DFFB8" />
          <Text style={styles.privacyText}>End-to-end encrypted • Face ID active</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={[styles.footerContainer, { marginBottom: 100 }]}>
  <Text style={styles.footerText}>PingUp v2.4.0 • Made with </Text>
  <HeartIcon />
  <Text style={styles.footerText}> by Satyam</Text>
</View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ✨ EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile Name</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor="#6B6B8A"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={updating}>
                {updating ? (
                  <ActivityIndicator color="#12102A" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, marginBottom: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  profileInitial: { color: '#12102A', fontSize: 22, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4DFFB8', borderWidth: 2, borderColor: '#12102A' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 3 },
  profileHandle: { color: '#A0A0C0', fontSize: 12 },
  proChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFB800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  proText: { color: '#12102A', fontSize: 11, fontWeight: '800' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statNum: { color: '#4DACFF', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLbl: { color: '#A0A0C0', fontSize: 11, fontWeight: '600' },
  storageCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  percent: { color: '#4DACFF', fontSize: 12, fontWeight: '700' },
  bar: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  barFill: { height: '100%', backgroundColor: '#4DACFF', borderRadius: 4 },
  legendRow: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: '#A0A0C0', fontSize: 10, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  menuIcon: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 16 },
  privacyText: { color: '#6B6B8A', fontSize: 11, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,107,107,0.25)' },
  logoutText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },
  footerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 4 },
  footerText: { color: '#3A3860', fontSize: 12, fontWeight: '700' },

  // ✨ MODAL CSS (Dark theme ke hisaab se)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#1A183A', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFF', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: '#A0A0C0', fontWeight: 'bold' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#4DACFF', minWidth: 80, alignItems: 'center' },
  saveBtnText: { color: '#12102A', fontWeight: 'bold' }
});