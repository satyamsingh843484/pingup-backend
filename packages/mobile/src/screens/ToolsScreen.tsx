import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ToolsScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Tools</Text>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="options-outline" size={20} color="#fff" /></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.aiCard} onPress={() => navigation.navigate('AIAssistant')}>
          <View style={styles.aiIconBox}><Ionicons name="sparkles" size={22} color="#4DACFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>PingUp AI Assistant</Text>
            <Text style={styles.aiDesc}>Summaries, drafts, translate ✨</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4DACFF" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Stories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <TouchableOpacity style={styles.storyItem}>
            <View style={styles.storyAddRing}><Ionicons name="add" size={26} color="#4DACFF" /></View>
            <Text style={styles.storyName}>Add</Text>
          </TouchableOpacity>
          {[
            { name: 'Aman', color: '#4DACFF', viewed: false }, { name: 'Sneha', color: '#4DFFB8', viewed: false },
            { name: 'Rahul', color: '#FFB800', viewed: true }, { name: 'Priya', color: '#9B59B6', viewed: false },
            { name: 'Karan', color: '#FF6B6B', viewed: true },
          ].map((s, i) => (
            <TouchableOpacity key={i} style={styles.storyItem}>
              <View style={[styles.storyRing, { borderColor: s.viewed ? '#3A3860' : s.color }]}>
                <View style={[styles.storyAvatar, { backgroundColor: s.color }]}>
                  <Text style={styles.storyInitial}>{s.name[0]}</Text>
                </View>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>🏆 Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {[
            { icon: 'flame', label: 'Streak Master', sub: '7 days', color: '#FFB800', locked: false },
            { icon: 'chatbubbles', label: 'Chatterbox', sub: '500 msgs', color: '#4DACFF', locked: false },
            { icon: 'heart', label: 'Heart Reactor', sub: '100 ❤️', color: '#FF6B6B', locked: false },
            { icon: 'shield-checkmark', label: 'Privacy Pro', sub: 'Locked', color: '#6B6B8A', locked: true },
            { icon: 'star', label: 'Early Bird', sub: 'Locked', color: '#6B6B8A', locked: true },
          ].map((b, i) => (
            <View key={i} style={[styles.achieveCard, b.locked && { opacity: 0.5 }]}>
              <View style={[styles.achieveIcon, { backgroundColor: `${b.color}26` }]}>
                <Ionicons name={b.icon as any} size={20} color={b.color} />
              </View>
              <Text style={styles.achieveLabel}>{b.label}</Text>
              <Text style={styles.achieveSub}>{b.sub}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.quoteCard}>
          <Ionicons name="chatbox-ellipses" size={22} color="#4DFFB8" style={{ opacity: 0.5 }} />
          <Text style={styles.quoteText}>"Small conversations build strong relationships."</Text>
          <Text style={styles.quoteAuthor}>— PingUp Daily</Text>
        </View>

        <Text style={styles.sectionTitle}>🎂 Upcoming Events</Text>
        <View style={styles.eventCard}>
          <View style={[styles.eventIcon, { backgroundColor: 'rgba(255,184,0,0.15)' }]}>
            <Ionicons name="gift" size={20} color="#FFB800" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>Sneha's Birthday</Text>
            <Text style={styles.eventDesc}>Tomorrow • Send wishes 🎉</Text>
          </View>
          <TouchableOpacity style={styles.eventBtn}><Text style={styles.eventBtnText}>Wish</Text></TouchableOpacity>
        </View>
        <View style={[styles.eventCard, { marginTop: 10 }]}>
          <View style={[styles.eventIcon, { backgroundColor: 'rgba(77,172,255,0.15)' }]}>
            <Ionicons name="calendar" size={20} color="#4DACFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>Team Sync Call</Text>
            <Text style={styles.eventDesc}>Today 5:00 PM • 5 members</Text>
          </View>
          <TouchableOpacity style={styles.eventBtn}><Text style={styles.eventBtnText}>Join</Text></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.scheduleCard}>
          <Ionicons name="time" size={20} color="#9B59B6" />
          <View style={{ flex: 1 }}>
            <Text style={styles.scheduleTitle}>2 scheduled messages</Text>
            <Text style={styles.scheduleDesc}>Next: "Good morning" at 8:00 AM</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>🔥 Trending</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['#DevTalk', '#FamilyTime', '#WeekendVibes', '#TechNews'].map((t, i) => (
            <TouchableOpacity key={i} style={styles.trendTag}>
              <Text style={styles.trendText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(77,172,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(77,172,255,0.25)' },
  aiIconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(77,172,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  aiTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  aiDesc: { color: '#A0A0C0', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 },
  storyItem: { alignItems: 'center', marginRight: 12, width: 62 },
  storyRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', padding: 2, marginBottom: 6 },
  storyAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  storyInitial: { color: '#12102A', fontSize: 18, fontWeight: '800' },
  storyAddRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(77,172,255,0.4)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  storyName: { color: '#A0A0C0', fontSize: 11, fontWeight: '600' },
  achieveCard: { width: 110, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 12, marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  achieveIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  achieveLabel: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  achieveSub: { color: '#6B6B8A', fontSize: 10, fontWeight: '600' },
  quoteCard: { backgroundColor: 'rgba(77,255,184,0.06)', borderRadius: 18, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(77,255,184,0.15)', borderStyle: 'dashed' },
  quoteText: { color: '#E0E0F0', fontSize: 13, fontStyle: 'italic', marginTop: 8, lineHeight: 19, fontWeight: '500' },
  quoteAuthor: { color: '#4DFFB8', fontSize: 11, fontWeight: '700', marginTop: 8, textAlign: 'right' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  eventIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  eventTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  eventDesc: { color: '#A0A0C0', fontSize: 11 },
  eventBtn: { backgroundColor: 'rgba(77,172,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  eventBtnText: { color: '#4DACFF', fontSize: 11, fontWeight: '700' },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(155,89,182,0.08)', borderRadius: 16, padding: 14, marginTop: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(155,89,182,0.2)' },
  scheduleTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  scheduleDesc: { color: '#A0A0C0', fontSize: 11 },
  trendTag: { backgroundColor: 'rgba(155,89,182,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'rgba(155,89,182,0.3)' },
  trendText: { color: '#B07ACC', fontWeight: '700', fontSize: 13 },
});