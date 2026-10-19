import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function CallsScreen() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  
  // Navigation hook add kiya gaya
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch('http://10.190.47.168:3000/api/calls/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {
        setCalls(json.calls);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }

  // Dummy calls agar database khali hai (UI test karne ke liye)
  const displayCalls = calls.length > 0 ? calls : [
    { id: 1, type: 'video', status: 'missed', createdAt: new Date().toISOString(), caller: { username: 'Sneha' } },
    { id: 2, type: 'audio', status: 'completed', createdAt: new Date(Date.now() - 3600000).toISOString(), caller: { username: 'Aman' } },
    { id: 3, type: 'video', status: 'declined', createdAt: new Date(Date.now() - 86400000).toISOString(), caller: { username: 'Rahul_Dev' } },
  ];

  // Ye function call lagane par CallScreen open karega
  const handleCallPress = (call: any) => {
    navigation.navigate('CallScreen', {
      receiverId: call.callerId || 2, // Backend ID
      receiverName: call.caller?.username || 'Unknown',
      type: call.type,
      isIncoming: false
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="call-outline" size={20} color="#FFF" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* Tabs (All / Missed) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, filter === 'all' && styles.tabBtnActive]} 
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, filter === 'missed' && styles.tabBtnActive]} 
          onPress={() => setFilter('missed')}
        >
          <Text style={[styles.tabText, filter === 'missed' && styles.tabTextActive]}>Missed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Create Call Link Card */}
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

        {/* Calls List */}
        <View style={styles.callsList}>
          {displayCalls.map((call, index) => {
            const isMissed = call.status === 'missed';
            return (
              <TouchableOpacity key={index} style={styles.callItem} onPress={() => handleCallPress(call)}>
                <View style={[styles.avatar, { backgroundColor: isMissed ? '#FF6B6B' : '#4DACFF' }]}>
                  <Text style={styles.avatarText}>{call.caller?.username?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
                
                <View style={styles.callContent}>
                  <Text style={[styles.callerName, isMissed && { color: '#FF6B6B' }]}>
                    {call.caller?.username || 'Unknown User'}
                  </Text>
                  
                  <View style={styles.callDetails}>
                    <Ionicons 
                      name={isMissed ? "arrow-down-outline" : "arrow-up-outline"} 
                      size={14} 
                      color={isMissed ? "#FF6B6B" : "#4DFFB8"} 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.callTime}>
                      {new Date(call.createdAt).toLocaleDateString()} • {call.type === 'video' ? 'Video' : 'Audio'}
                    </Text>
                  </View>
                </View>

                {/* Right side icon button - Ab ispe bhi UI khulega */}
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleCallPress(call)}>
                  <Ionicons name={call.type === 'video' ? 'videocam' : 'call'} size={22} color="#4DACFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* Floating Action Button (New Call) - Test call dialer */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CallScreen', { receiverId: 2, receiverName: 'Sneha', type: 'audio', isIncoming: false })}>
        <Ionicons name="call" size={24} color="#12102A" />
      </TouchableOpacity>

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

  fab: { position: 'absolute', right: 20, bottom: 110, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10 }
});