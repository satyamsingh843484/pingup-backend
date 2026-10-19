import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import socket from '../socket';

export default function ChatDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const { userId, username, isCallActive } = route.params; 

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<any>(null);
  
  const scrollViewRef = useRef<any>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!myUserId) return; 

    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('register', myUserId);

    // Jaise hi chat khule, receiver ka status pucho aur usko Blue Tick bhej do
    socket.emit('checkStatus', userId); 
    socket.emit('markAsRead', { senderId: userId, receiverId: myUserId });

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

    // --- Listeners ON Karo ---
    socket.on('userStatus', handleStatus);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('messagesReadByReceiver', handleMessagesRead);
    socket.on('receiveMessage', handleReceiveMessage);

    // --- Cleanup (Listeners OFF Karo, DISCONNECT NAHI) ---
    return () => {
      socket.off('userStatus', handleStatus);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('messagesReadByReceiver', handleMessagesRead);
      socket.off('receiveMessage', handleReceiveMessage);
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
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getLastSeenText = () => {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline'; // Agar DB me time nahi hai toh sirf Offline dikhega

    const date = new Date(lastSeen);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `last seen today at ${time}`;
    if (isYesterday) return `last seen yesterday at ${time}`;
    
    // Agar 2 din se zyada purana hai toh date dikhayega
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
        setMessages(prev => prev.map(msg => msg.id === tempId ? json.message : msg));
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // ✨ UPDATE 1: Web ke liye Alert bypass karo
  const handleAttachment = () => {
    if (Platform.OS === 'web') {
      // Web me seedha file picker (gallery) khol do
      openGallery();
    } else {
      Alert.alert(
        "Send Photo",
        "Choose an option",
        [
          { text: "Take Photo", onPress: openCamera },
          { text: "Choose from Gallery", onPress: openGallery },
          { text: "Cancel", style: "cancel" }
        ]
      );
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
        setMessages(prev => prev.map(msg => msg.id === tempId ? json.message : msg));
      }

    } catch (error) {
      console.error('Media upload error:', error);
      Alert.alert("Upload Failed", "Aapki photo upload nahi ho paayi.");
      // Failed message ko chat se hata do taaki kachra na jama ho
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!myUserId) return; // Agar myUserId nahi hai toh function yahi rok do

    // 1. Agar text box khali ho gaya (saara text delete kar diya)
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{username[0].toUpperCase()}</Text>
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
        
        <ScrollView 
          style={styles.chatArea}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>Say hi to {username}! 👋</Text>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.senderId === myUserId;
              const displayText = formatCallMessage(msg.content, isMine);

              return (
                <View key={index} style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                  <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
                    
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <Image source={{ uri: msg.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                    )}

                    {msg.content ? (
                      <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                        {displayText}
                      </Text>
                    ) : null}
                    
                    <View style={styles.timeAndTickContainer}>
                      <Text style={styles.timeText}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {/* Agar photo upload ho rahi hai toh clock icon dikhao, nahi toh ticks */}
                      {isMine && (
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
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleAttachment}>
            <Ionicons name="add" size={24} color="#6B6B8A" />
          </TouchableOpacity>
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
              }, 2000); // 2000 milliseconds = 2 seconds
            }}
            multiline
          />
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
      </KeyboardAvoidingView>
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
    paddingHorizontal: 15, 
    paddingVertical: 22, 
    backgroundColor: '#1A183A', 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.05)',
    flexShrink: 0, 
  },
  attachBtn: { padding: 10, paddingBottom: 12 },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFF', borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, maxHeight: 100, fontSize: 15, marginHorizontal: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  micBtn: { padding: 10, paddingBottom: 12 }
});