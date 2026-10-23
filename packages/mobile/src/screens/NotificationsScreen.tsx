import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getAvatarColor } from '../utils/avatarUtils';

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
    const rawContent = item.content || '';
    
    // ✨ FIX 1: Emojis aur text se Call Type detect karo
    const isVideoCall = rawContent.includes('📹') || rawContent.includes('Video');
    const isAudioCall = rawContent.includes('📞') || rawContent.includes('Audio') || rawContent.includes('Call');
    const isCall = isVideoCall || isAudioCall || rawContent.includes('CALL_LOG|');
    const isPhoto = !isCall && !!item.mediaUrl;

    // ✨ FIX 2: Dynamic text aur Feather Icons set karo
    let displayString = rawContent; // Default normal message
    let iconName = 'message-circle';
    let iconColor = '#A0A0C0';

    if (isCall) {
      iconName = isVideoCall ? 'video' : 'phone-missed'; // Feather icons
      iconColor = '#FF6B6B'; // Red color for missed calls
      // Kyunki notification dusre user (jaise Aman) se aayi hai, toh hamare liye ye hamesha incoming missed call hai
      displayString = isVideoCall ? 'Missed Video Call' : 'Missed Audio Call';
    } else if (isPhoto) {
      iconName = 'image';
      displayString = 'Photo';
    }

    const username = item.sender?.username || 'User';

    return (
      <TouchableOpacity
        style={styles.notifItem}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('ChatDetail', {
            userId: item.sender.id,
            username,
          })
        }
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(username) }]}>
          <Text style={styles.avatarText}>
            {username[0]?.toUpperCase() || 'U'}
          </Text>
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifTopRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.notifTime}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* ✨ FIX 3: Clean Icon aur Text UI */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Feather 
              name={iconName as any} 
              size={13} 
              color={iconColor} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.notifDesc, isCall && { color: '#FF6B6B' }]} numberOfLines={1}>
              {displayString}
            </Text>
          </View>
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
  
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A183A',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    position: 'relative',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#4DACFF',
    borderWidth: 2,
    borderColor: '#1A183A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notifContent: {
    flex: 1,
    minWidth: 0,
  },

  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },

  notifTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  notifDesc: {
    color: '#A0A0C0',
    fontSize: 13,
    lineHeight: 19,
  },

  notifTime: {
    color: '#777694',
    fontSize: 10,
    fontWeight: '600',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4DACFF',
    marginLeft: 9,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySubText: { color: '#6B6B8A', fontSize: 14, marginTop: 5 }
});