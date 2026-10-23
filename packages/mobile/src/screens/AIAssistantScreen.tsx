import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const SUGGESTIONS = [
  { icon: 'document-text-outline', label: 'Summarize chats', color: '#4DACFF' },
  { icon: 'create-outline', label: 'Draft a reply', color: '#4DFFB8' },
  { icon: 'language-outline', label: 'Translate text', color: '#FFB800' },
  { icon: 'calendar-outline', label: 'Plan my day', color: '#9B59B6' },
];

const QUICK_REPLIES = ['Tell me more', 'Summarize', 'Translate to Hindi', 'Regenerate'];

export default function AIAssistantScreen() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      text: "Hi! I'm PingUp AI ✨ Ask me to summarize chats, draft messages, translate, or plan your day.",
      me: false,
      time: Date.now(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<any>(null);
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!isTyping) return;
    const loop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = loop(dot1, 0);
    const a2 = loop(dot2, 150);
    const a3 = loop(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [isTyping]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 80);
  };

  const send = (overrideText?: string) => {
    const message = (overrideText ?? text).trim();
    if (!message || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: message, me: true, time: Date.now() },
    ]);
    setText('');
    setIsTyping(true);
    scrollToBottom();

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `Sure! Here's my take on "${message}"... (demo reply)`,
          me: false,
          time: Date.now(),
        },
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scrollToBottom();
    }, 1500);
  };

  const handleClear = () => {
    Haptics.selectionAsync();
    setMessages([
      {
        id: Date.now(),
        text: "Chat cleared! Fresh start ✨ How can I help you today?",
        me: false,
        time: Date.now(),
      },
    ]);
  };

  const handleCopy = () => {
    Haptics.selectionAsync();
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 1}
>
        {/* ===== HEADER (matched to ChatDetail) ===== */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.aiAvatarOuter}>
            <View style={styles.aiAvatarInner}>
              <Ionicons name="sparkles" size={18} color="#4DACFF" />
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>PingUp AI</Text>
              <View style={styles.proChip}>
                <Ionicons name="star" size={9} color="#12102A" />
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={styles.onlineDot} />
              <Text style={styles.sub}>Always online</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={handleClear}>
            <Ionicons name="refresh" size={18} color="#4DACFF" />
          </TouchableOpacity>
        </View>

        {/* ===== CHAT AREA ===== */}
        <Animated.View style={{ flex: 1, opacity: fadeIn }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {messages.length <= 1 && (
              <View style={styles.suggestBlock}>
                <Text style={styles.suggestLabel}>Try asking</Text>
                <View style={styles.suggestGrid}>
                  {SUGGESTIONS.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestCard}
                      onPress={() => {
                        Haptics.selectionAsync();
                        send(s.label);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.suggestIcon, { backgroundColor: `${s.color}22` }]}>
                        <Ionicons name={s.icon as any} size={16} color={s.color} />
                      </View>
                      <Text style={styles.suggestCardText} numberOfLines={2}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((m, idx) => (
              <View
                key={m.id ?? idx}
                style={[
                  styles.msgRow,
                  { justifyContent: m.me ? 'flex-end' : 'flex-start' },
                ]}
              >
                {!m.me && (
                  <View style={styles.msgAvatar}>
                    <Ionicons name="sparkles" size={14} color="#4DACFF" />
                  </View>
                )}

                <View style={{ maxWidth: '78%' }}>
                  <View style={[styles.bubble, m.me ? styles.bubbleMe : styles.bubbleAI]}>
                    <Text style={[styles.msgText, m.me ? styles.myMessageText : styles.theirMessageText]}>
                      {m.text}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.metaRow,
                      { justifyContent: m.me ? 'flex-end' : 'flex-start' },
                    ]}
                  >
                    <Text style={styles.timeText}>{formatTime(m.time)}</Text>
                    {m.me ? (
                      <Ionicons
                        name="checkmark-done"
                        size={12}
                        color="#4DFFB8"
                        style={{ marginLeft: 4 }}
                      />
                    ) : (
                      <>
                        <TouchableOpacity onPress={handleCopy} style={styles.actionIcon}>
                          <Ionicons name="copy-outline" size={11} color="#6B6B8A" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon}>
                          <Ionicons name="thumbs-up-outline" size={11} color="#6B6B8A" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon}>
                          <Ionicons name="thumbs-down-outline" size={11} color="#6B6B8A" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {isTyping && (
              <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
                <View style={styles.msgAvatar}>
                  <Ionicons name="sparkles" size={14} color="#4DACFF" />
                </View>
                <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                  <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
                  <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
                  <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
                </View>
              </View>
            )}

            {!isTyping && messages.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickRepliesRow}
                contentContainerStyle={{ gap: 8, paddingRight: 16 }}
              >
                {QUICK_REPLIES.map((qr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickReplyChip}
                    onPress={() => send(qr)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickReplyText}>{qr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>

        {/* ===== INPUT BAR (matched to ChatDetail) ===== */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={22} color="#4DACFF" />
          </TouchableOpacity>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything..."
              placeholderTextColor="#6B6B8A"
              value={text}
              onChangeText={setText}
              multiline
              editable={!isTyping}
            />
          </View>

          {text.trim().length > 0 ? (
            <TouchableOpacity
              style={[styles.sendBtn, isTyping && { opacity: 0.5 }]}
              onPress={() => send()}
              disabled={isTyping}
            >
              <Ionicons name="arrow-up" size={20} color="#12102A" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micBtn}>
              <Ionicons name="mic" size={20} color="#6B6B8A" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },

  // ✅ HEADER — matched to ChatDetail
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#1A183A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    gap: 6,
  },
  backBtn: { padding: 4 },
  aiAvatarOuter: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(77,172,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.25)',
    marginLeft: 4,
  },
  aiAvatarInner: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(77,172,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  proChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FFB800',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  proText: { color: '#12102A', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  sub: { color: '#4DFFB8', fontSize: 11, fontWeight: '600' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4DFFB8' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Chat area
  chatContent: { padding: 16, gap: 12 },

  // Suggestion cards — unchanged
  suggestBlock: { marginBottom: 12 },
  suggestLabel: {
    color: '#6B6B8A', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10,
  },
  suggestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestCard: {
    width: (width - 40 - 8) / 2,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  suggestIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  suggestCardText: { flex: 1, color: '#E0E0F0', fontSize: 12, fontWeight: '600' },

  // Message row
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(77,172,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },

  // ✅ BUBBLES — matched to ChatDetail
  bubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: '#4DACFF', borderBottomRightRadius: 5 },
  bubbleAI: {
    backgroundColor: '#1A183A',
    borderBottomLeftRadius: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFF' },
  theirMessageText: { color: '#E0E0F0' },

  // Meta row — unchanged
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 5, paddingHorizontal: 2, gap: 6,
  },
  // ✅ TIME TEXT — matched to ChatDetail
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  actionIcon: { padding: 2 },

  // Typing indicator — unchanged
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4DACFF' },

  // Quick replies — unchanged
  quickRepliesRow: { marginTop: 4, marginLeft: 34 },
  quickReplyChip: {
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.3)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16,
  },
  quickReplyText: { color: '#4DACFF', fontSize: 12, fontWeight: '600' },

  // ✅ INPUT BAR — matched to ChatDetail (kept your paddingVertical: 25)
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 25,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#1A183A',
  },
  attachBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(77,172,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(77,172,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  // ✅ INPUT WRAP — matched to ChatDetail input style
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
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#4DACFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  micBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
});