import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Platform, TextInput, 
  KeyboardAvoidingView, ScrollView, Share, Animated 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import socket from '../socket';
import { getAvatarColor } from '../utils/avatarUtils';

export default function ContactsScreen() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'online'>('all');
  const navigation = useNavigation<any>();

  // ⬅️ NEW — pulse animation ref
  const onlineDotPulse = useRef(new Animated.Value(1)).current;

  const isSearching = searchQuery.trim().length >= 2;

  const displayedUsers = activeFilter === 'online'
    ? suggestedUsers.filter((u: any) => u.isOnline === true)
    : suggestedUsers;

  const onlineCount = suggestedUsers.filter((u: any) => u.isOnline === true).length;

  // ⬅️ NEW — pulse loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(onlineDotPulse, { toValue: 1.8, duration: 700, useNativeDriver: true }),
        Animated.timing(onlineDotPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ===== SOCKET LIVE STATUS =====
  useEffect(() => {
    const handleUserStatus = (statusData: any) => {
      setSuggestedUsers((prevUsers: any[]) => 
        prevUsers.map((user: any) =>
          Number(user.id) === Number(statusData.userId)
            ? { ...user, isOnline: statusData.status === 'online' }
            : user
        )
      );
      setSearchResults((prevUsers: any[]) => 
        prevUsers.map((user: any) =>
          Number(user.id) === Number(statusData.userId)
            ? { ...user, isOnline: statusData.status === 'online' }
            : user
        )
      );
    };
    socket.on('userStatus', handleUserStatus);
    return () => {
      socket.off('userStatus', handleUserStatus);
    };
  }, []);

  useEffect(() => {
    fetchSuggestedUsers();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setLoading(false);
      return;
    }
    const delayDebounceFn = setTimeout(() => searchUsers(searchQuery), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // ⬅️ NEW — greeting helper
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  };

  // ===== RECENT SEARCHES HELPERS =====
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (error) {
      console.error('Load recent error:', error);
    }
  };

  const saveRecentSearch = async (user: any) => {
    if (!user?.id || !user?.username) return;
    try {
      const minimalUser = { id: user.id, username: user.username };
      const filtered = recentSearches.filter(
        (u: any) => String(u.id) !== String(user.id)
      );
      const updated = [minimalUser, ...filtered].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Save recent error:', error);
    }
  };

  const removeRecentSearch = async (userId: any) => {
    const updated = recentSearches.filter(
      (u: any) => String(u.id) !== String(userId)
    );
    setRecentSearches(updated);
    await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recentSearches');
  };

  const handleOpenChat = (user: any) => {
    saveRecentSearch(user);
    navigation.navigate('ChatDetail', { userId: user.id, username: user.username });
  };

  // ===== API CALLS =====
  const fetchSuggestedUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('https://pingup-backend-v25a.onrender.com/api/chats/suggested', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) setSuggestedUsers(json.users);
    } catch (error) {
      console.error('Error fetching suggested:', error);
    }
  };

  const searchUsers = async (text: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`https://pingup-backend-v25a.onrender.com/api/chats/search?query=${text}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) setSearchResults(json.users);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Hey! Join me on PingUp to chat securely. Download it here: https://PingUp.app/invite',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderSearchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.contactCard}
      onPress={() => handleOpenChat(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.username), position: 'relative' }]}>
        <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
        {item.isOnline && <View style={styles.onlineBadge} />}
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>{item.username}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons 
            name={item.phoneNumber ? 'call-outline' : 'at'} 
            size={11} 
            color="#6B6B8A" 
          />
          <Text style={styles.contactDetails} numberOfLines={1}>
            {item.phoneNumber || `${item.username.toLowerCase()}`}
          </Text>
        </View>
      </View>
      <View style={styles.actionIconBg}>
        <Ionicons name="chatbubble-ellipses" size={18} color="#4DACFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>New Message</Text>
            <Text style={styles.headerSub}>
              <Text style={{ color: '#4DFFB8', fontWeight: '700' }}>{getGreeting()} </Text>
              {'  •  Find friends & chat'}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="people" size={16} color="#4DACFF" />
          </View>
        </View>

        {/* ===== SEARCH BAR ===== */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#6B6B8A" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search username or phone..."
              placeholderTextColor="#6B6B8A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#6B6B8A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ===== RECENT SEARCHES ===== */}
        {!isSearching && recentSearches.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>RECENT ({recentSearches.length})</Text>
              <TouchableOpacity onPress={clearAllRecent} activeOpacity={0.7}>
                <Text style={styles.recentClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentChipsRow}
            >
              {recentSearches.map((user: any) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.recentChip}
                  onPress={() => handleOpenChat(user)}
                  onLongPress={() => removeRecentSearch(user.id)}
                  delayLongPress={400}
                  activeOpacity={0.85}
                >
                  <View style={[styles.recentChipAvatar, { backgroundColor: getAvatarColor(user.username) }]}>
                    <Text style={styles.recentChipInitial}>
                      {(user.username || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.recentChipText} numberOfLines={1}>
                    {user.username}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => removeRecentSearch(user.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="close" size={12} color="#6B6B8A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== CONTENT ===== */}
        {isSearching ? (
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4DACFF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                <Ionicons name="sad-outline" size={45} color="#FF6B6B" />
              </View>
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySub}>
                We couldn't find anyone matching "{searchQuery}"
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSearchItem}
              ListHeaderComponent={
                <View style={styles.resultCountRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#4DFFB8" />
                  <Text style={styles.resultCountText}>
                    {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                  </Text>
                </View>
              }
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.dashboardContainer}
            >
            
            {/* QUICK ACTIONS */}
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(77, 172, 255, 0.15)' }]}>
                  <Ionicons name="people" size={22} color="#4DACFF" />
                </View>
                <Text style={styles.actionText}>New Group</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(77, 255, 184, 0.15)' }]}>
                  <Ionicons name="person-add" size={22} color="#4DFFB8" />
                </View>
                <Text style={styles.actionText}>New Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleInvite} activeOpacity={0.8}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                  <Ionicons name="share-social" size={22} color="#FFB800" />
                </View>
                <Text style={styles.actionText}>Invite</Text>
              </TouchableOpacity>
            </View>

            {/* PREMIUM FILTER CHIPS (50/50) */}
            <View style={styles.filterChipsRow}>
              {/* All Users */}
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'all' && styles.filterChipAllActive]}
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.88}
              >
                <View style={[
                  styles.filterChipIconBox,
                  { backgroundColor: activeFilter === 'all' ? 'rgba(18,16,42,0.18)' : 'rgba(77,172,255,0.15)' }
                ]}>
                  <Ionicons 
                    name="people" 
                    size={15} 
                    color={activeFilter === 'all' ? '#12102A' : '#4DACFF'} 
                  />
                </View>
                <Text style={[styles.filterChipLabel, activeFilter === 'all' && styles.filterChipLabelActive]}>
                  All Users
                </Text>
                <View style={[
                  styles.filterChipCountPill,
                  { backgroundColor: activeFilter === 'all' ? 'rgba(18,16,42,0.18)' : 'rgba(77,172,255,0.18)' }
                ]}>
                  <Text style={[
                    styles.filterChipCountText,
                    { color: activeFilter === 'all' ? '#12102A' : '#4DACFF' }
                  ]}>
                    {suggestedUsers.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Online */}
              <TouchableOpacity
                style={[styles.filterChip, styles.filterChipOnline, activeFilter === 'online' && styles.filterChipOnlineActive]}
                onPress={() => setActiveFilter('online')}
                activeOpacity={0.88}
              >
                <View style={[
                  styles.filterChipIconBox,
                  { backgroundColor: activeFilter === 'online' ? 'rgba(18,16,42,0.18)' : 'rgba(77,255,184,0.15)' }
                ]}>
                  {/* ⬇️ PULSE ANIMATED DOT ⬇️ */}
                  <Animated.View style={[
                    styles.filterChipDot,
                    { 
                      backgroundColor: activeFilter === 'online' ? '#12102A' : '#4DFFB8',
                      transform: [{ scale: onlineDotPulse }]
                    }
                  ]} />
                </View>
                <Text style={[
                  styles.filterChipLabel,
                  { color: '#4DFFB8' },
                  activeFilter === 'online' && styles.filterChipLabelActive
                ]}>
                  Online
                </Text>
                <View style={[
                  styles.filterChipCountPill,
                  { backgroundColor: activeFilter === 'online' ? 'rgba(18,16,42,0.18)' : 'rgba(77,255,184,0.18)' }
                ]}>
                  <Text style={[
                    styles.filterChipCountText,
                    { color: activeFilter === 'online' ? '#12102A' : '#4DFFB8' }
                  ]}>
                    {onlineCount}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* SUGGESTED */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>SUGGESTED ({displayedUsers.length})</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveFilter('all')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {displayedUsers.length === 0 ? (
              <View style={styles.noFilterResults}>
                <Ionicons name="moon-outline" size={22} color="#6B6B8A" />
                <Text style={styles.noFilterResultsText}>
                  {activeFilter === 'online' ? 'No one is online right now' : 'No users available'}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {displayedUsers.map((user) => (
                  <TouchableOpacity 
                    key={user.id} 
                    style={styles.suggestedCard}
                    onPress={() => handleOpenChat(user)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.suggestedAvatar, { backgroundColor: getAvatarColor(user.username) }]}>
                      <Text style={styles.avatarText}>{user.username[0].toUpperCase()}</Text>
                      {user.isOnline && <View style={styles.onlineBadge} />}
                    </View>
                    <Text style={styles.suggestedName} numberOfLines={1}>{user.username}</Text>
                    <Text style={styles.suggestedHandle} numberOfLines={1}>@{user.username.toLowerCase()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* INVITE BANNER */}
            <View style={styles.inviteBanner}>
              <View style={styles.inviteIconBg}>
                <MaterialCommunityIcons name="account-group" size={24} color="#4DFFB8" />
              </View>
              <View style={styles.inviteTextContent}>
                <Text style={styles.inviteBannerTitle}>Invite your friends</Text>
                <Text style={styles.inviteBannerSub}>Get them on PingUp — chat securely</Text>
              </View>
              <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.85}>
                <Text style={styles.inviteBtnText}>Invite</Text>
              </TouchableOpacity>
            </View>

            {/* QUICK TIP */}
            <View style={styles.quickTipBanner}>
              <View style={styles.tipIconBox}>
                <Ionicons name="bulb" size={18} color="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickTipTitle}>Quick tip</Text>
                <Text style={styles.quickTipSub}>Start typing 2+ characters to search across all PingUp users.</Text>
              </View>
            </View>

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  
  // ===== HEADER =====
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 15,
    gap: 12,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  headerSub: { fontSize: 12.5, color: '#6B6B8A', marginTop: 3, fontWeight: '500' },
  headerBadge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  
  // ===== SEARCH =====
  searchContainer: { paddingHorizontal: 20, paddingBottom: 15 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1A183A', 
    borderRadius: 16, 
    paddingHorizontal: 15, 
    height: 45, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  searchInput: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 15 },

  // ===== RECENT SEARCHES =====
  recentSection: { paddingBottom: 12 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6B6B8A',
    letterSpacing: 1.3,
  },
  recentClearText: {
    color: '#4DACFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recentChipsRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1A183A',
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 5,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  recentChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentChipInitial: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  recentChipText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 90,
  },

  // ===== DASHBOARD =====
  dashboardContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 24, 
    marginBottom: 14 
  },
  sectionTitle: { 
    fontSize: 11.5, 
    fontWeight: '800', 
    color: '#6B6B8A', 
    letterSpacing: 1.3, 
    marginTop: 6, 
    marginBottom: 14 
  },
  sectionTitleNoMargin: { 
    fontSize: 11.5, 
    fontWeight: '800', 
    color: '#6B6B8A', 
    letterSpacing: 1.3 
  },
  seeAllText: { color: '#4DACFF', fontSize: 13, fontWeight: '700' },

  // ===== QUICK ACTIONS =====
  quickActionsGrid: { 
    flexDirection: 'row', 
    gap: 10,
  },
  actionCard: { 
    flex: 1,
    backgroundColor: '#1A183A', 
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16, 
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.04)',
  },
  actionIcon: { 
    width: 42, height: 42, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 10 
  },
  actionText: { 
    color: '#FFF', 
    fontSize: 11.5, 
    fontWeight: '700', 
    textAlign: 'center',
  },

  // ===== PREMIUM FILTER CHIPS =====
  filterChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 2,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(77,172,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(77,172,255,0.22)',
  },
  filterChipAllActive: {
    backgroundColor: '#4DACFF',
    borderColor: '#4DACFF',
    shadowColor: '#4DACFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  filterChipOnline: {
    backgroundColor: 'rgba(77,255,184,0.06)',
    borderColor: 'rgba(77,255,184,0.22)',
  },
  filterChipOnlineActive: {
    backgroundColor: '#4DFFB8',
    borderColor: '#4DFFB8',
    shadowColor: '#4DFFB8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  filterChipIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterChipLabel: {
    color: '#4DACFF',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterChipLabelActive: {
    color: '#12102A',
    fontWeight: '800',
  },
  filterChipCountPill: {
    minWidth: 26,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipCountText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  noFilterResults: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 22,
    paddingHorizontal: 14,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  noFilterResultsText: {
    color: '#6B6B8A',
    fontSize: 12.5,
    fontWeight: '500',
  },

  // ===== SUGGESTED =====
  horizontalScroll: { marginBottom: 24 },
  suggestedCard: { 
    width: 100, 
    backgroundColor: '#1A183A', 
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18, 
    alignItems: 'center', 
    marginRight: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.04)',
  },
  suggestedAvatar: { 
    width: 54, height: 54, borderRadius: 27, 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 10,
    position: 'relative',
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  onlineBadge: { 
    position: 'absolute', 
    bottom: 0, right: 0, 
    width: 14, height: 14, 
    backgroundColor: '#4DFFB8', 
    borderRadius: 7, 
    borderWidth: 2, 
    borderColor: '#1A183A' 
  },
  suggestedName: { 
    color: '#FFF', 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 2,
    textAlign: 'center',
  },
  suggestedHandle: { color: '#6B6B8A', fontSize: 10.5, textAlign: 'center' },

  // ===== INVITE BANNER =====
  inviteBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#1A183A', 
    padding: 16, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(77,255,184,0.12)' 
  },
  inviteIconBg: { 
    width: 44, height: 44, borderRadius: 22, 
    backgroundColor: 'rgba(77, 255, 184, 0.12)', 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 14 
  },
  inviteTextContent: { flex: 1 },
  inviteBannerTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  inviteBannerSub: { color: '#6B6B8A', fontSize: 12, lineHeight: 16 },
  inviteBtn: { 
    backgroundColor: '#4DFFB8', 
    paddingVertical: 9, 
    paddingHorizontal: 16, 
    borderRadius: 10 
  },
  inviteBtnText: { color: '#12102A', fontWeight: '800', fontSize: 12.5 },

  // ===== QUICK TIP =====
  quickTipBanner: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 184, 0, 0.06)', 
    padding: 14, 
    borderRadius: 16, 
    alignItems: 'flex-start', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 184, 0, 0.18)',
    gap: 10,
  },
  tipIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,184,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  quickTipTitle: { color: '#FFB800', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  quickTipSub: { color: '#A0A0C0', fontSize: 12, lineHeight: 17 },

  // ===== SEARCH RESULTS =====
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  resultCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
  },
  resultCountText: {
    color: '#A0A0C0',
    fontSize: 12,
    fontWeight: '600',
  },
  contactCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1A183A', 
    padding: 14, 
    borderRadius: 18, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  avatar: { 
    width: 50, height: 50, borderRadius: 25, 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 14 
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15.5, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  contactDetails: { fontSize: 12.5, color: '#A0A0C0' },
  actionIconBg: { 
    width: 38, height: 38, borderRadius: 19, 
    backgroundColor: 'rgba(77, 172, 255, 0.12)', 
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.2)',
    justifyContent: 'center', alignItems: 'center', 
    marginLeft: 10 
  },

  // Empty state
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -50,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(77, 172, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  // ===== STATES =====
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: '#A0A0C0', fontSize: 13, marginTop: 12, fontWeight: '500' },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 15, color: '#A0A0C0', textAlign: 'center', lineHeight: 22 },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(77,172,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
});