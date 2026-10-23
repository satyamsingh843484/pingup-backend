import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './src/context/AuthContext';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CallsScreen from './src/screens/CallsScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';
import CallScreen from './src/screens/CallScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AboutScreen from './src/screens/AboutScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import CreateStoryScreen from './src/screens/CreateStoryScreen';
import StoryViewerScreen from './src/screens/StoryViewerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: any = {
  Chats: { on: 'chatbubbles', off: 'chatbubbles-outline' },
  Calls: { on: 'call', off: 'call-outline' },
  Tools: { on: 'apps', off: 'apps-outline' },
  Profile: { on: 'person', off: 'person-outline' },
};

function GlassTabBar({ state, navigation }: any) {
  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      <View style={styles.tabBarShadow}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 60}
          tint="dark"
          style={styles.tabBarBlur}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        >
          <View style={styles.glassHighlight} />
          <View style={styles.tabBarInner}>
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;
              const icon = isFocused ? TAB_ICONS[route.name].on : TAB_ICONS[route.name].off;
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!event.defaultPrevented && !isFocused) navigation.navigate(route.name);
              };
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.8}
                  style={[styles.tabItem, isFocused && styles.tabItemActive]}
                >
                  <Ionicons name={icon} size={22} color={isFocused ? '#4DACFF' : 'rgba(200,200,220,0.7)'} />
                  {isFocused && <Text style={styles.tabLabel}>{route.name}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Chats" component={HomeScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Tools" component={ToolsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken'); 
        if (token) setUserToken(token);
      } catch (error) {
        console.error("Token fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  const authContext = React.useMemo(() => ({
    signIn: async (token: string) => {
      await AsyncStorage.setItem('userToken', token);
      setUserToken(token); 
    },
    signOut: async () => {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null); 
    }
  }), []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#12102A' }}>
        <ActivityIndicator size="large" color="#4DACFF" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContext}>
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right' 
        }}
      >
        {userToken === null ? (
          /* ✨ AGAR TOKEN NAHI HAI TOH SIRF AUTH SCREEN */
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen} 
            options={{ animation: 'fade' }} 
          />
        ) : (
          /* ✨ AGAR TOKEN HAI TOH DIRECT MAIN APP */
          <Stack.Group>
            <Stack.Screen name="Home" component={MainTabNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} options={{ animation: 'slide_from_right', presentation: 'modal' }} />
            <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="CallScreen" component={CallScreen} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="ContactsScreen" component={ContactsScreen} options={{ animation: 'slide_from_right', presentation: 'modal' }} />
            <Stack.Screen name="HelpSupportScreen" component={HelpSupportScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="AboutScreen" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="PrivacySecurityScreen" component={PrivacySecurityScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="CreateStory" component={CreateStoryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false, presentation: 'modal' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  tabBarShadow: { width: '88%', borderRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 20 },
  tabBarBlur: { borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: Platform.OS === 'android' ? 'rgba(26,24,58,0.85)' : 'transparent' },
  glassHighlight: { position: 'absolute', top: 0, left: 20, right: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1 },
  tabBarInner: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 },
  tabItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 28, gap: 6 },
  tabItemActive: { backgroundColor: 'rgba(77,172,255,0.18)', borderWidth: 1, borderColor: 'rgba(77,172,255,0.35)' },
  tabLabel: { color: '#4DACFF', fontSize: 12, fontWeight: '700', marginLeft: 2 },
});