import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://10.190.47.168:3000/api/messages/unread', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      
      if (json.success) {
        setNotifications(json.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // Agar missed call hai, toh alag text dikhao
    const isCall = item.content && item.content.includes('CALL_LOG|');
    const msgText = isCall ? "Missed a call from you" : (item.mediaUrl ? "Sent you a photo" : item.content);

    return (
      <TouchableOpacity 
        style={styles.notifItem}
        onPress={() => navigation.navigate('ChatDetail', { userId: item.sender.id, username: item.sender.username })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.sender.username[0].toUpperCase()}</Text>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>New message from {item.sender.username}</Text>
          <Text style={styles.notifDesc} numberOfLines={1}>{msgText}</Text>
          <Text style={styles.notifTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.unreadDot} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4DACFF" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={60} color="#6B6B8A" />
          <Text style={styles.emptyText}>No new notifications</Text>
          <Text style={styles.emptySubText}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: '#1A183A', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  listContainer: { padding: 15 },
  notifItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A183A', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  notifDesc: { fontSize: 13, color: '#A0A0C0', marginBottom: 6 },
  notifTime: { fontSize: 11, color: '#6B6B8A' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4DACFF', marginLeft: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySubText: { color: '#6B6B8A', fontSize: 14, marginTop: 5 }
});