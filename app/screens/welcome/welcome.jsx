import React from 'react';
import {
  ImageBackground, Pressable, StyleSheet,
  Text, View, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold
} from '@expo-google-fonts/poppins';
import { useNavigation } from '@react-navigation/native';

export default function Welcome() {
  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_Bold: Poppins_700Bold,
    Poppins_SemiBold: Poppins_600SemiBold,
  });

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require('../../../assets/images/welcoming.png')}
      resizeMode="cover"
      style={styles.background}
    >
      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <Icon name="users" size={24} color="#fff" />
          <Text style={styles.logoText}>Connectfy</Text>
        </View>

        {/* Bottom content */}
        <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 24 }]}>

          <Text style={styles.tagline}>Connect with{'\n'}the world</Text>
          <Text style={styles.subtitle}>
            Meet new people, share moments,{'\n'}and stay close with everyone.
          </Text>

          {/* Get Started button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { width: Math.min(width * 0.85, 340) },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Icon name="arrow-right" size={18} color="#fff" style={styles.btnIcon} />
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>

          {/* Login link */}
          <Pressable
            style={({ pressed }) => [styles.loginRow, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Sign in</Text>
            </Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const TEAL = '#1D9E75';

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Poppins_Bold',
    letterSpacing: 0.3,
  },

  // Bottom section
  bottomContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  tagline: {
    color: '#fff',
    fontSize: 38,
    fontFamily: 'Poppins_Bold',
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnIcon: {
    marginRight: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
    letterSpacing: 0.2,
  },

  // Login link
  loginRow: {
    paddingVertical: 4,
  },
  loginText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
    textAlign: 'center',
  },
  loginLink: {
    color: '#fff',
    fontFamily: 'Poppins_SemiBold',
  },
});