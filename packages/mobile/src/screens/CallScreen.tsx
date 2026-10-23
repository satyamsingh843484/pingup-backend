import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getAvatarColor } from '../utils/avatarUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const socket = io('http://10.190.47.168:3000');

export default function CallScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const { receiverId, receiverName, type, isIncoming } = route.params;
  
  // UI States
  const [callStatus, setCallStatus] = useState(isIncoming ? 'Ringing...' : 'Calling...');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Timer Reference
  const timerRef = useRef<any>(null);
  const hasEndedRef = useRef(false);

  // 🎨 Premium Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Avatar pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    // Ripple rings
    Animated.loop(
      Animated.timing(ring1, { toValue: 1, duration: 2600, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(ring2, { toValue: 1, duration: 2600, useNativeDriver: true }),
      ])
    ).start();

    if (!isIncoming) {
      initiateCall();
    }

    socket.on('callAnswered', () => {
      setCallStatus('Connected');
    });

    socket.on('callRejected', () => {
      setCallStatus('Call Ended');
      endCall('declined');
    });

    return () => {
      socket.off('callAnswered');
      socket.off('callRejected');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'Connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (callStatus === 'Call Ended' && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [callStatus]);

  const initiateCall = async () => {
    const token = await AsyncStorage.getItem('userToken');
    socket.emit('startCall', { callerId: 1, callerName: 'Satyam', receiverId, type });
  };

  const endCall = async (status: string) => {
  if (hasEndedRef.current) return;
  hasEndedRef.current = true;
  
  try {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallStatus('Call Ended');
      
      const token = await AsyncStorage.getItem('userToken');
      
      await fetch('http://10.190.47.168:3000/api/calls/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiverId, type, status, duration: callDuration })
      });

      let callMessage = '';
      const icon = type === 'video' ? '📹' : '📞';

      if (!isIncoming) {
        if (status === 'missed' || status === 'declined') {
          callMessage = `${icon} Outgoing Call (Missed)`;
        } else {
          callMessage = `${icon} Outgoing Call • ${formatTime(callDuration)}`;
        }
      } 
      else {
         if (status === 'missed' || status === 'declined') {
          callMessage = `${icon} Missed Call`;
        } else {
          callMessage = `${icon} Incoming Call • ${formatTime(callDuration)}`;
        }
      }

      await fetch('http://10.190.47.168:3000/api/messages/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ receiverId: receiverId, content: callMessage })
      });

    } catch (error) {
      console.log('Log call error', error);
    }
    
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const goToChat = () => {
    navigation.navigate('ChatDetail', {
      userId: receiverId, 
      username: receiverName,
      isCallActive: true
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isConnected = callStatus === 'Connected';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Ambient background glows */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />
      <View style={styles.bgGlow3} />

      {/* ===== TOP SECTION ===== */}
      <View style={styles.topSection}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4DFFB8' : '#FFB800' }]} />
          <Text style={styles.statusText}>
            {isConnected ? formatTime(callDuration) : callStatus}
          </Text>
        </View>
        <Text style={styles.nameText} numberOfLines={1}>{receiverName}</Text>
        <View style={styles.typeRow}>
          <Ionicons
            name={type === 'video' ? 'videocam' : 'call'}
            size={13}
            color="#A0A0C0"
          />
          <Text style={styles.typeText}>
            {type === 'video' ? 'PingUp Video Call' : 'PingUp Voice Call'}
          </Text>
        </View>
      </View>

      {/* ===== CENTER AVATAR ===== */}
      <View style={styles.avatarContainer}>
        {/* Ripple rings */}
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
            },
          ]}
        />

        <Animated.View
          style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(receiverName) }]}>
            <Text style={styles.avatarText}>
              {receiverName[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* ===== BOTTOM CONTROLS ===== */}
      <View style={styles.bottomSection}>
        <View style={styles.controlsRow}>
          <View style={styles.controlItem}>
            <TouchableOpacity 
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
              onPress={() => setIsMuted(!isMuted)}
              activeOpacity={0.8}
            >
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "#12102A" : "#FFF"} />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>Mute</Text>
          </View>

          <View style={styles.controlItem}>
            <TouchableOpacity style={styles.controlBtn} onPress={goToChat} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>Chat</Text>
          </View>

          <View style={styles.controlItem}>
            <TouchableOpacity 
              style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]} 
              onPress={() => setIsSpeaker(!isSpeaker)}
              activeOpacity={0.8}
            >
              <Ionicons name={isSpeaker ? "volume-high" : "volume-medium"} size={24} color={isSpeaker ? "#12102A" : "#FFF"} />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>Speaker</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isIncoming && callStatus === 'Ringing...' && (
            <View style={styles.actionItem}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => {
                  setCallStatus('Connected');
                  socket.emit('answerCall', { to: receiverId });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={30} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Accept</Text>
            </View>
          )}

          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[
              styles.actionBtn,
              styles.declineBtn,
              callStatus === 'Call Ended' && { opacity: 0.5 }
            ]}
              onPress={() => endCall(callDuration > 0 ? 'completed' : 'missed')}
              activeOpacity={0.85}
              disabled={callStatus === 'Call Ended'}
          >
              <Ionicons name="call" size={30} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>
              {isIncoming && callStatus === 'Ringing...' ? 'Decline' : 'End'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#12102A', 
    justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'android' ? 50 : 20, 
    paddingBottom: 40,
    overflow: 'hidden',
  },

  // ===== Ambient glows =====
  bgGlow1: {
    position: 'absolute',
    top: -140,
    right: -140,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(77,172,255,0.08)',
  },
  bgGlow2: {
    position: 'absolute',
    bottom: -160,
    left: -140,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(155,89,182,0.06)',
  },
  bgGlow3: {
    position: 'absolute',
    top: '40%',
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(77,255,184,0.04)',
  },

  // ===== Top section =====
  topSection: { alignItems: 'center', marginTop: 30 },
  
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(77,172,255,0.25)',
    marginBottom: 20,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  statusText: { 
    color: '#4DFFB8', 
    fontSize: 14, 
    fontWeight: '800', 
    letterSpacing: 1.2,
  },
  
  nameText: { 
    color: '#FFF', 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 10,
    letterSpacing: 0.5,
    maxWidth: '80%',
    textAlign: 'center',
  },
  
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: { 
    color: '#A0A0C0', 
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // ===== Avatar =====
  avatarContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    position: 'relative',
  },
  
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 190,
    height: 190,
    marginTop: -95,
    marginLeft: -95,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: '#4DACFF',
  },

  avatarWrapper: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(77, 172, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(77, 172, 255, 0.25)',
  },
  
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#4DACFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 12,
  },
  avatarText: { fontSize: 60, color: '#FFF', fontWeight: 'bold' },

  // ===== Bottom =====
  bottomSection: { paddingHorizontal: 30, paddingBottom: 20 },
  
  controlsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    marginBottom: 36,
    paddingHorizontal: 20,
  },
  
  controlItem: {
    alignItems: 'center',
    gap: 10,
  },
  
  controlBtn: { 
    width: 62, 
    height: 62, 
    borderRadius: 31, 
    backgroundColor: 'rgba(26, 24, 58, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  controlBtnActive: { 
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  
  controlLabel: {
    color: '#A0A0C0',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-evenly', 
    alignItems: 'center' 
  },
  
  actionItem: {
    alignItems: 'center',
    gap: 10,
  },
  
  actionBtn: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.45, 
    shadowRadius: 14,
    elevation: 10,
  },
  
  actionLabel: {
    color: '#A0A0C0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  declineBtn: { backgroundColor: '#FF3B30', shadowColor: '#FF3B30' },
  acceptBtn: { backgroundColor: '#4DFFB8', shadowColor: '#4DFFB8' },
});