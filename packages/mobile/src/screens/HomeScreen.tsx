import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Alert, Animated, Modal,  RefreshControl, TextInput, Platform,
  AppState // ✨ NAYA: App background me jaane ko detect karne ke liye
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import socket from '../socket'; // ✨ Global socket
import { getAvatarColor } from '../utils/avatarUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
// ✨ NAYA LOGIC: Premium iOS jaisa bounciness wala Bottom Sheet (Type error fixed)
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


export default function HomeScreen() {
  const [data, setData] = useState<any>({ stories: [], recentChats: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteSheetVisible, setIsDeleteSheetVisible] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{id: number, username: string} | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  // ✨ YAHAN RAKHNE HAIN DONO FUNCTIONS (Loop ke ekdum bahar)
  const handleLongPressChat = (chatUserId: number, chatUsername: string) => {
    setChatToDelete({ id: chatUserId, username: chatUsername });
    setIsDeleteSheetVisible(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    const { id: chatUserId } = chatToDelete;
    setIsDeleteSheetVisible(false);
    
    setData((prevData: any) => ({
      ...prevData,
      recentChats: prevData.recentChats.filter((c: any) => c.id !== chatUserId)
    }));

    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`http://10.190.47.168:3000/api/messages/chat/${chatUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };
  
  const navigation = useNavigation<any>();

  const registerForPushNotificationsAsync = async (userId: any) => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("🔥 Mera Push Token:", token);
      await fetch('http://10.190.47.168:3000/api/auth/save-push-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, pushToken: token }),
      });
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  };

  useEffect(() => {
    fetchChatsData();

    // ✨ NAYA MASTER FIX: AppState Listener (Instant Offline/Online ke liye)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        socket.connect();
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          socket.emit('register', Number(storedUserId)); // Hamesha Number bhejo
        }
      } else if (nextAppState === 'background') { // 'inactive' hata diya yahan se
        socket.disconnect();
      }
    });

    const handleUserStatus = (statusData: any) => {
  setData((prevData: any) => ({
    ...prevData,
    recentChats: prevData.recentChats.map((chat: any) =>
      Number(chat.id) === Number(statusData.userId)
        ? { ...chat, isOnline: statusData.status === 'online' } // ✨ FIX: Backend data se match kiya
        : chat
    ),
  }));
};

socket.on('userStatus', handleUserStatus);

    return () => {
      subscription.remove();
      socket.off('userStatus', handleUserStatus);
    };
  }, []);
  
  const fetchStoriesData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await fetch('http://10.190.47.168:3000/api/stories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        setData((prev: any) => ({ ...prev, stories: json.stories }));
      }
    } catch (error) {
      console.error('Fetch stories error:', error);
    }
  };

  const fetchChatsData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedUserId = await AsyncStorage.getItem('userId'); 

      if (!token) { navigation.replace('Auth'); return; }
      
      const response = await fetch('http://10.190.47.168:3000/api/chats/recent', { // Apna sahi IP yahan check kar lena
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {

        setData((prevData: any) => {
          const newChatData = { ...json };
          delete newChatData.stories; // Chat API wali nakli stories ko hata diya
          return { ...prevData, ...newChatData }; // Asli stories bach jayengi
        });
        const hasUnreadChats = json.recentChats?.some((chat: any) => (chat.unreadCount || 0) > 0);
        setHasUnread(hasUnreadChats);
        const myUserId = json.currentUserId || storedUserId; 

        if (myUserId) {
          socket.connect(); 
          socket.emit('register', Number(myUserId)); // ✨ FIX: Hamesha Number bhejo
          console.log('Global Socket Connected for user:', myUserId);
          registerForPushNotificationsAsync(myUserId);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchChatsData(); 
    fetchStoriesData();
  };
  
  // ✨ NAYA LOGIC: Live Home Screen Updates via Socket.io
  useEffect(() => {
    // Normal message aane ya read hone par
    const handleLiveUpdate = () => {
      console.log("Home Screen Live Update Triggered!");
      fetchChatsData(); 
    };
    const handleLiveStoryUpdate = () => {
      console.log("New Story Live Update!");
      fetchStoriesData(); 
    };

    // ✨ NAYA: Delete ke liye alag function banaya
    const handleDeletedUpdate = (data: any) => {
      console.log("Home Screen: Delete signal received! Waiting for DB...", data);
      
      setTimeout(() => {
        fetchChatsData();
      }, 500); 
    };

    socket.on('receiveMessage', handleLiveUpdate);
    socket.on('messagesReadLive', handleLiveUpdate);
    socket.on('messagesDeletedBulk', handleDeletedUpdate);
    socket.on('newStoryLive', handleLiveStoryUpdate); 

    return () => {
      socket.off('receiveMessage', handleLiveUpdate);
      socket.off('messagesReadLive', handleLiveUpdate);
      socket.off('messagesDeletedBulk', handleDeletedUpdate);
      socket.off('newStoryLive', handleLiveStoryUpdate);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChatsData();
      fetchStoriesData(); 
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }
  // 👇 ✨ NAYA LOGIC: Stories ko group karenge taaki koi delete na ho 👇
  const currentUser = data?.currentUser || 'User';
  const myStories: any[] = [];
  const otherUserGroups: { username: string; stories: any[] }[] = [];
  const userMap = new Map();

  // Stories ko purani se nayi ke order me sort karenge (Oldest first)
  const allStories = [...(data.stories || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  allStories.forEach((story: any) => {
    const uname = story.user?.username || story.username || 'User';
    if (uname === currentUser) {
      myStories.push(story);
    } else {
      if (!userMap.has(uname)) {
        userMap.set(uname, []);
      }
      userMap.get(uname).push(story); // Ek user ki saari stories yahan jama hongi
    }
  });

  // Map ko array mein convert kiya render karne ke liye
  userMap.forEach((storiesArray, uname) => {
    otherUserGroups.push({ username: uname, stories: storiesArray });
  });
  // 👆 YAHAN TAK 👆

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PingUp</Text>
          <Text style={styles.subTitle}>Hey, {data?.currentUser || 'User'}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('NotificationsScreen')}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            
            {/* ✨ NAYA LOGIC: Jab sach me unread hoga, tabhi dot dikhega */}
            {hasUnread && <View style={styles.badge} />}
            
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
          <View style={{ alignItems: 'center', marginRight: 15, width: 60 }}>
            <View style={{ position: 'relative', marginBottom: 5 }}>
              
              {/* ✨ FIX: isMyStory: true add kiya */}
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => myStories.length > 0 ? navigation.navigate('StoryViewer', { userStories: myStories, isMyStory: true }) : navigation.navigate('CreateStory')}
                style={[styles.storyAvatar, { backgroundColor: getAvatarColor(currentUser), width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }]}
              >
                <Text style={[styles.storyInitial, { fontSize: 24, color: '#FFF' }]}>{(currentUser || 'U')[0].toUpperCase()}</Text>
              </TouchableOpacity>
              
              {/* Chhota Plus (+) Icon: Ispe click karke hamesha nayi story upload hogi */}
              <TouchableOpacity 
                style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#4DACFF', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#12102A', zIndex: 10 }}
                onPress={() => navigation.navigate('CreateStory')}
              >
                <Ionicons name="add" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.storyName}>My Status</Text>
          </View>
          
          {/* 👇 ✨ FIX: Online dot ke sath stories map hongi 👇 */}
          {otherUserGroups.map((group: any, index: number) => {
            const actualUsername = group.username; 
            
            // ✨ NAYA LOGIC: Check karo ki kya ye user recentChats mein online hai
            const isOnline = data.recentChats?.some(
              (chat: any) => (chat.username === actualUsername || chat.user?.username === actualUsername) && chat.isOnline
            );

            return (
              <TouchableOpacity 
                key={index} style={styles.storyItem}
                onPress={() => navigation.navigate('StoryViewer', { userStories: group.stories })}
              >
                <View style={{ position: 'relative' }}>
                  <View style={styles.storyRing}>
                    <View style={[styles.storyAvatar, { backgroundColor: getAvatarColor(actualUsername) }]}>
                      <Text style={styles.storyInitial}>{actualUsername[0].toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  {/* ✨ NAYA LOGIC: Chat wala same exact style (onlineBadge) use kiya */}
                  {isOnline && (
                    <View style={[
                      styles.onlineBadge, 
                      { position: 'absolute', bottom: 10, right: 2, zIndex: 10 } // Ring ke hisaab se position fix ki
                    ]} />
                  )}
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{actualUsername}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Recent Chats List */}
        <Text style={styles.sectionTitle}>Recent Chats</Text>
        <View style={styles.chatList}>
          {/* ✨ NAYA LOGIC: Yahan data.recentChats me .filter() add kiya hai */}
          {data.recentChats
            ?.filter((chat: any) => 
              chat.username.toLowerCase().includes(searchText.toLowerCase())
            )
            .map((chat: any, index: number) => {
              const unreadCount = chat.unreadCount || 0;
              const lastMessageText = chat.lastMessage || "Tap to start messaging...";
              const badgeText = unreadCount > 3 ? "4+" : unreadCount;
              // ✨ NAYA LOGIC: Read hone par fade (light) karne wala logic
              const rawContent = chat.lastMessage || "";
              const isVideoCall = rawContent.includes('📹') || rawContent.includes('Video');
              const isAudioCall = rawContent.includes('📞') || rawContent.includes('Audio') || rawContent.includes('CALL_LOG|');
              const isCall = isVideoCall || isAudioCall;
              const isOutgoingCall = chat.isLastMessageMine; 
              
              let displayMsg = rawContent;
              let arrowIcon = '';
              let typeIcon = '';
              let callColor = '';

              if (isCall) {
                if (isOutgoingCall) {
                  // Outgoing: Unread hai toh White, Read ho gaya toh Grey (Fade)
                  callColor = unreadCount > 0 ? '#FFFFFF' : '#A0A0C0'; 
                  arrowIcon = 'arrow-up-right';
                  typeIcon = isVideoCall ? 'video' : 'phone'; 
                  displayMsg = 'Outgoing call';
                } else {
                  // Incoming Missed: Unread hai toh Bright Red, Read ho gaya toh Grey (Fade)
                  callColor = unreadCount > 0 ? '#FF6B6B' : '#A0A0C0'; 
                  arrowIcon = 'arrow-down-left';
                  typeIcon = isVideoCall ? 'video' : 'phone-missed'; 
                  displayMsg = 'Missed incoming call';
                }
              }

              // ✨ NAYA LOGIC: "Just now" vs "Actual Time" vs "Blank"
              let timeText = "";
              if (chat.rawTime && chat.rawTime > 0) {
                const currentTime = new Date().getTime();
                const timeDifference = currentTime - chat.rawTime; // ✨ Typo fix: Minus (-) laga diya hai
                
                if (timeDifference < 60000) { 
                  // Agar 1 minute (60,000 ms) se kam hua hai
                  timeText = "Just now";
                } else {
                  // Agar 1 minute se zyada ho gaya hai toh actual time dikhao
                  timeText = chat.lastMessageTime;
                }
              }


            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.chatItem, { flexDirection: 'row', alignItems: 'center' }]}
                // ✨ Touch area ko charo taraf se 10-15 pixels bada kar diya
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.6}
                onPress={() => navigation.navigate('ChatDetail', { userId: chat.id, username: chat.username })}
                // ✨ Hold karne par delete modal aayega
                onLongPress={() => handleLongPressChat(chat.id, chat.username)}
              >
                {/* ✨ Avatar with consistent user color */}
<View
  style={[
    styles.chatAvatar,
    {
      backgroundColor: getAvatarColor(chat.username),
      position: 'relative',
    },
  ]}
>
  <Text style={styles.storyInitial}>
    {chat.username[0].toUpperCase()}
  </Text>
  
  {/* ✨ GREEN DOT */}
  {chat.isOnline && <View style={styles.onlineBadge} />}
</View>
                
                <View style={[styles.chatContent, { flex: 1, marginLeft: 15, justifyContent: 'center' }]}>
  <Text style={styles.chatTitle}>{chat.username} {chat.isPro && '⭐'}</Text>
  
  {/* ✨ NAYA LOGIC: Strict if-else for Deleted Icon OR Call Icon OR Tick icon */}
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
    
    {chat.isLastMessageDeleted ? (
      <Ionicons name="ban-outline" size={14} color="#A0A0C0" style={{ marginRight: 4, marginTop: 1 }} />
    ) : isCall ? (
      // ✨ FIX: 2 Icons (Pehle Arrow, fir Phone/Video icon)
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Feather name={arrowIcon as any} size={14} color={callColor} style={{ marginRight: 2 }} />
        <Feather name={typeIcon as any} size={12} color={callColor} style={{ marginRight: 5 }} />
      </View>
    ) : (
      chat.isLastMessageMine && chat.lastMessage && (
        <Ionicons 
          name={chat.lastMessageStatus === 'read' ? "checkmark-done" : "checkmark"} 
          size={16} 
          color={chat.lastMessageStatus === 'read' ? "#4DACFF" : "#A0A0C0"} 
          style={{ marginRight: 4 }} 
        />
      )
    )}
    
    <Text 
      style={[
        styles.chatDesc, 
        { 
          color: isCall ? callColor : (unreadCount > 0 ? '#FFF' : '#A0A0C0'), 
          fontWeight: unreadCount > 0 ? 'bold' : 'normal', 
          flex: 1,
          fontStyle: chat.isLastMessageDeleted ? 'italic' : 'normal' 
        }
      ]} 
      numberOfLines={1}
    >
      {isCall ? displayMsg : lastMessageText}
    </Text>
  </View>
</View>

                {/* Right Side: Time aur Badge */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10 }}>
                  
                  {/* Agar timeText empty nahi hai, tabhi text component render hoga */}
                  {timeText !== "" && (
                    <Text style={[styles.chatTime, { color: unreadCount > 0 ? '#4DACFF' : '#A0A0C0', marginBottom: unreadCount > 0 ? 5 : 0 }]}>
                      {timeText}
                    </Text>
                  )}

                  {unreadCount > 0 && (
                    <View style={{ backgroundColor: '#4DACFF', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                        {badgeText}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* 🗑️ HOME SCREEN: DELETE CHAT MODAL */}
      <PremiumBottomSheet visible={isDeleteSheetVisible} onClose={() => setIsDeleteSheetVisible(false)}>
        {/* Height ko 2-button wale model ke barabar karne ke liye minHeight 250 lagaya hai */}
        <View style={[styles.modalContainer, { minHeight: 250, justifyContent: 'space-between' }]}>
          
          <View>
            {/* Patla sa line (Drag Handle) */}
            <View style={{ width: 40, height: 4, backgroundColor: '#4A4A6A', borderRadius: 2, alignSelf: 'center', marginBottom: 15 }} />
            
            <Text style={styles.modalTitle}>Delete Chat?</Text>
<Text style={{ 
  color: '#A0A0C0', 
  textAlign: 'center', 
  lineHeight: 21, 
  marginBottom: 18, 
  paddingHorizontal: 20, 
  fontSize: 14 
}}>
  This will permanently delete your conversation with{' '}
  <Text style={{ fontWeight: '700', color: '#4DACFF' }}>{chatToDelete?.username}</Text>
  {'\n'}
  <Text style={{ fontSize: 12, color: '#6B6B8A', fontStyle: 'italic' }}>
    This action cannot be undone.
  </Text>
</Text>

            {/* Exact 2nd Model jaisa Delete Button */}
            <TouchableOpacity style={styles.modalOption} onPress={confirmDeleteChat}>
              <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
              <Text style={styles.modalOptionText}>Delete Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Cancel Button */}
          <TouchableOpacity 
            style={{ backgroundColor: '#2A2A40', borderRadius: 15, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 5 }} 
            onPress={() => setIsDeleteSheetVisible(false)}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          
        </View>
      </PremiumBottomSheet>

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

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 }, 
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

  fab: { position: 'absolute', right: 20, bottom: 110, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10 },
  modalContainer: { 
    backgroundColor: '#1A183A', // Naya dark background
    borderTopLeftRadius: 24, // Radius 20 se 24 kar diya
    borderTopRightRadius: 24, 
    padding: 20, 
    paddingBottom: 40 // Bottom spacing match karne ke liye
  },
  modalTitle: { 
    color: '#FFF', 
    fontSize: 16, // Font size 18 se 16 kar diya
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  modalOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' // Subtle border color
  },
  modalOptionText: { 
    fontSize: 16, 
    marginLeft: 15, 
    fontWeight: '500', 
    color: '#FF6B6B' // Text default red kar diya
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: '#4DFFB8',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#0D0B1C', // PingUp ke background jaisa color taaki cut-out effect aaye
  }
});