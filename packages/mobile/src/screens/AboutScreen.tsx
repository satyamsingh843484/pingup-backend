import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function AboutScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About PingUp</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* App Logo & Version Card */}
        <View style={styles.brandCard}>
          <View style={styles.logoContainer}>
            <Ionicons name="chatbubbles" size={40} color="#12102A" />
          </View>
          <Text style={styles.brandName}>PingUp</Text>
          <Text style={styles.brandVersion}>Version 2.4.0 (Beta)</Text>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>SECURE MESSAGING</Text>
          </View>
        </View>

        {/* Trust & Security Section (End-to-End Encryption Highlight) */}
        <View style={styles.securityBox}>
          <View style={styles.securityHeaderRow}>
            <Ionicons name="shield-checkmark" size={24} color="#4DFFB8" />
            <Text style={styles.securityTitle}>End-to-End Encrypted</Text>
          </View>
          <Text style={styles.securityDesc}>
            Your personal messages, media, and voice/video calls are secured with industry-standard cryptographic protocols. No one outside of your chats—not even PingUp—can read or listen to them.
          </Text>
        </View>

        {/* Core Features / Trust Points */}
        <Text style={styles.sectionHeader}>Why Trust PingUp?</Text>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(77, 172, 255, 0.15)' }]}>
            <Ionicons name="flash-outline" size={20} color="#4DACFF" />
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>Lightning Fast & Real-Time</Text>
            <Text style={styles.featureDesc}>Powered by optimized WebSockets and Node.js backend for zero-delay message delivery.</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <MaterialCommunityIcons name="cloud-lock-outline" size={20} color="#FFB800" />
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>Cloud Media Integration</Text>
            <Text style={styles.featureDesc}>Seamless photo and media sharing backed by secure cloud storage infrastructure.</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(155, 89, 182, 0.15)' }]}>
            <Ionicons name="code-slash-outline" size={20} color="#9B59B6" />
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>Crafted with Excellence</Text>
            <Text style={styles.featureDesc}>Designed and developed independently to provide a pristine, ad-free user experience.</Text>
          </View>
        </View>

        {/* Developer Credit Footer */}
        <View style={styles.developerCard}>
          <Text style={styles.devLabel}>DESIGNED & ENGINEERED BY</Text>
          <Text style={styles.devName}>Satyam Kumar</Text>
          <Text style={styles.devSub}>KL University • Cloud Infrastructure Track</Text>
        </View>

        <View style={styles.footerSpacing} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12102A' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: '#1A183A', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  scrollContent: { padding: 20 },

  brandCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 25, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  logoContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#4DACFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#4DACFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  brandName: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  brandVersion: { color: '#A0A0C0', fontSize: 13, marginBottom: 12 },
  tagBadge: { backgroundColor: 'rgba(77, 255, 184, 0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  tagText: { color: '#4DFFB8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  securityBox: { backgroundColor: 'rgba(77, 255, 184, 0.05)', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(77, 255, 184, 0.2)' },
  securityHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  securityTitle: { color: '#4DFFB8', fontSize: 16, fontWeight: 'bold' },
  securityDesc: { color: '#C0C0D0', fontSize: 13, lineHeight: 20 },

  sectionHeader: { color: '#6B6B8A', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginTop: 5 },

  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  featureIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureInfo: { flex: 1 },
  featureTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  featureDesc: { color: '#A0A0C0', fontSize: 12, lineHeight: 16 },

  developerCard: { backgroundColor: 'rgba(77, 172, 255, 0.04)', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: 'rgba(77, 172, 255, 0.15)' },
  devLabel: { color: '#6B6B8A', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  devName: { color: '#4DACFF', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  devSub: { color: '#A0A0C0', fontSize: 12 },

  footerSpacing: { height: 40 }
});