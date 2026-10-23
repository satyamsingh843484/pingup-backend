import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image, FlatList, AppState, Animated 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import socket from '../socket';
import { getAvatarColor } from '../utils/avatarUtils';

// ✨ NAYA LOGIC: Premium iOS jaisa bounciness wala Bottom Sheet
  const PremiumBottomSheet = ({ visible, onClose, children }: { visible: boolean, onClose: () => void, children: React.ReactNode }) => {
  const translateY = useRef(new Animated.Value(500)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [renderModal, setRenderModal] = useState(false);

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      // OPEN ANIMATION: Fade In (250ms) + Spring Slide Up (Tension 70, Friction 11)
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 11,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // CLOSE ANIMATION: Fade Out (200ms) + Slide Down (220ms)
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 500,
          duration: 220,
          useNativeDriver: true,
        })
      ]).start(() => setRenderModal(false));
    }
  }, [visible]);

  if (!renderModal) return null;

  return (
    <Modal transparent={true} visible={renderModal} animationType="none" onRequestClose={onClose}>
      {/* 1. Backdrop Fade Animation */}
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity, position: 'absolute', width: '100%', height: '100%' }} />
      
      {/* 2. Touchable Overlay (Bahar click karne pe close) */}
      <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        
        {/* 3. Sheet Spring Slide Animation */}
        <Animated.View style={{ transform: [{ translateY }], width: '100%' }}>
          {/* Tumhara Modal Content yahan aayega */}
          <TouchableOpacity activeOpacity={1}> 
            {children}
          </TouchableOpacity>
        </Animated.View>

      </TouchableOpacity>
    </Modal>
  );
};

export default function ChatDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const { userId, username, isCallActive } = route.params; 

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<any>(null);
  
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{ id: number, isMine: boolean } | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<any[]>([]);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  const [previouslySeenCalls, setPreviouslySeenCalls] = useState(new Set());

  // 1. Ek baar mount hone par purane calls load karo
  useEffect(() => {
    const loadSeenCalls = async () => {
      const stored = await AsyncStorage.getItem('seenMissedCalls');
      if (stored) {
        setPreviouslySeenCalls(new Set(JSON.parse(stored)));
      }
    };
    loadSeenCalls();
  }, []);

  // 2. Naye calls ko storage me daal do (par state update mat karo taaki current screen par red hi rahein)
  useEffect(() => {
    const saveNewMissedCalls = async () => {
      const stored = await AsyncStorage.getItem('seenMissedCalls');
      const parsedCalls = stored ? JSON.parse(stored) : [];
      
      const currentMissedCallIds = messages
        .filter(m => (m.content?.includes('📹') || m.content?.includes('Video') || m.content?.includes('📞') || m.content?.includes('Audio') || m.content?.includes('CALL_LOG|')) && m.senderId !== myUserId)
        .map(m => m.id);

      if (currentMissedCallIds.length > 0) {
        const updatedCalls = new Set([...parsedCalls, ...currentMissedCallIds]);
        await AsyncStorage.setItem('seenMissedCalls', JSON.stringify(Array.from(updatedCalls)));
      }
    };

    if (messages.length > 0) {
      saveNewMissedCalls();
    }
  }, [messages]);


  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!myUserId) return; 

    const connectAndSync = () => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('register', myUserId);

    // Jaise hi chat khule, receiver ka status pucho aur usko Blue Tick bhej do
    socket.emit('checkStatus', userId); 
    socket.emit('markAsRead', { senderId: userId, receiverId: myUserId });
  };
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    connectAndSync();
  }
});

