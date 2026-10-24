import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, Modal, StyleSheet, Animated, ScrollView, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAvatarColor } from '../utils/avatarUtils';

// ✨ NAYA LOGIC: Premium iOS jaisa bounciness wala Bottom Sheet
const PremiumBottomSheet = ({ visible, onClose, children }: any) => {
  const translateY = useRef(new Animated.Value(500)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [renderModal, setRenderModal] = useState(false);

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
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
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity, position: 'absolute', width: '100%', height: '100%' }} />
      <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY }], width: '100%' }}>
          <TouchableOpacity activeOpacity={1}> 
            {children}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function CallsScreen() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [myUserId, setMyUserId] = useState<number | null>(null); 
  
  // ✨ NAYA STATE: Selection Mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<number[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      fetchCalls();
      cancelSelection();
    }, [])
  );

  const fetchCalls = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return; 

      const response = await fetch('https://pingup-backend-v25a.onrender.com/api/calls/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {
        setCalls(json.calls);
        setMyUserId(json.myUserId); 
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ✨ NAYA LOGIC: Selection aur Delete ke premium functions
  const handleLongPress = (callId: number) => {
    setIsSelectionMode(true);
    setSelectedCalls([callId]);
  };

  const toggleSelectCall = (callId: number) => {
    setSelectedCalls(prev => 
      prev.includes(callId) ? prev.filter(id => id !== callId) : [...prev, callId]
    );
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedCalls([]);
  };

  const filteredCalls = calls.filter(call => {
    const isMeReceiver = Number(call.receiverId) === Number(myUserId);
    const isMeCaller = Number(call.callerId) === Number(myUserId);

    if (filter === 'missed') {
      return isMeReceiver && !isMeCaller && (call.status === 'missed' || call.status === 'declined');
    }
    return true; 
  });

  const handleSelectAll = () => {
    if (selectedCalls.length === filteredCalls.length) {
      setSelectedCalls([]);
    } else {
      setSelectedCalls(filteredCalls.map(c => c.id));
    }
  };

  // ✨ UPDATE: Pehle modal band hoga, fir delete hoga
  const confirmDelete = async () => {
    setDeleteModalVisible(false);
    if (selectedCalls.length === 0) return;
    
    const callsToDelete = selectedCalls;
    cancelSelection();
    setCalls(prev => prev.filter(call => !callsToDelete.includes(call.id)));

    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch('https://pingup-backend-v25a.onrender.com/api/calls/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ callIds: callsToDelete })
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }

  const handleCallPress = (targetId: number, targetName: string, type: string) => {
    navigation.navigate('CallScreen', {
      receiverId: targetId,
      receiverName: targetName,
      type: type,
      isIncoming: false
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* ✨ FIX: Dynamic Header (Normal vs Selection Mode with Trash Icon) */}
      {isSelectionMode ? (
        <View style={[styles.header, { backgroundColor: '#1A183A', paddingBottom: 15 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={cancelSelection} style={{ marginRight: 15 }}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF' }}>
              {selectedCalls.length} Selected
            </Text>
          </View>
          
          {/* NAYA UPDATE YAHAN HAI: Select All aur Trash icon ek sath */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleSelectAll} style={{ marginRight: selectedCalls.length > 0 ? 15 : 0 }}>
              <Text style={{ color: '#4DACFF', fontSize: 16, fontWeight: '600' }}>
                {selectedCalls.length === filteredCalls.length ? 'Deselect' : 'Select All'}
              </Text>
            </TouchableOpacity>
            
            {selectedCalls.length > 0 && (
              <TouchableOpacity onPress={() => setDeleteModalVisible(true)}>
                <Ionicons name="trash" size={22} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calls</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="call-outline" size={20} color="#FFF" />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, filter === 'all' && styles.tabBtnActive]} 
          onPress={() => {
            setFilter('all');
            cancelSelection();
          }}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabBtn, filter === 'missed' && styles.tabBtnActive]} 
          onPress={() => {
            setFilter('missed');
            cancelSelection();
          }}
        >
          <Text style={[styles.tabText, filter === 'missed' && styles.tabTextActive]}>Missed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity style={styles.createLinkCard}>
          <View style={styles.linkIconBox}>
            <Ionicons name="link" size={24} color="#4DACFF" />
          </View>
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Create Call Link</Text>
            <Text style={styles.linkDesc}>Share a link for your PingUp call</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent</Text>

        {filteredCalls.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="call-outline" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={{ color: '#A0A0C0', marginTop: 10 }}>No recent calls found.</Text>
          </View>
        ) : (
          <View style={styles.callsList}>
            {filteredCalls.map((call, index) => {
              const isMissed = call.status === 'missed';
              const isOutgoing = Number(call.callerId) === Number(myUserId); 
              const otherUser = isOutgoing ? call.receiver : call.caller;
              const targetId = isOutgoing ? call.receiverId : call.callerId;
              const targetName = otherUser?.username || 'Unknown User';
              
              // ✨ NAYA LOGIC: Checkbox state check
              const isSelected = selectedCalls.includes(call.id);

              return (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.callItem,
                    isSelected && { backgroundColor: 'rgba(77, 172, 255, 0.15)', borderColor: '#4DACFF' }
                  ]}
                  onLongPress={() => handleLongPress(call.id)}
                  onPress={() => isSelectionMode ? toggleSelectCall(call.id) : handleCallPress(targetId, targetName, call.type)}
                  activeOpacity={0.7}
                >
                  
                  {/* ✨ FIX: Custom Premium Checkbox */}
                  {isSelectionMode && (
                    <View style={{ marginRight: 15, justifyContent: 'center' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? '#4DACFF' : '#6B6B8A', backgroundColor: isSelected ? '#4DACFF' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                    </View>
                  )}

                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(targetName), marginRight: !isSelectionMode ? 15 : 10 }]}>
                    <Text style={styles.avatarText}>{targetName[0]?.toUpperCase()}</Text>
                  </View>
                  
                  <View style={styles.callContent}>
                    <Text style={[styles.callerName, isMissed && !isOutgoing && { color: '#FF6B6B' }]}>
                      {targetName}
                    </Text>
                    
                    <View style={styles.callDetails}>
                      <Feather 
                        name={isOutgoing ? 'arrow-up-right' : 'arrow-down-left'} 
                        size={14} 
                        color={isMissed ? '#FF6B6B' : (isOutgoing ? '#4DFFB8' : '#4DACFF')} 
                        style={{ marginRight: 6 }}
                      />
                      <Ionicons 
                        name={call.type === 'video' ? 'videocam' : 'call'} 
                        size={12} 
                        color="#A0A0C0" 
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.callTime}>
                        {isOutgoing ? 'Outgoing' : 'Incoming'}
                      </Text>
                    </View>
                  </View>

                  {!isSelectionMode && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleCallPress(targetId, targetName, call.type)}>
                      <Ionicons name={call.type === 'video' ? 'videocam' : 'call'} size={22} color="#4DACFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ✨ FIX: Niche overlap wala bar hata diya. Ab normal FAB hi rahega */}
      {!isSelectionMode && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ContactsScreen')}>
          <Ionicons name="call" size={24} color="#12102A" />
        </TouchableOpacity>
      )}
      {/* 🗑️ PREMIUM DELETE CALLS MODAL (HomeScreen Match) */}
      <PremiumBottomSheet visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)}>
        <View style={[styles.modalContainer, { minHeight: 0, justifyContent: 'flex-start', paddingBottom: 20 }]}>
          
          <View>
            {/* Patla sa line (Drag Handle) */}
            <View style={{ width: 40, height: 4, backgroundColor: '#4A4A6A', borderRadius: 2, alignSelf: 'center', marginBottom: 15 }} />
            
            <Text style={styles.modalTitle}>Delete Calls?</Text>
            
            <Text style={{ color: '#A0A0C0', textAlign: 'center', lineHeight: 21, marginBottom: 18, paddingHorizontal: 20, fontSize: 14 }}>
              This will permanently delete{' '}
              <Text style={{ fontWeight: '700', color: '#4DACFF' }}>{selectedCalls.length} selected call(s)</Text>.
              {'\n'}
              <Text style={{ fontSize: 12, color: '#6B6B8A', fontStyle: 'italic' }}>
                This action cannot be undone.
              </Text>
            </Text>

            {/* Exact HomeScreen jaisa Delete Button */}
            <TouchableOpacity style={styles.modalOption} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
              <Text style={styles.modalOptionText}>Delete Calls</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Cancel Button */}
          <TouchableOpacity
  style={{
    backgroundColor: '#2A2A40',
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  }}
  onPress={() => setDeleteModalVisible(false)}
>
  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>
    Cancel
  </Text>
</TouchableOpacity>
          
        </View>
      </PremiumBottomSheet>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4DFFB8' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#1A183A', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#4DACFF' },
  tabText: { color: '#A0A0C0', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#12102A', fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  
  createLinkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(77, 172, 255, 0.1)', padding: 15, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(77, 172, 255, 0.3)' },
  linkIconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(77, 172, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  linkContent: { flex: 1 },
  linkTitle: { color: '#4DACFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  linkDesc: { color: '#A0A0C0', fontSize: 12 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 15 },
  
  callsList: { gap: 15 },
  callItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  
  callContent: { flex: 1 },
  callerName: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  callDetails: { flexDirection: 'row', alignItems: 'center' },
  callTime: { fontSize: 13, color: '#A0A0C0' },

  actionBtn: { padding: 10 },

  fab: { position: 'absolute', right: 20, bottom: 110, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10 },
  // Modal Styles (Exact Match with HomeScreen)
  modalContainer: { 
    backgroundColor: '#1A183A', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 20, 
    paddingBottom: 20 
  },
  modalTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  modalOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  modalOptionText: { 
    fontSize: 16, 
    marginLeft: 15, 
    fontWeight: '500', 
    color: '#FF6B6B' 
  }
});