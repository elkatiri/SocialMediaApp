import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Switch,
  Alert,
  SafeAreaView 
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import Icon from 'react-native-vector-icons/Feather';
import { supabase } from '@/lib/supabase';

export default function Setting({ navigation }) {
  const [user, setUser] = useState(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              navigation.replace('Login'); // Navigate to login screen
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out');
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              // Call your API to delete user account
              const { error } = await supabase.auth.admin.deleteUser(user.id);
              if (error) throw error;
              navigation.replace('Login');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        { icon: "user", label: "Edit Profile", onPress: handleEditProfile },
        { icon: "lock", label: "Privacy", onPress: () => Alert.alert("Privacy Settings", "Coming soon") },
        { icon: "shield", label: "Security", onPress: () => Alert.alert("Security Settings", "Coming soon") },
        { icon: "bell", label: "Notifications", component: "switch", value: notifications, onValueChange: setNotifications },
        { icon: "eye", label: "Private Account", component: "switch", value: privateAccount, onValueChange: setPrivateAccount },
      ]
    },
    {
      title: "Preferences",
      items: [
        { icon: "moon", label: "Dark Mode", component: "switch", value: darkMode, onValueChange: setDarkMode },
        { icon: "globe", label: "Language", onPress: () => Alert.alert("Language", "Coming soon"), value: "English" },
        { icon: "volume-2", label: "Sound", onPress: () => Alert.alert("Sound Settings", "Coming soon") },
        { icon: "download", label: "Storage", onPress: () => Alert.alert("Storage Settings", "Coming soon"), value: "1.2 GB used" },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle", label: "Help Center", onPress: () => Alert.alert("Help Center", "Coming soon") },
        { icon: "message-square", label: "Contact Us", onPress: () => Alert.alert("Contact Support", "support@connectfy.com") },
        { icon: "file-text", label: "Terms of Service", onPress: () => Alert.alert("Terms of Service", "Coming soon") },
        { icon: "lock", label: "Privacy Policy", onPress: () => Alert.alert("Privacy Policy", "Coming soon") },
        { icon: "star", label: "Rate Us", onPress: () => Alert.alert("Rate Us", "Thank you for your feedback!") },
      ]
    },
    {
      title: "Actions",
      items: [
        { icon: "log-out", label: "Log Out", onPress: handleLogout, danger: true },
        { icon: "trash-2", label: "Delete Account", onPress: handleDeleteAccount, danger: true },
      ]
    },
  ];

  const renderSettingItem = (item, index) => {
    if (item.component === "switch") {
      return (
        <View key={index} style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name={item.icon} size={22} color={item.danger ? "#ff3b30" : "#333"} />
            <Text style={[styles.settingLabel, item.danger && styles.dangerText]}>
              {item.label}
            </Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: "#D3D3D3", true: "#1D9E75" }}
            thumbColor="#fff"
          />
        </View>
      );
    }

    return (
      <Pressable
        key={index}
        style={({ pressed }) => [
          styles.settingItem,
          pressed && styles.settingItemPressed
        ]}
        onPress={item.onPress}
      >
        <View style={styles.settingLeft}>
          <Icon name={item.icon} size={22} color={item.danger ? "#ff3b30" : "#333"} />
          <Text style={[styles.settingLabel, item.danger && styles.dangerText]}>
            {item.label}
          </Text>
        </View>
        <View style={styles.settingRight}>
          {item.value && typeof item.value === 'string' && <Text style={styles.settingValue}>{item.value}</Text>}
          {!item.component && <Icon name="chevron-right" size={20} color="#CCC" />}
        </View>
      </Pressable>
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your preferences</Text>
        </View>

        {/* User Profile Section */}
        {user && (
          <Pressable style={styles.profileSection} onPress={handleEditProfile}>
            <View style={styles.avatarContainer}>
              <Icon name="user" size={32} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <Icon name="edit-2" size={18} color="#1D9E75" />
          </Pressable>
        )}

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },

  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: "#000",
    marginBottom: 4,
  },

  headerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#8E8E93",
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1D9E75",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#000",
    marginBottom: 2,
  },

  profileEmail: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#8E8E93",
  },

  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },

  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },

  sectionContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  settingItemPressed: {
    backgroundColor: "#F8F9FA",
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  settingLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: "#000",
  },

  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  settingValue: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#8E8E93",
  },

  dangerText: {
    color: "#ff3b30",
  },

  versionContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },

  versionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#C7C7CC",
  },
});