socket.on('connect', connectAndSync);

    // --- Event Handlers ---
    const handleStatus = (data: any) => {
      if (data.userId === userId || data.userId === Number(userId)) {
        setIsOnline(data.status === 'online');
        if (data.status === 'offline') {
          setLastSeen(data.lastSeen); // Naya Last Seen Logic
        }
      }
    };

    const handleTyping = (data: any) => {
      if (data.senderId === userId || data.senderId === Number(userId)) setIsTyping(true);
    };

    const handleStopTyping = (data: any) => {
      if (data.senderId === userId || data.senderId === Number(userId)) setIsTyping(false);
    };

    const handleMessagesRead = (data: any) => {
      if (data.readBy === userId || data.readBy === Number(userId)) {
        setMessages((prev) => prev.map((msg) => 
          (msg.senderId === myUserId || msg.senderId === Number(myUserId)) ? { ...msg, status: 'read' } : msg
        ));
      }
    };

    const handleReceiveMessage = (newMessage: any) => {
      if (newMessage.senderId === userId || newMessage.senderId === Number(userId)) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        // Naya message aate hi read mark kar do
        socket.emit('markAsRead', { senderId: userId, receiverId: myUserId });
      }
    };

    // ✨ NAYA: Delete Event Handler
    const handleMessagesDeletedBulk = (data: any) => {
      // Samne wale ke phone me live UI update karke multiple messages ko delete mark kar do
      setMessages((prev) => prev.map((msg) => 
        data.messageIds.includes(msg.id) ? { ...msg, isDeleted: true } : msg
      ));
    };

    // --- Listeners ON Karo ---
socket.on('userStatus', handleStatus);
socket.on('typing', handleTyping);
socket.on('stopTyping', handleStopTyping);
socket.on('messagesReadByReceiver', handleMessagesRead);
socket.on('receiveMessage', handleReceiveMessage);
socket.on('messagesDeletedBulk', handleMessagesDeletedBulk);

