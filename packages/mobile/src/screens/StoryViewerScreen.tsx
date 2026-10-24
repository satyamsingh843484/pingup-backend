// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Platform,  Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userStories, isMyStory } = route.params; 
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cancelTapLock = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const currentStory = userStories[currentIndex];
    
      const getFontFamily = (fontId: string) => {
    switch (fontId) {
      case 'poppins': return 'Poppins_400Regular';
      case 'playfair': return 'PlayfairDisplay_700Bold';
      case 'roboto-mono': return 'RobotoMono_400Regular';
      case 'pacifico': return 'Pacifico_400Regular';
      case 'oswald': return 'Oswald_700Bold';
      case 'montserrat': return 'Montserrat_700Bold';
      case 'lobster': return 'Lobster_400Regular';
      case 'dancing': return 'DancingScript_700Bold';
      default: return undefined; // System Default
    }
  };

  useEffect(() => {
    if (showDeleteConfirm) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [showDeleteConfirm]);

  // ✨ LOGIC UNTOUCHED (100% SAME)
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`https://pingup-backend-v25a.onrender.com/api/stories/delete/${currentStory.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      const json = await res.json();
      
      if(json.success) {
        setShowDeleteConfirm(false);
        navigation.goBack(); 
      } else {
        setShowDeleteConfirm(false);
        alert("Delete Failed: " + (json.error || "Kuch galat hua"));
      }
    } catch(e) {
      console.error(e);
      setShowDeleteConfirm(false);
      alert("Network Error: Server se connect nahi ho paya");
    } finally {
      setIsDeleting(false);
    }
  };

  // ✨ LOGIC UNTOUCHED
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000, 
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNextStory();
      }
    });
  }, [currentIndex]); 

  const storyExitLock = useRef(false);

const goToNextStory = () => {
  if (storyExitLock.current) return;

  if (currentIndex < userStories.length - 1) {
    setCurrentIndex(prev => prev + 1);
  } else {
    storyExitLock.current = true;

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home' as never);
    }
  }
};

  const goToPrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      progress.setValue(0); 
    }
  };

  const handleScreenTap = (evt: any) => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      goToPrevStory(); 
    } else {
      goToNextStory(); 
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentStory.backgroundColor || '#12102A' }]}>
      
      {/* 1. Multi-Segment Progress Bars */}
      <View style={styles.progressBarContainer}>
        {userStories.map((_: any, index: number) => {
          const barWidth = index === currentIndex 
            ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
            : (index < currentIndex ? '100%' : '0%');

          return (
            <View key={index} style={styles.progressSegment}>
              <Animated.View style={[styles.progressBar, { width: barWidth }]} />
            </View>
          );
        })}
      </View>

      {/* 2. Floating Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(currentStory.user?.username || currentStory.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>
            {currentStory.user?.username || currentStory.username || 'User'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {isMyStory && (
            <TouchableOpacity 
              onPress={() => setShowDeleteConfirm(!showDeleteConfirm)} 
              disabled={isDeleting} 
              style={[styles.iconBtn, showDeleteConfirm && { backgroundColor: 'rgba(255,107,107,0.2)' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

            {/* 3. Tap to Change Story Area */}
      <TouchableWithoutFeedback onPress={handleScreenTap}>
        <View style={styles.contentContainer}>
        <Text 
            style={[
                styles.storyText, 
                { fontFamily: getFontFamily(currentStory.fontFamily || 'default') } 
            ]}
        >
            {currentStory.content}
        </Text>
        </View>
      </TouchableWithoutFeedback>

      {/* 4. ✨ PREMIUM FLOATING DELETE PILL (Same Transparent for Web & Mobile) */}
      <Animated.View 
        style={[
          styles.deletePillContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
        pointerEvents={showDeleteConfirm ? 'auto' : 'none'} 
      >
        <View style={styles.deletePill}>
          <Text style={styles.deletePillText}>Delete Story?</Text>
          <View style={styles.deletePillDivider} />
          
          
<TouchableOpacity 
  style={styles.pillActionBtn} 
  onPress={() => {
    if (cancelTapLock.current) return;

    cancelTapLock.current = true;
    setShowDeleteConfirm(false);

    setTimeout(() => {
      cancelTapLock.current = false;
    }, 300);
  }}
  activeOpacity={0.7}
>
  <Text style={styles.pillCancelText}>Cancel</Text>
</TouchableOpacity>

          
          <View style={styles.deletePillDivider} />
          
          <TouchableOpacity 
            style={styles.pillActionBtn} 
            onPress={confirmDelete} 
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <Text style={styles.pillDeleteText}>{isDeleting ? '...' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // ===== PROGRESS BAR =====
  progressBarContainer: { 
    flexDirection: 'row', 
    width: '92%', 
    alignSelf: 'center', 
    marginTop: Platform.OS === 'android' ? 45 : 15, 
    justifyContent: 'space-between',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  progressSegment: { 
    flex: 1, 
    height: 3, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    borderRadius: 2, 
    marginHorizontal: 2, 
    overflow: 'hidden' 
  },
  progressBar: { height: '100%', backgroundColor: '#FFF', borderRadius: 2 },

  // ===== HEADER =====
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    alignItems: 'center', 
    position: 'absolute', 
    top: Platform.OS === 'android' ? 65 : 35, 
    width: '100%', 
    zIndex: 10 
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 42, height: 42, borderRadius: 21, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  username: { 
    color: '#FFF', fontSize: 15, fontWeight: '700', 
    textShadowColor: 'rgba(0, 0, 0, 0.8)', 
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 4 
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  iconBtn: { 
    padding: 6, 
    borderRadius: 16,
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },

  // ===== CONTENT =====
  contentContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30,
    zIndex: 5
  },
  storyText: { 
    color: '#FFF', 
    fontSize: 34, 
    fontWeight: '800', 
    textAlign: 'center',
    lineHeight: 44,
    textShadowColor: 'rgba(0, 0, 0, 0.4)', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 8 
  },

  // ===== PREMIUM FLOATING DELETE PILL =====
  deletePillContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
    zIndex: 999,
  },
  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    
    // ✨ DONO KE LIYE TRANSPARENT BACKGROUND (Opacity 0.4)
    backgroundColor: 'rgba(20, 18, 40, 0.4)', 
    
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', // Thoda bright border transparency ke liye
    paddingHorizontal: 10,
    height: 50,
    
    // ✨ Web ke liye Glass blur aur Native ke liye Shadow
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 8,
    })
  },
  deletePillText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    userSelect: 'none',
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Text readable rahe iske liye
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deletePillDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillActionBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    height: '100%',
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },
  pillCancelText: {
    color: '#E0E0F0',
    fontSize: 13,
    fontWeight: '600',
    userSelect: 'none',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pillDeleteText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '800',
    userSelect: 'none',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});