import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function AIAssistantScreen() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { id: 1, text: "Hi! I'm PingUp AI ✨ Ask me to summarize chats, draft messages, translate, or plan your day.", me: false },
  ]);

  const send = () => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), text, me: true }]);
    const userQ = text;
    setText('');
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: `Sure! Here's my take on "${userQ}"... (demo reply)`, me: false }]);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.aiAvatar}><Ionicons name="sparkles" size={18} color="#4DACFF" /></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.title}>PingUp AI</Text>
            <Text style={styles.sub}>Always online ✨</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="refresh" size={20} color="#4DACFF" /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          <View style={styles.suggestRow}>
            {['Summarize chats', 'Draft message', 'Translate', 'Plan day'].map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestChip} onPress={() => setText(s)}>
                <Text style={styles.suggestText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {messages.map(m => (
            <View key={m.id} style={[styles.msgRow, { justifyContent: m.me ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.bubble, m.me ? styles.bubbleMe : styles.bubbleAI]}>
                <Text style={[styles.msgText, { color: m.me ? '#12102A' : '#fff' }]}>{m.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="Ask anything..." placeholderTextColor="#6B6B8A" value={text} onChangeText={setText} multiline />
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Ionicons name="arrow-up" size={20} color="#12102A" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 8 },
  aiAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(77,172,255,0.15)', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sub: { color: '#4DFFB8', fontSize: 11, fontWeight: '600' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  suggestChip: { backgroundColor: 'rgba(77,172,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(77,172,255,0.3)' },
  suggestText: { color: '#4DACFF', fontSize: 12, fontWeight: '600' },
  msgRow: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#4DACFF', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(77,172,255,0.15)' },
  msgText: { fontSize: 14, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  inputWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { color: '#fff', fontSize: 14, maxHeight: 100, paddingVertical: 0 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center' },
});