connectAndSync();

    // --- Cleanup (Listeners OFF Karo, DISCONNECT NAHI) ---
    return () => {
      socket.off('userStatus', handleStatus);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('messagesReadByReceiver', handleMessagesRead);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messagesDeletedBulk', handleMessagesDeletedBulk);
    };
  }, [myUserId, userId]);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`http://10.190.47.168:3000/api/messages/chat/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {
        setMessages(json.messages);
        setMyUserId(json.myId); 

        // ✨ NAYA LOGIC: Messages load hote hi unhe "read" mark kar do
        try {
          await fetch(`http://10.190.47.168:3000/api/messages/mark-read`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ senderId: userId }) // 'userId' us bande ka hai jiski chat khuli hai
          });
          socket.emit('messagesRead', { toUserId: userId });
        } catch (markError) {
          console.error("Mark as read call failed:", markError);
        }
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getLastSeenText = () => {
  if (isTyping) return 'typing...';
  if (isOnline === true) return 'Online';
  if (isOnline === null) return '';

  if (!lastSeen) return '';

  const date = new Date(lastSeen);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isToday) return `last seen today at ${time}`;
  if (isYesterday) return `last seen yesterday at ${time}`;

  return `last seen ${date.toLocaleDateString()} at ${time}`;
};

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      content: inputText,
      senderId: myUserId,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setInputText('');

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://10.190.47.168:3000/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiverId: userId, content: tempMessage.content })
      });
      const json = await response.json();
      
      if (json.success) {
  setMessages(prev => prev.map(msg => 
    msg.id === tempId 
      ? { 
          ...json.message, 
          // ✨ FIX: Agar socket ne isko already 'read' kar diya hai, toh naye API response se usko wapas 'sent' mat karo
          status: msg.status === 'read' ? 'read' : json.message.status 
        } 
      : msg
  ));
}
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // ✨ UPDATE 1: Web ke liye Alert bypass karo
  const handleAttachment = () => {
    if (Platform.OS === 'web') {
      // Web par seedha file picker (gallery) khol do
      openGallery();
    } else {
      // Mobile par naya premium bottom-sheet modal kholo
      setIsMediaModalVisible(true);
    }
  };

  const handleLongPressMessage = (msgId: number, isMine: boolean) => {
    setSelectedMessage({ id: msgId, isMine });
    setDeleteModalVisible(true);
  };

  const allSelectedAreMine = selectedMessages.every(msg => msg.senderId === myUserId);
  const handleBulkDelete = async (type: string) => {
    if (selectedMessages.length === 0) return;
    
    const messageIds = selectedMessages.map(msg => msg.id);
    setDeleteModalVisible(false);
    setSelectedMessages([]); // Selection hata do

    try {
      if (type === 'for_everyone') {
        setMessages(prev => prev.map(msg => messageIds.includes(msg.id) ? { ...msg, isDeleted: true } : msg));
        // Array of IDs bhej rahe hain
        socket.emit('deleteMessagesBulk', { messageIds, receiverId: userId });
      } else if (type === 'for_me') {
        setMessages(prev => prev.filter(msg => !messageIds.includes(msg.id)));
      }

      const token = await AsyncStorage.getItem('userToken');
      await fetch(`http://10.190.47.168:3000/api/messages/delete-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messageIds, type })
      });
    } catch (error) {
      console.error("Bulk delete error:", error);
    }
  };

  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Thoda compress kiya taaki jaldi upload ho
      base64: true, // NAYA
    });
    if (!result.canceled) {
      sendMediaMessage(result.assets[0]);
    }
  };

  const openGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Thoda compress kiya
      base64: true, // NAYA
    });
    if (!result.canceled) {
      sendMediaMessage(result.assets[0]);
    }
  };

  // ✨ NAYA LOGIC: Cloudinary Upload aur DB Sync ✨
  const sendMediaMessage = async (asset: any) => {
    const tempId = Date.now();
    
    // UI me turant dikhane ke liye
    const tempMessage = {
      id: tempId,
      content: '', 
      mediaUrl: asset.uri, 
      mediaType: 'image', 
      senderId: myUserId,
      status: 'sending...',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Jab hum base64 use karte hain toh error ka chance 0% ho jata hai
      const base64Img = `data:image/jpeg;base64,${asset.base64}`;
      const data = new FormData();
      data.append('file', base64Img);
      data.append('upload_preset', 'pingup_preset');
      data.append('cloud_name', 'duhokqw0j');

      const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/duhokqw0j/image/upload', {
        method: 'POST',
        body: data,
      });
      
      const uploadJson = await uploadResponse.json();
      
      if (!uploadJson.secure_url) {
        throw new Error("Cloudinary did not return a URL");
      }

      const secureUrl = uploadJson.secure_url; 

      // Node.js par URL send karo
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://10.190.47.168:3000/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          receiverId: userId, 
          content: '', 
          mediaUrl: secureUrl, 
          mediaType: 'image' 
        })
      });
      const json = await response.json();
      
      if (json.success) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === tempId) {
            return { 
              ...json.message, 
              status: msg.status === 'read' ? 'read' : json.message.status 
            };
          }
          return msg;
        }));
        setTimeout(() => {
          fetchMessages();
        }, 1500);
      }

    } catch (error) {
      console.error('Media upload error:', error);
      Alert.alert("Upload Failed", "Aapki photo upload nahi ho paayi.");
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!myUserId) return;
    if (text.length === 0) {
      socket.emit('stopTyping', { senderId: myUserId, receiverId: userId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    // 2. Kuch type kiya hai toh 'typing' bhejo
    socket.emit('typing', { senderId: myUserId, receiverId: userId });

    // 3. Purana timer clear karo
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // 4. Naya 2-second ka timer set karo
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { senderId: myUserId, receiverId: userId });
    }, 2000);
  };

  const formatCallMessage = (content: string, isMine: boolean) => {
    if (!content) return "";

    if (content.startsWith('CALL_LOG|')) {
      const parts = content.split('|');
      const callType = parts[1]; 
      const status = parts[2]; 
      const duration = parseInt(parts[3] || '0');

      const icon = callType === 'video' ? '📹' : '📞';

      if (status === 'missed' || status === 'declined') {
        return `${icon} ${isMine ? 'Outgoing Call (Missed)' : 'Missed Call'}`;
      } else {
        const m = Math.floor(duration / 60).toString().padStart(2, '0');
        const s = (duration % 60).toString().padStart(2, '0');
        return `${icon} ${isMine ? 'Outgoing Call' : 'Incoming Call'} • ${m}:${s}`;
      }
    }

    if (content.includes('Outgoing Call')) {
      return isMine ? content : content.replace('Outgoing Call (Missed)', 'Missed Call').replace('Outgoing Call', 'Incoming Call');
    }

    return content;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { height: '100vh', maxHeight: '100vh', overflow: 'hidden' }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 1}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerProfile}>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(username) }]}>
              <Text style={styles.avatarText}>
                {username?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{username}</Text>
              <Text style={[
            styles.statusText, 
            isTyping ? { color: '#4DFFB8', fontStyle: 'italic' } 
            : isOnline ? { color: '#4DFFB8', fontWeight: '600' } // ✨ NAYA: Online ke liye Green color!
            : { color: 'rgba(255,255,255,0.6)' } // Offline Last seen ke liye Gray
          ]}>
            {isTyping ? 'typing...' : getLastSeenText()}
          </Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CallScreen', { receiverId: userId, receiverName: username, type: 'audio', isIncoming: false })}>
              <Ionicons name="call" size={20} color="#4DACFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CallScreen', { receiverId: userId, receiverName: username, type: 'video', isIncoming: false })}>
              <Ionicons name="videocam" size={20} color="#4DACFF" />
            </TouchableOpacity>
          </View>
        </View>

        {isCallActive && (
          <TouchableOpacity style={styles.activeCallBanner} activeOpacity={0.8} onPress={() => navigation.goBack()}>
            <View style={styles.bannerLeft}>
              <Ionicons name="call" size={16} color="#12102A" style={{ marginRight: 8 }} />
              <Text style={styles.activeCallText}>Tap to return to call</Text>
            </View>
            <TouchableOpacity style={styles.endCallSmallBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="call" size={16} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        
        <FlatList
  style={styles.chatArea}
  data={[...messages].reverse()} 
  inverted={true}
  keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  ListEmptyComponent={<Text style={styles.emptyText}>Say hi to {username}! 👋</Text>}
  renderItem={({ item: msg }) => {
    const isMine = msg.senderId === myUserId;
    const displayText = formatCallMessage(msg.content, isMine);
    const isSelected = selectedMessages.some(m => m.id === msg.id);

  // ✨ NAYA LOGIC: Check karo ki kya saare selected messages mere hain?
  const allSelectedAreMine = selectedMessages.every(msg => msg.senderId === myUserId);

  // ✨ NAYA LOGIC: Bulk Delete Function (Purane handleDeleteMessage ki jagah)
  const handleBulkDelete = async (type: string) => {
    if (selectedMessages.length === 0) return;
    
    const messageIds = selectedMessages.map(msg => msg.id);
    setDeleteModalVisible(false);
    setSelectedMessages([]); // Selection hata do

    try {
      if (type === 'for_everyone') {
        setMessages(prev => prev.map(msg => messageIds.includes(msg.id) ? { ...msg, isDeleted: true } : msg));
        socket.emit('deleteMessagesBulk', { messageIds, receiverId: userId });
      } else if (type === 'for_me') {
        setMessages(prev => prev.filter(msg => !messageIds.includes(msg.id)));
      }

      const token = await AsyncStorage.getItem('userToken');
      await fetch(`http://10.190.47.168:3000/api/messages/delete-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messageIds, type })
      });
    } catch (error) {
      console.error("Bulk delete error:", error);
    }
  };

  // ✨ NAYA LOGIC: Call aur Emojis detect karne ke liye
  const rawContent = msg.content || "";
  const isVideoCall = rawContent.includes('📹') || rawContent.includes('Video');
  const isAudioCall = rawContent.includes('📞') || rawContent.includes('Audio') || rawContent.includes('CALL_LOG|');
  const isCall = isVideoCall || isAudioCall;

  let callDisplayMsg = displayText;
  let callArrowIcon = '';
  let callTypeIcon = '';
  let callColor = '';

  if (isCall) {
    if (isMine) {
      callColor = '#FFFFFF';
      callArrowIcon = 'arrow-up-right';
      callTypeIcon = isVideoCall ? 'video' : 'phone';
      callDisplayMsg = 'Outgoing call';
    } else {
      // ✨ NAYA LOGIC: Phone storage me check karo ki kya pehle dekh chuka hai?
      const isAlreadySeen = previouslySeenCalls.has(msg.id);
      
      callColor = isAlreadySeen ? '#A0A0C0' : '#FF6B6B';
      callArrowIcon = 'arrow-down-left';
      callTypeIcon = isVideoCall ? 'video' : 'phone-missed';
      callDisplayMsg = 'Missed incoming call';
    }
  }

    return (
      <TouchableOpacity 
        style={[
          styles.messageWrapper, 
          isMine ? styles.myMessageWrapper : styles.theirMessageWrapper,
          isSelected && { backgroundColor: 'rgba(77, 172, 255, 0.2)' }
        ]}
        activeOpacity={0.8}
        onLongPress={() => {
          if (selectedMessages.length === 0) {
            setSelectedMessages([msg]);
          }
        }}
        onPress={() => {
          if (selectedMessages.length > 0) {
            if (isSelected) {
              setSelectedMessages(prev => prev.filter(m => m.id !== msg.id));
            } else {
              setSelectedMessages(prev => [...prev, msg]);
            }
          }
        }}
      >
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {msg.isDeleted ? (
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="ban-outline" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 6 }} />
                <Text style={[styles.messageText, { color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }]}>
                  This message was deleted
                </Text>
             </View>
          ) : (
            <>
              {msg.mediaType === 'image' && msg.mediaUrl && (
                <Image source={{ uri: msg.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
              )}

              {msg.content ? (
                isCall ? (
                  // ✨ FIX: Call ke liye Feather Icons aur custom text
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                    <Feather name={callArrowIcon as any} size={15} color={callColor} style={{ marginRight: 4 }} />
                    <Feather name={callTypeIcon as any} size={13} color={callColor} style={{ marginRight: 6 }} />
                    <Text style={[styles.messageText, { color: callColor, fontWeight: '500' }]}>
                      {callDisplayMsg}
                    </Text>
                  </View>
                ) : (
                  // Normal text message waisa hi rahega
                  <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                    {displayText}
                  </Text>
                )
              ) : null}
            </>
          )}
          
          {/* Time & Ticks */}
          <View style={styles.timeAndTickContainer}>
            <Text style={styles.timeText}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && !msg.isDeleted && (
              msg.status === 'sending...' ? (
                 <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4, marginTop: 1 }} />
              ) : (
                <Ionicons 
                  name={msg.status === 'read' ? 'checkmark-done' : (msg.status === 'delivered' ? 'checkmark-done' : 'checkmark')} 
                  size={14} 
                  color={msg.status === 'read' ? '#4DFFB8' : 'rgba(255,255,255,0.6)'} 
                  style={{ marginLeft: 4, marginTop: 1 }}
                />
              )
            )}
          </View>

        </View>
      </TouchableOpacity>
    );
  }}
