// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, Platform, Modal, Animated, PanResponder 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// ✨ CUSTOM TOGGLE SWITCH (Small & Single Color)
// ==========================================
const CustomSwitch = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={[
        styles.switchTrack,
        { backgroundColor: value ? '#4DACFF' : 'rgba(255,255,255,0.1)' }
      ]}
    >
      <View style={[
        styles.switchThumb,
        { alignSelf: value ? 'flex-end' : 'flex-start' }
      ]} />
    </TouchableOpacity>
  );
};

// ==========================================
// ✨ PREMIUM BOTTOM SHEET (iOS Style Drag & Animation)
// ==========================================
const PremiumBottomSheet = ({ visible, onClose, children }: any) => {
  const translateY = useRef(new Animated.Value(500)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [renderModal, setRenderModal] = useState(false);

  // Real Swipe/Drag to Close Logic using PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Taps inside modal pass through to buttons
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if dragging down (not scrolling/up)
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If dragged more than 100px or swiped down fast -> close it
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          // Otherwise, bounce back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      translateY.setValue(500);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 500, duration: 220, useNativeDriver: true })
      ]).start(() => setRenderModal(false));
    }
  }, [visible]);

  if (!renderModal) return null;

  return (
    <Modal transparent={true} visible={renderModal} animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity, position: 'absolute', width: '100%', height: '100%' }} />
      <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        
        {/* PanHandlers attached here for smooth drag */}
        <Animated.View 
          style={{ transform: [{ translateY }], width: '100%' }}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>

      </TouchableOpacity>
    </Modal>
  );
};

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  
  // ===== ORIGINAL LOGIC STATES (Untouched) =====
  const [readReceipts, setReadReceipts] = useState(true);
  const [appLock, setAppLock] = useState(false);

  // ===== NAYE UI STATES =====
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [screenshotBlock, setScreenshotBlock] = useState(false);
  const [lastSeen, setLastSeen] = useState('Everyone');
  const [disappearing, setDisappearing] = useState('Off');

  // Bottom Sheet States
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetType, setSheetType] = useState(null);

  // ===== ORIGINAL LOGIC (Untouched) =====
  useEffect(() => {
    const loadSettings = async () => {
      const savedReceipts = await AsyncStorage.getItem('readReceipts');
      const savedAppLock = await AsyncStorage.getItem('appLock');
      if (savedReceipts !== null) setReadReceipts(savedReceipts === 'true');
      if (savedAppLock !== null) setAppLock(savedAppLock === 'true');
    };
    loadSettings();
  }, []);

  const toggleReadReceipts = async (value: boolean) => {
    setReadReceipts(value);
    await AsyncStorage.setItem('readReceipts', value.toString());
  };

  const toggleAppLock = async (value: boolean) => {
    setAppLock(value);
    await AsyncStorage.setItem('appLock', value.toString());
  };

  // ===== BOTTOM SHEET CONTENT RENDERER =====
  const renderSheetContent = () => {
    switch (sheetType) {
      case 'lastSeen':
        return (
          <>
            <Text style={styles.sheetTitle}>Last Seen & Online</Text>
            <Text style={styles.sheetSub}>Who can see when you were last online?</Text>
            {['Everyone', 'My Contacts', 'Nobody'].map((option) => (
              <TouchableOpacity 
                key={option} 
                style={styles.sheetOption} 
                onPress={() => { setLastSeen(option); setSheetVisible(false); }}
              >
                <Text style={[styles.sheetOptionText, lastSeen === option && { color: '#4DACFF' }]}>{option}</Text>
                {lastSeen === option && <Ionicons name="checkmark" size={20} color="#4DACFF" />}
              </TouchableOpacity>
            ))}
          </>
        );
      case 'disappearing':
        return (
          <>
            <Text style={styles.sheetTitle}>Disappearing Messages</Text>
            <Text style={styles.sheetSub}>New messages will disappear after the selected time.</Text>
            {['Off', '24 Hours', '7 Days', '90 Days'].map((option) => (
              <TouchableOpacity 
                key={option} 
                style={styles.sheetOption} 
                onPress={() => { setDisappearing(option); setSheetVisible(false); }}
              >
                <Text style={[styles.sheetOptionText, disappearing === option && { color: '#4DACFF' }]}>{option}</Text>
                {disappearing === option && <Ionicons name="checkmark" size={20} color="#4DACFF" />}
              </TouchableOpacity>
            ))}
          </>
        );
      case 'twoStep':
        return (
          <>
            <View style={styles.sheetIconBig}>
              <Ionicons name="shield-checkmark" size={32} color="#4DFFB8" />
            </View>
            <Text style={[styles.sheetTitle, { textAlign: 'center' }]}>Two-Step Verification</Text>
            <Text style={[styles.sheetSub, { textAlign: 'center', marginBottom: 20 }]}>
              Add an extra layer of security to your account. You'll need a PIN when logging in.
            </Text>
            <TouchableOpacity style={styles.primarySheetBtn} onPress={() => setSheetVisible(false)}>
              <Text style={styles.primarySheetBtnText}>Enable 2FA</Text>
            </TouchableOpacity>
          </>
        );
      case 'linked':
        return (
          <>
            <Text style={styles.sheetTitle}>Linked Devices</Text>
            <View style={styles.deviceRow}>
              <Ionicons name="phone-portrait" size={24} color="#4DACFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deviceName}>This Phone</Text>
                <Text style={styles.deviceDesc}>Active now</Text>
              </View>
            </View>
          </>
        );
      case 'login':
        return (
          <>
            <Text style={styles.sheetTitle}>Login Activity</Text>
            <View style={styles.deviceRow}>
              <Ionicons name="desktop-outline" size={24} color="#6B6B8A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deviceName}>Chrome on Windows</Text>
                <Text style={styles.deviceDesc}>Yesterday, 10:45 PM</Text>
              </View>
            </View>
          </>
        );
      case 'blocked':
        return (
          <>
            <View style={[styles.sheetIconBig, { backgroundColor: 'rgba(255,107,107,0.1)' }]}>
              <Ionicons name="ban" size={32} color="#FF6B6B" />
            </View>
            <Text style={[styles.sheetTitle, { textAlign: 'center' }]}>Blocked Contacts</Text>
            <Text style={[styles.sheetSub, { textAlign: 'center' }]}>You haven't blocked anyone yet.</Text>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ===== 1. TOP STATUS CARD ===== */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardGlow} />
          <View style={styles.statusIconBox}>
            <Ionicons name="shield-checkmark" size={28} color="#4DFFB8" />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Your account is secure</Text>
            <Text style={styles.statusDesc}>End-to-end encryption is active for all your chats.</Text>
            <View style={styles.statusBadge}>
              <Ionicons name="lock-closed" size={10} color="#12102A" />
              <Text style={styles.statusBadgeText}>E2E ENCRYPTED</Text>
            </View>
          </View>
        </View>

        {/* ===== 2. PRIVACY SECTION ===== */}
        <Text style={styles.sectionTitle}>PRIVACY CONTROLS</Text>
        <View style={styles.cardGroup}>
          
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(77,255,184,0.15)' }]}>
              <Ionicons name="checkmark-done" size={20} color="#4DFFB8" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Read Receipts</Text>
              <Text style={styles.settingDesc}>Show blue ticks when you read</Text>
            </View>
            <CustomSwitch value={readReceipts} onValueChange={toggleReadReceipts} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(77,172,255,0.15)' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4DACFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Typing Indicator</Text>
              <Text style={styles.settingDesc}>Show when you're typing</Text>
            </View>
            <CustomSwitch value={typingIndicator} onValueChange={setTypingIndicator} />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => { setSheetType('lastSeen'); setSheetVisible(true); }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,184,0,0.15)' }]}>
              <Ionicons name="eye-outline" size={20} color="#FFB800" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Last Seen & Online</Text>
              <Text style={styles.settingDesc}>{lastSeen}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => { setSheetType('disappearing'); setSheetVisible(true); }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(155,89,182,0.15)' }]}>
              <Ionicons name="time-outline" size={20} color="#9B59B6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Disappearing Messages</Text>
              <Text style={styles.settingDesc}>{disappearing}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>

        </View>

        {/* ===== 3. SECURITY SECTION ===== */}
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.cardGroup}>
          
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(155,89,182,0.15)' }]}>
              <Ionicons name="finger-print-outline" size={20} color="#9B59B6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>App Lock</Text>
              <Text style={styles.settingDesc}>Require Face ID / Fingerprint to open PingUp.</Text>
            </View>
            <CustomSwitch value={appLock} onValueChange={toggleAppLock} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,107,107,0.15)' }]}>
              <Ionicons name="scan-outline" size={20} color="#FF6B6B" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Block Screenshots</Text>
              <Text style={styles.settingDesc}>Prevent taking screenshots inside the app.</Text>
            </View>
            <CustomSwitch value={screenshotBlock} onValueChange={setScreenshotBlock} />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => { setSheetType('twoStep'); setSheetVisible(true); }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(77,172,255,0.15)' }]}>
              <Ionicons name="key-outline" size={20} color="#4DACFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Two-Step Verification</Text>
              <Text style={styles.settingDesc}>Add an extra PIN when logging in.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>

        </View>

        {/* ===== 4. ACCOUNT ACTIVITY SECTION ===== */}
        <Text style={styles.sectionTitle}>ACCOUNT ACTIVITY</Text>
        <View style={styles.cardGroup}>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => { setSheetType('linked'); setSheetVisible(true); }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(77,255,184,0.15)' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#4DFFB8" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Linked Devices</Text>
              <Text style={styles.settingDesc}>2 active devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => { setSheetType('login'); setSheetVisible(true); }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,184,0,0.15)' }]}>
              <Ionicons name="time-outline" size={20} color="#FFB800" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Login Activity</Text>
              <Text style={styles.settingDesc}>Check where you're logged in</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => { setSheetType('blocked'); setSheetVisible(true); }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,107,107,0.15)' }]}>
              <Ionicons name="ban-outline" size={20} color="#FF6B6B" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingText}>Blocked Contacts</Text>
              <Text style={styles.settingDesc}>0 contacts blocked</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>

        </View>

        {/* ===== FOOTER TEXT ===== */}
        <Text style={styles.footerText}>
          PingUp takes your privacy seriously. We do not store your messages on our servers.
        </Text>

      </ScrollView>

      {/* ===== PREMIUM BOTTOM SHEET ===== */}
      <PremiumBottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View style={styles.modalContent}>
          
          {/* Clickable Drag Handle (Tab pe band ho jayega) */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setSheetVisible(false)}
            style={{ alignItems: 'center', paddingVertical: 12, marginTop: -12 }}
          >
            <View style={styles.modalDragHandle} />
          </TouchableOpacity>

          {renderSheetContent()}
        </View>
      </PremiumBottomSheet>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  
  // ===== HEADER =====
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? 40 : 20, 
    backgroundColor: '#1A183A', 
    borderBottomWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  
  scrollContent: { padding: 20, paddingBottom: 50 },

  // ===== CUSTOM TOGGLE SWITCH =====
  switchTrack: {
    width: 40, 
    height: 22, 
    borderRadius: 11,
    justifyContent: 'center',
    padding: 2,
  },
  switchThumb: {
    width: 18, 
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },

  // ===== TOP STATUS CARD =====
  statusCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 24, 58, 0.8)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(77, 255, 184, 0.2)',
    marginBottom: 24,
    alignItems: 'center',
    gap: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  statusCardGlow: {
    position: 'absolute',
    top: -30, right: -30,
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(77, 255, 184, 0.08)',
  },
  statusIconBox: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(77, 255, 184, 0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  statusTextContainer: { flex: 1 },
  statusTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  statusDesc: { color: '#A0A0C0', fontSize: 12, lineHeight: 16, marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4DFFB8', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusBadgeText: { color: '#12102A', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  // ===== SECTIONS & CARDS =====
  sectionTitle: { 
    color: '#6B6B8A', 
    fontSize: 11.5, 
    fontWeight: '800', 
    marginBottom: 12, 
    marginLeft: 4,
    letterSpacing: 1.3,
    textTransform: 'uppercase' 
  },
  cardGroup: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    gap: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 66,
    marginRight: 16,
  },

  // ===== ICONS & TEXT =====
  iconBox: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  textContainer: { flex: 1, paddingRight: 10 },
  settingText: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  settingDesc: { color: '#6B6B8A', fontSize: 12, lineHeight: 16, fontWeight: '500' },

  // ===== FOOTER =====
  footerText: {
    color: '#3A3860',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    lineHeight: 16,
  },

  // ===== BOTTOM SHEET STYLES =====
  modalContent: {
    backgroundColor: '#1A183A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 200,
  },
  modalDragHandle: {
    width: 42, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sheetTitle: {
    color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 6,
  },
  sheetSub: {
    color: '#A0A0C0', fontSize: 13, lineHeight: 18, marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sheetOptionText: {
    color: '#E0E0F0', fontSize: 15, fontWeight: '600',
  },
  sheetIconBig: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(77,255,184,0.1)',
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
    marginBottom: 15,
  },
  primarySheetBtn: {
    backgroundColor: '#4DFFB8', paddingVertical: 15, borderRadius: 14, alignItems: 'center',
  },
  primarySheetBtnText: {
    color: '#12102A', fontSize: 15, fontWeight: '800',
  },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 14, marginBottom: 10,
  },
  deviceName: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  deviceDesc: { color: '#6B6B8A', fontSize: 12 },
});