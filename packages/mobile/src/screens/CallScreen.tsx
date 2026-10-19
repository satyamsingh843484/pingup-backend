import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
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

  useEffect(() => {
    if (!isIncoming) {
      initiateCall();
    }

    // Jab samne wala call utha le
    socket.on('callAnswered', () => {
      setCallStatus('Connected');
    });

    // Jab samne wala call kaat de
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

  // Timer Logic: Start timer when connected
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
    // Apna ID/Name API ya Context se lena chahiye, abhi ke liye dummy:
    socket.emit('startCall', { callerId: 1, callerName: 'Satyam', receiverId, type });
  };

  const endCall = async (status: string) => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallStatus('Call Ended');
      
      const token = await AsyncStorage.getItem('userToken');
      
      // 1. Database me Call Log save karna
      await fetch('http://10.190.47.168:3000/api/calls/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiverId, type, status, duration: callDuration })
      });

      // 2. Chat me bhejne ke liye Smart Message (Caller vs Receiver logic)
      let callMessage = '';
      const icon = type === 'video' ? '📹' : '📞';

      // Agar maine call kiya tha (isIncoming == false)
      if (!isIncoming) {
        if (status === 'missed' || status === 'declined') {
          callMessage = `${icon} Outgoing Call (Missed)`;
        } else {
          callMessage = `${icon} Outgoing Call • ${formatTime(callDuration)}`;
        }
      } 
      // Agar mujhe call aaya tha (isIncoming == true)
      else {
         if (status === 'missed' || status === 'declined') {
          callMessage = `${icon} Missed Call`;
        } else {
          callMessage = `${icon} Incoming Call • ${formatTime(callDuration)}`;
        }
      }

      // Automatically Chat me message send karna
      await fetch('http://10.190.47.168:3000/api/messages/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        // IMPORTANT: receiverId hamesha wahi hoga jisse hum baat kar rahe hain
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
    // Apne App.tsx me check kar lena ki exact name 'ChatDetailScreen' hi hai ya kuch aur
    navigation.navigate('ChatDetail', {
      userId: receiverId, 
      username: receiverName,
      isCallActive: true // Ye naya flag hum bhej rahe hain banner dikhane ke liye!
    });
  };

  // Helper for MM:SS format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Section */}
      <View style={styles.topSection}>
        <Text style={styles.statusText}>
          {callStatus === 'Connected' ? formatTime(callDuration) : callStatus}
        </Text>
        <Text style={styles.nameText}>{receiverName}</Text>
        <Text style={styles.typeText}>{type === 'video' ? 'PingUp Video Call' : 'PingUp Voice Call'}</Text>
      </View>

      {/* Center Avatar Section */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{receiverName[0]?.toUpperCase() || 'U'}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Controls Section */}
      <View style={styles.bottomSection}>
        
        {/* Controls Row (Mute, Chat, Speaker) */}
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity 
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color={isMuted ? "#12102A" : "#FFF"} />
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity style={styles.controlBtn} onPress={goToChat}>
            <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Speaker Button */}
          <TouchableOpacity 
            style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]} 
            onPress={() => setIsSpeaker(!isSpeaker)}
          >
            <Ionicons name={isSpeaker ? "volume-high" : "volume-medium"} size={26} color={isSpeaker ? "#12102A" : "#FFF"} />
          </TouchableOpacity>
        </View>

        {/* Action Row (Accept/Reject) */}
        <View style={styles.actionRow}>
          {isIncoming && callStatus === 'Ringing...' && (
            <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => {
              setCallStatus('Connected');
              socket.emit('answerCall', { to: receiverId });
            }}>
              <Ionicons name="call" size={32} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* End Call Button */}
          <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => endCall(callDuration > 0 ? 'completed' : 'missed')}>
            <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0A1A', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 50 : 20, paddingBottom: 40 },
  
  topSection: { alignItems: 'center', marginTop: 20 },
  statusText: { color: '#4DFFB8', fontSize: 16, marginBottom: 12, fontWeight: '600', letterSpacing: 1 },
  nameText: { color: '#FFF', fontSize: 34, fontWeight: 'bold', marginBottom: 8 },
  typeText: { color: '#A0A0C0', fontSize: 16 },
  
  avatarContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  avatarWrapper: { padding: 15, borderRadius: 100, backgroundColor: 'rgba(77, 172, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(77, 172, 255, 0.1)' },
  avatar: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20 },
  avatarText: { fontSize: 60, color: '#FFF', fontWeight: 'bold' },
  
  bottomSection: { paddingHorizontal: 30, paddingBottom: 20 },
  
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, paddingHorizontal: 20 },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  controlBtnActive: { backgroundColor: '#FFF' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  actionBtn: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  declineBtn: { backgroundColor: '#FF3B30', shadowColor: '#FF3B30' },
  acceptBtn: { backgroundColor: '#4DFFB8', shadowColor: '#4DFFB8' }
});