/>
{selectedMessages.length > 0 ? (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A183A', padding: 15, paddingBottom: 20, borderTopWidth: 1, borderColor: '#2A2859' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={() => setSelectedMessages([])}>
        <Ionicons name="close" size={24} color="#FFF" />
      </TouchableOpacity>
      <Text style={{ color: '#FFF', fontSize: 16, marginLeft: 15, fontWeight: 'bold' }}>
        {selectedMessages.length} Selected
      </Text>
    </View>
    <TouchableOpacity onPress={() => setDeleteModalVisible(true)}>
      <Ionicons name="trash" size={24} color="#FF6B6B" />
    </TouchableOpacity>
  </View>
) : (

        <View style={styles.inputContainer}>
  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachment}>
    <Ionicons name="add" size={22} color="#4DACFF" />
  </TouchableOpacity>

  <View style={styles.inputWrap}>
    <TextInput
      style={styles.input}
      placeholder="Type a message..."
      placeholderTextColor="#6B6B8A"
      value={inputText}
      onChangeText={(text) => {
        handleTextChange(text);
        if (text.length === 0) {
          socket.emit('stopTyping', { senderId: myUserId, receiverId: userId });
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          return;
        }
        socket.emit('typing', { senderId: myUserId, receiverId: userId });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('stopTyping', { senderId: myUserId, receiverId: userId });
        }, 2000);
      }}
      multiline
    />
  </View>

  {inputText.trim().length > 0 ? (
    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
      <Ionicons name="send" size={18} color="#FFF" />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={styles.micBtn}>
      <Ionicons name="mic" size={22} color="#6B6B8A" />
    </TouchableOpacity>
  )}
