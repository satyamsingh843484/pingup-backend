import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Linking, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function HelpSupportScreen() {
  const navigation = useNavigation<any>();

  // Direct actions
  const handleEmail = () => {
    Linking.openURL('mailto:satyamsingh843484@gmail.com?subject=PingUp Support & Feedback').catch(() => {
      Alert.alert("Error", "Email not opened.");
    });
  };

  const handleCall = () => {
    Linking.openURL('tel:+918434849565').catch(() => {
      Alert.alert("Error", "Dialer not opened.");
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/918434849565?text=Hello%20PingUp%20Support,%20I%20need%20help.').catch(() => {
      Alert.alert("Error", "WhatsApp open nahi ho paya.");
    });
  };

  const handleFAQ = () => {
    Alert.alert("FAQ", "PingUp is a secure cross-platform real-time chat application built with React Native and Node.js. All messages use end-to-end encryption.");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconContainer}>
            <Ionicons name="headset" size={32} color="#4DACFF" />
          </View>
          <Text style={styles.bannerTitle}>How can we help you today?</Text>
          <Text style={styles.bannerSubtitle}>
            Our support team is available 24/7 to resolve any issues regarding chats, calls, or media sharing.
          </Text>
        </View>

        <Text style={styles.sectionHeader}>Direct Contact Channels</Text>

        {/* 1. Email Support */}
        <TouchableOpacity style={styles.optionCard} onPress={handleEmail}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(77, 172, 255, 0.15)' }]}>
            <Ionicons name="mail-outline" size={22} color="#4DACFF" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Email Support</Text>
            <Text style={styles.optionDesc}>satyamsingh843484@gmail.com (Fast response)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
        </TouchableOpacity>

        {/* 2. Phone Call Support */}
        <TouchableOpacity style={styles.optionCard} onPress={handleCall}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(77, 255, 184, 0.15)' }]}>
            <Ionicons name="call-outline" size={22} color="#4DFFB8" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Helpline Call</Text>
            <Text style={styles.optionDesc}>+91 8434849565 (Mon - Sat)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
        </TouchableOpacity>

        {/* 3. WhatsApp Direct Chat */}
        <TouchableOpacity style={styles.optionCard} onPress={handleWhatsApp}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(37, 211, 102, 0.15)' }]}>
            <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>WhatsApp Support</Text>
            <Text style={styles.optionDesc}>Chat instantly with our agent</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>General Information</Text>

        {/* 4. FAQs */}
        <TouchableOpacity style={styles.optionCard} onPress={handleFAQ}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <Ionicons name="help-circle-outline" size={22} color="#FFB800" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Frequently Asked Questions</Text>
            <Text style={styles.optionDesc}>Learn more about PingUp security & features</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
        </TouchableOpacity>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>PingUp Secure Infrastructure • v2.4.0</Text>
        </View>

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
  
  bannerCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  bannerIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(77, 172, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  bannerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  bannerSubtitle: { color: '#A0A0C0', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  sectionHeader: { color: '#6B6B8A', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginTop: 5 },
  
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionInfo: { flex: 1 },
  optionTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  optionDesc: { color: '#A0A0C0', fontSize: 12 },

  footerInfo: { alignItems: 'center', marginTop: 25, marginBottom: 40 },
  footerText: { color: '#4A4870', fontSize: 12, fontWeight: '600' }
});