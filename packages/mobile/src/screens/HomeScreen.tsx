import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import socket from '../socket'; // ✨ Global socket file yahan import ho gayi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const [data, setData] = useState<any>({ stories: [], recentChats: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchChatsData();
  }, []);

  const fetchChatsData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Agar AuthScreen me tumne userId save karwaya tha, toh usko bhi nikal sakte ho
      const storedUserId = await AsyncStorage.getItem('userId'); 

      if (!token) { navigation.replace('Auth'); return; }
      
      const response = await fetch('http://10.190.47.168:3000/api/chats/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {
        setData(json);

        // ✨ NAYA: GLOBAL SOCKET CONNECTION LOGIC YAHAN AAYEGA ✨
        // Hum try karenge json se ID nikalne ki, nahi toh storedUserId use karenge
        const myUserId = json.currentUserId || storedUserId; 

        if (myUserId) {
          socket.connect(); // 1. Socket background me chalu karo
          socket.emit('register', myUserId); // 2. Sabko batao ki ye user online aa gaya hai
          console.log('Global Socket Connected for user:', myUserId);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchChatsData(); };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PingUp</Text>
          {/* Ab ye API se aane wala asli naam dikhayega */}
          <Text style={styles.subTitle}>Hey, {data?.currentUser || 'User'}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('NotificationsScreen')}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B6B8A" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#6B6B8A"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4DACFF" />}
      >
        {/* 3. Stories Row */}
        <Text style={styles.sectionTitle}>Stories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesRow}>
          <TouchableOpacity style={styles.storyItem}>
            <View style={styles.storyAddRing}>
              <Ionicons name="add" size={24} color="#4DACFF" />
            </View>
            <Text style={styles.storyName}>My Status</Text>
          </TouchableOpacity>
          
          {data.stories.map((story: any, index: number) => (
            <TouchableOpacity key={index} style={styles.storyItem}>
              <View style={styles.storyRing}>
                <View style={[styles.storyAvatar, { backgroundColor: '#9B59B6' }]}>
                  <Text style={styles.storyInitial}>{story.username[0].toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{story.username}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 4. Recent Chats List */}
        <Text style={styles.sectionTitle}>Recent Chats</Text>
        <View style={styles.chatList}>
          {data.recentChats.map((chat: any, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.chatItem}
              // Ye sabse important line hai: Chat click karne par ChatDetailScreen open hoga
              onPress={() => navigation.navigate('ChatDetail', { userId: chat.id, username: chat.username })}
            >
              <View style={[styles.chatAvatar, { backgroundColor: '#4DACFF' }]}>
                <Text style={styles.storyInitial}>{chat.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatTitleRow}>
                  <Text style={styles.chatTitle}>{chat.username} {chat.isPro && '⭐'}</Text>
                  <Text style={styles.chatTime}>Just now</Text>
                </View>
                <Text style={styles.chatDesc} numberOfLines={1}>Tap to start messaging...</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Floating Action Button (New Chat) */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ContactsScreen')}>
        <Ionicons name="add" size={28} color="#12102A" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subTitle: { fontSize: 13, color: '#4DFFB8', fontWeight: '600' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B' },
  
  searchContainer: { paddingHorizontal: 20, paddingBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A183A', borderRadius: 16, paddingHorizontal: 15, height: 45, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  searchInput: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 15 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 }, // Bottom padding for Tab Bar
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 15, marginTop: 10 },
  
  storiesRow: { flexDirection: 'row', marginBottom: 25, marginLeft: -5 },
  storyItem: { alignItems: 'center', marginRight: 15, width: 60 },
  storyRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', padding: 2, marginBottom: 5 },
  storyAddRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(77,172,255,0.4)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  storyAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  storyInitial: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  storyName: { color: '#A0A0C0', fontSize: 11, fontWeight: '600' },

  chatList: { gap: 15 },
  chatItem: { flexDirection: 'row', alignItems: 'center' },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  chatContent: { flex: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 15 },
  chatTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  chatTime: { fontSize: 11, color: '#6B6B8A', fontWeight: '600' },
  chatDesc: { fontSize: 13, color: '#A0A0C0' },

  fab: { position: 'absolute', right: 20, bottom: 110, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10 }
});