</View>
)}
      </KeyboardAvoidingView>
      {/* 🗑️ DELETE MODAL */}
      <PremiumBottomSheet visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#4A4A6A', borderRadius: 2, alignSelf: 'center', marginBottom: 15 }} />
          <Text style={styles.modalTitle}>Message Options</Text>

          <TouchableOpacity style={styles.modalOption} onPress={() => handleBulkDelete('for_me')}>
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
            <Text style={styles.modalOptionText}>Delete for me</Text>
          </TouchableOpacity>

          {allSelectedAreMine && (
            <TouchableOpacity style={styles.modalOption} onPress={() => handleBulkDelete('for_everyone')}>
              <Ionicons name="trash-bin-outline" size={22} color="#FF6B6B" />
              <Text style={styles.modalOptionText}>Delete for everyone</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={{ backgroundColor: '#2A2A40', borderRadius: 15, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 5 }} 
            onPress={() => setDeleteModalVisible(false)}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </PremiumBottomSheet>

      {/* 📷 MEDIA PICKER MODAL */}
      <PremiumBottomSheet visible={isMediaModalVisible} onClose={() => setIsMediaModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#4A4A6A', borderRadius: 2, alignSelf: 'center', marginBottom: 15 }} />
          <Text style={[styles.modalTitle, {textAlign: 'center'}]}>Share Media</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, marginTop: 10 }}>
            <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => { setIsMediaModalVisible(false); openCamera(); }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="camera" size={30} color="#FFF" />
              </View>
              <Text style={{ color: '#A0A0C0', fontSize: 13 }}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => { setIsMediaModalVisible(false); openGallery(); }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="image" size={28} color="#FFF" />
              </View>
              <Text style={{ color: '#A0A0C0', fontSize: 13 }}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{ backgroundColor: '#2A2A40', borderRadius: 15, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 5 }} 
            onPress={() => setIsMediaModalVisible(false)}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </PremiumBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  // ✨ NAYA: Keyboard wrapper ki style add ki
  keyboardWrapper: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#1A183A', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingTop: Platform.OS === 'android' ? 40 : 10 },
  backButton: { padding: 5, marginRight: 10 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusText: { color: '#4DFFB8', fontSize: 12 },
  headerIcons: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },

  activeCallBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#4DFFB8', paddingVertical: 10, paddingHorizontal: 20 },
  bannerLeft: { flexDirection: 'row', alignItems: 'center' },
  activeCallText: { color: '#12102A', fontWeight: 'bold', fontSize: 14 },
  endCallSmallBtn: { backgroundColor: '#FF3B30', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  // ✨ FIX: flexBasis 0 add kiya taaki height limit me rahe
  chatArea: { flex: 1, flexBasis: 0, paddingHorizontal: 15 },
  emptyText: { color: '#6B6B8A', textAlign: 'center', marginTop: 50, fontSize: 15 },
  messageWrapper: { marginBottom: 15, flexDirection: 'row' },
  myMessageWrapper: { justifyContent: 'flex-end' },
  theirMessageWrapper: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  myBubble: { backgroundColor: '#4DACFF', borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: '#1A183A', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFF' },
  theirMessageText: { color: '#E0E0F0' },
  
  mediaImage: { width: 220, height: 220, borderRadius: 10, marginBottom: 5 },

  timeAndTickContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 5 },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  inputContainer: { 
  flexDirection: 'row', 
  alignItems: 'flex-end', 
  paddingHorizontal: 12,        // 15 → 12
  paddingVertical: 25,          // 22 → 25
  gap: 8,                       // ⬅️ NAYA
  backgroundColor: '#1A183A', 
  borderTopWidth: 1, 
  borderTopColor: 'rgba(255,255,255,0.05)',
  flexShrink: 0, 
},
  attachBtn: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: 'rgba(77,172,255,0.1)',
  borderWidth: 1,
  borderColor: 'rgba(77,172,255,0.2)',
  justifyContent: 'center',
  alignItems: 'center',
},
inputWrap: {
  flex: 1,
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: 20,
  paddingHorizontal: 15,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
},
  input: { color: '#FFF', fontSize: 15, maxHeight: 100, paddingVertical: 0 },
  sendBtn: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#4DACFF',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#4DACFF',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 4,
},
  micBtn: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: 'rgba(255,255,255,0.05)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1A183A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalOptionText: { fontSize: 16, marginLeft: 15, fontWeight: '500', color: '#FF6B6B' }

});