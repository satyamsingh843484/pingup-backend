// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Platform, Modal, Animated, PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';

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
// ✨ PREMIUM BOTTOM SHEET (Exactly like Privacy Screen)
// ==========================================
const PremiumBottomSheet = ({ visible, onClose, children }: any) => {
  const translateY = useRef(new Animated.Value(500)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [renderModal, setRenderModal] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.3) {
          onClose(); // ✨ FIX: Direct close (No complex triggerClose, no freezing)
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 14
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
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
        <Animated.View style={{ transform: [{ translateY }], width: '100%' }} {...panResponder.panHandlers}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// ==================== STYLE MAPS ====================
const TOAST_STYLES: any = {
  success: { icon: 'checkmark-circle', color: '#4DFFB8', bg: 'rgba(77,255,184,0.12)', border: 'rgba(77,255,184,0.25)' },
  error:   { icon: 'close-circle',     color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.25)' },
  warning: { icon: 'warning',          color: '#FFB800', bg: 'rgba(255,184,0,0.12)',   border: 'rgba(255,184,0,0.25)' },
  info:    { icon: 'information-circle', color: '#4DACFF', bg: 'rgba(77,172,255,0.12)', border: 'rgba(77,172,255,0.25)' },
};

const MODAL_STYLES: any = {
  info:    { icon: 'information-circle', color: '#4DACFF', bg: 'rgba(77,172,255,0.15)' },
  success: { icon: 'checkmark-circle',   color: '#4DFFB8', bg: 'rgba(77,255,184,0.15)' },
  warning: { icon: 'warning',            color: '#FFB800', bg: 'rgba(255,184,0,0.15)' },
  danger:  { icon: 'trash',              color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)' },
};

export default function ToolsScreen() {
  const navigation = useNavigation<any>();

  // ===== FUNCTIONAL STATES =====
  const [readReceipts, setReadReceipts] = useState(true);
  const [lastSeen, setLastSeen] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [autoDownload, setAutoDownload] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [lastBackupTime, setLastBackupTime] = useState('Never');
  
  const [cacheSize, setCacheSize] = useState('18.4 MB');
  const [isClearing, setIsClearing] = useState(false);

  // ===== TOAST & MODAL STATES =====
  const [toastMsg, setToastMsg] = useState<{ message: string; type: string } | null>(null);
  const toastTranslate = useRef(new Animated.Value(-120)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<any>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>(null);

  // Real Mock Data
  const savedCount = 12;
  const scheduledCount = 3;
  const archivedCount = 5;
  const starredCount = 8;
  const blockedCount = 2;

  // ==================== HELPERS ====================
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg({ message, type });
    toastTranslate.setValue(-120);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastTranslate, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastTranslate, { toValue: -120, duration: 250, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setToastMsg(null));
    }, 2600);
  };

  const showModal = (config: any) => {
    setModalConfig(config);
    setSheetVisible(true);
  };

  const runAction = (action: any) => {
    setSheetVisible(false);
    if (action?.onPress) setTimeout(() => action.onPress(), 250);
  };

  // Load Persisted Settings
  useEffect(() => {
    const loadData = async () => {
      try {
        const r = await AsyncStorage.getItem('readReceipts');
        const l = await AsyncStorage.getItem('lastSeen');
        const t = await AsyncStorage.getItem('typingIndicator');
        const d = await AsyncStorage.getItem('autoDownload');
        const b = await AsyncStorage.getItem('autoBackup');
        const bt = await AsyncStorage.getItem('lastBackupTime');
        
        if (r !== null) setReadReceipts(r === 'true');
        if (l !== null) setLastSeen(l === 'true');
        if (t !== null) setTypingIndicator(t === 'true');
        if (d !== null) setAutoDownload(d === 'true');
        if (b !== null) setAutoBackup(b === 'true');
        if (bt) setLastBackupTime(bt);
      } catch (e) { 
        console.log(e); 
      }
    };
    loadData();
  }, []);

  // ==================== ACTIONS ====================
  const toggleSwitch = (setting: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (setting) {
      case 'read': { const v = !readReceipts; setReadReceipts(v); AsyncStorage.setItem('readReceipts', String(v)); break; }
      case 'seen': { const v = !lastSeen; setLastSeen(v); AsyncStorage.setItem('lastSeen', String(v)); break; }
      case 'typing': { const v = !typingIndicator; setTypingIndicator(v); AsyncStorage.setItem('typingIndicator', String(v)); break; }
      case 'autoDownload': { const v = !autoDownload; setAutoDownload(v); AsyncStorage.setItem('autoDownload', String(v)); break; }
      case 'autoBackup': { const v = !autoBackup; setAutoBackup(v); AsyncStorage.setItem('autoBackup', String(v)); break; }
    }
  };

  const handleBackup = () => {
    if (isBackingUp) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBackingUp(true);
    setBackupProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 15; 
      setBackupProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        setIsBackingUp(false);
        const ts = `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        setLastBackupTime(ts);
        AsyncStorage.setItem('lastBackupTime', ts);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Chats backed up to PingUp Cloud!', 'success');
      }
    }, 400);
  };

  const performClearCache = async () => {
    if (isClearing) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClearing(true);
    
    try {
      // @ts-ignore
      if (FileSystem.cacheDirectory) {
        // @ts-ignore
        await FileSystem.deleteAsync(FileSystem.cacheDirectory, { idempotent: true });
        // @ts-ignore
        await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory, { intermediates: true });
      }
      
      setTimeout(() => {
        setCacheSize('0.0 MB');
        setIsClearing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('App Cache successfully cleared!', 'success');
      }, 800);
      
    } catch (error) {
      setIsClearing(false);
      showToast('Failed to clear cache.', 'error');
    }
  };

  const handleClearCache = () => {
    if (cacheSize === '0.0 MB') {
      showToast('Cache is already clean!', 'info');
      return;
    }
    performClearCache();
  };

  const showInfo = (title: string, message: string, type: string = 'info') => {
    Haptics.selectionAsync();
    showModal({ type, title, message, actions: [{ label: 'Got it', style: 'primary' }] });
  };

  // ==================== RENDER ====================
  return (
    <SafeAreaView style={styles.container}>

      {/* ===== CUSTOM TOAST ===== */}
      {toastMsg && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toastContainer, { transform: [{ translateY: toastTranslate }], opacity: toastOpacity }]}
        >
          <View style={[styles.toast, { backgroundColor: TOAST_STYLES[toastMsg.type].bg, borderColor: TOAST_STYLES[toastMsg.type].border }]}>
            <Ionicons name={TOAST_STYLES[toastMsg.type].icon} size={18} color={TOAST_STYLES[toastMsg.type].color} />
            <Text style={styles.toastText}>{toastMsg.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tools</Text>
            <Text style={styles.subtitle}>Chat utilities & preferences</Text>
          </View>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => navigation.navigate('PrivacySecurityScreen')}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={20} color="#A0A0C0" />
          </TouchableOpacity>
        </View>

        {/* ===== QUICK ACTIONS ===== */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridCard} onPress={() => { Haptics.selectionAsync(); navigation.navigate('AIAssistant'); }} activeOpacity={0.8}>
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(77,172,255,0.15)' }]}><Ionicons name="sparkles" size={22} color="#4DACFF" /></View>
            <Text style={styles.gridLabel}>AI Assistant</Text>
            <Text style={styles.gridSub}>Smart replies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridCard} onPress={() => showInfo('Saved Messages', `You have ${savedCount} saved messages safely stored in your cloud vault.`, 'info')} activeOpacity={0.8}>
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(155,89,182,0.15)' }]}><Ionicons name="bookmark" size={22} color="#9B59B6" /></View>
            <Text style={styles.gridLabel}>Saved</Text>
            <Text style={styles.gridSub}>{savedCount} items</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridCard} onPress={() => showInfo('Scheduled Messages', `${scheduledCount} messages are queued to send later automatically.`, 'info')} activeOpacity={0.8}>
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(255,184,0,0.15)' }]}><Ionicons name="time" size={22} color="#FFB800" /></View>
            <Text style={styles.gridLabel}>Scheduled</Text>
            <Text style={styles.gridSub}>{scheduledCount} pending</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridCard} onPress={() => showInfo('Broadcast Lists', 'Send one message to up to 256 contacts at once privately.', 'info')} activeOpacity={0.8}>
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(77,255,184,0.15)' }]}><Ionicons name="megaphone" size={22} color="#4DFFB8" /></View>
            <Text style={styles.gridLabel}>Broadcast</Text>
            <Text style={styles.gridSub}>Multi-send</Text>
          </TouchableOpacity>
        </View>

        {/* ===== CHAT MANAGEMENT ===== */}
        <Text style={styles.sectionTitle}>Chat Management</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => showInfo('Archived Chats', `${archivedCount} conversations are hidden from your main screen.`, 'info')}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(77,172,255,0.15)' }]}><Ionicons name="archive" size={20} color="#4DACFF" /></View>
            <Text style={styles.menuText}>Archived Chats</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{archivedCount}</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => showInfo('Starred Messages', `${starredCount} messages have been starred for quick access.`, 'warning')}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,184,0,0.15)' }]}><Ionicons name="star" size={20} color="#FFB800" /></View>
            <Text style={styles.menuText}>Starred Messages</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{starredCount}</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => showInfo('Blocked Contacts', `${blockedCount} contacts are currently blocked and cannot message you.`, 'danger')}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Ionicons name="ban" size={20} color="#FF6B6B" /></View>
            <Text style={styles.menuText}>Blocked Contacts</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{blockedCount}</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>
        </View>

        {/* ===== STORAGE ===== */}
        <Text style={styles.sectionTitle}>Data & Storage</Text>
        <View style={styles.storageCard}>
          <View style={styles.storageHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="pie-chart" size={20} color="#4DFFB8" />
              <Text style={styles.storageTitle}>Storage Usage</Text>
            </View>
            <Text style={styles.storageTotal}>845 MB</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '60%', backgroundColor: '#4DACFF' }]} />
            <View style={[styles.progressFill, { width: '25%', backgroundColor: '#9B59B6' }]} />
            <View style={[styles.progressFill, { width: '15%', backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          </View>
          <View style={styles.storageLegends}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#4DACFF' }]} /><Text style={styles.legendText}>Media 500MB</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#9B59B6' }]} /><Text style={styles.legendText}>Chats 200MB</Text></View>
          </View>
          
          <TouchableOpacity style={styles.cacheBtn} onPress={handleClearCache} disabled={isClearing} activeOpacity={0.85}>
            <Ionicons name={isClearing ? 'hourglass-outline' : 'trash-outline'} size={18} color="#FFB800" />
            <Text style={styles.cacheBtnText}>{isClearing ? 'Clearing temporary files...' : `Clear Cache (${cacheSize})`}</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFB800" />
          </TouchableOpacity>
        </View>

        {/* ===== PRIVACY ===== */}
        <Text style={styles.sectionTitle}>Privacy Controls</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(77,255,184,0.15)' }]}><Ionicons name="checkmark-done" size={20} color="#4DFFB8" /></View>
            <View style={{ flex: 1 }}><Text style={styles.menuText}>Read Receipts</Text><Text style={styles.menuSubtext}>Show blue ticks when you read</Text></View>
            <CustomSwitch value={readReceipts} onValueChange={() => toggleSwitch('read')} />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Ionicons name="eye-off-outline" size={20} color="#FF6B6B" /></View>
            <View style={{ flex: 1 }}><Text style={styles.menuText}>Hide Last Seen</Text><Text style={styles.menuSubtext}>Others can't see your last online</Text></View>
            <CustomSwitch value={lastSeen} onValueChange={() => toggleSwitch('seen')} />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(77,172,255,0.15)' }]}><Ionicons name="chatbubble-ellipses-outline" size={20} color="#4DACFF" /></View>
            <View style={{ flex: 1 }}><Text style={styles.menuText}>Typing Indicator</Text><Text style={styles.menuSubtext}>Show when you're typing</Text></View>
            <CustomSwitch value={typingIndicator} onValueChange={() => toggleSwitch('typing')} />
          </View>
        </View>

        {/* ===== BACKUP ===== */}
        <Text style={styles.sectionTitle}>Backup & Restore</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(77,172,255,0.15)' }]}><Ionicons name="cloud-upload-outline" size={20} color="#4DACFF" /></View>
            <View style={{ flex: 1 }}><Text style={styles.menuText}>Auto Backup</Text><Text style={styles.menuSubtext}>Backup daily at 2:00 AM</Text></View>
            <CustomSwitch value={autoBackup} onValueChange={() => toggleSwitch('autoBackup')} />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(77,255,184,0.15)' }]}><Ionicons name="time-outline" size={20} color="#4DFFB8" /></View>
            <View style={{ flex: 1 }}><Text style={styles.menuText}>Last Backup</Text><Text style={styles.menuSubtext}>{lastBackupTime}</Text></View>
          </View>
        </View>

        {isBackingUp && (
          <View style={styles.backupProgressWrap}>
            <View style={styles.backupProgressBar}><View style={[styles.backupProgressFill, { width: `${backupProgress}%` }]} /></View>
            <Text style={styles.backupProgressText}>{backupProgress}% uploaded to Cloud</Text>
          </View>
        )}
        
        <TouchableOpacity style={[styles.backupBtn, isBackingUp && { opacity: 0.7 }]} onPress={handleBackup} disabled={isBackingUp} activeOpacity={0.85}>
          <Ionicons name={isBackingUp ? 'cloud-upload-outline' : 'cloud-done-outline'} size={22} color="#12102A" />
          <Text style={styles.backupBtnText}>{isBackingUp ? `Backing up... ${backupProgress}%` : 'Backup Chats Now'}</Text>
        </TouchableOpacity>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ===== PREMIUM BOTTOM SHEET ===== */}
      <PremiumBottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View style={styles.modalSheet}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setSheetVisible(false)}
            style={{ alignItems: 'center', paddingVertical: 12, marginTop: -12 }}
          >
            <View style={styles.dragHandle} />
          </TouchableOpacity>
          
          {modalConfig && (
            <>
              <View style={[styles.modalIconBox, { backgroundColor: MODAL_STYLES[modalConfig.type || 'info'].bg }]}>
                <Ionicons name={MODAL_STYLES[modalConfig.type || 'info'].icon} size={28} color={MODAL_STYLES[modalConfig.type || 'info'].color} />
              </View>
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              {!!modalConfig.message && <Text style={styles.modalMessage}>{modalConfig.message}</Text>}
              <View style={styles.modalActions}>
                {(modalConfig.actions || []).map((action: any, i: number) => {
                  const isDestructive = action.style === 'destructive';
                  const isPrimary = action.style === 'primary';
                  return (
                    <TouchableOpacity key={i} style={[styles.modalActionBtn, isPrimary && styles.modalActionPrimary, isDestructive && styles.modalActionDestructive]} activeOpacity={0.85} onPress={() => runAction(action)}>
                      <Text style={[styles.modalActionText, isPrimary && { color: '#12102A' }, isDestructive && { color: '#FF6B6B' }]}>{action.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </PremiumBottomSheet>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },

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

  toastContainer: { position: 'absolute', top: Platform.OS === 'android' ? 48 : 58, left: 20, right: 20, zIndex: 9999, elevation: 20 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10 },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#A0A0C0', marginTop: 4, fontWeight: '500' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, marginTop: 10 },

  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  gridIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  gridSub: { color: '#A0A0C0', fontSize: 11, fontWeight: '500' },

  menuGroup: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, paddingVertical: 6, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuText: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  menuSubtext: { color: '#A0A0C0', fontSize: 11, marginTop: 3 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },
  badge: { backgroundColor: 'rgba(77,172,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 10, minWidth: 26, alignItems: 'center' },
  badgeText: { color: '#4DACFF', fontSize: 12, fontWeight: '700' },

  storageCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  storageTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  storageTotal: { color: '#4DFFB8', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  progressBar: { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden', marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%' },
  storageLegends: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#A0A0C0', fontSize: 11.5, fontWeight: '500' },
  cacheBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.25)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginTop: 18 },
  cacheBtnText: { flex: 1, color: '#FFB800', fontSize: 13, fontWeight: '700' },

  backupProgressWrap: { marginBottom: 12 },
  backupProgressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 6 },
  backupProgressFill: { height: '100%', backgroundColor: '#4DACFF', borderRadius: 3 },
  backupProgressText: { color: '#4DACFF', fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  
  backupBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#4DACFF', 
    paddingVertical: 18, 
    borderRadius: 16, 
    marginTop: 6,
    marginBottom: 24, 
    gap: 10, 
    shadowColor: '#4DACFF', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 6 
  },
  backupBtnText: { color: '#12102A', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }, 

  modalSheet: { backgroundColor: '#1A183A', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
  dragHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  modalIconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 14 },
  modalTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: 0.2 },
  modalMessage: { color: '#A0A0C0', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 22, paddingHorizontal: 4 },
  modalActions: { gap: 8 },
  modalActionBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalActionPrimary: { backgroundColor: '#4DACFF', borderColor: '#4DACFF' },
  modalActionDestructive: { backgroundColor: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.2)' },
  modalActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});