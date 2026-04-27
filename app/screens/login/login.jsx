import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Text,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_SemiBold: Poppins_600SemiBold,
    Poppins_Bold: Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      console.log('Login attempt:', { email, password });
      // await loginUser(email, password);
    } catch (error) {
      alert('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
        {/*Arrow back */}
         <Pressable style={{ position: 'absolute', top: 16, left: 16 }} onPress={() => navigation.goBack()} hitSlop={8}>
            <Icon name="arrow-left" size={20} color="#111" />
        </Pressable>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Icon name="users" size={20} color={TEAL} />
          <Text style={styles.logoText}>Connectfy</Text>
        </View>

        {/* Heading */}
        <View style={styles.headingBlock}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to your account</Text>
        </View>

        {/* Email */}
        <Text style={styles.label}>EMAIL</Text>
        <View style={styles.inputRow}>
          <Icon name="mail" size={16} color="#aaa" />
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.inputRow}>
          <Icon name="lock" size={16} color="#aaa" />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#bbb"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} color="#bbb" />
          </Pressable>
        </View>

        {/* Forgot */}
        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign in button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
            <AntDesign name="google" size={18} color="#EA4335" />
            <Text style={styles.googleText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.appleBtn} activeOpacity={0.8}>
            <FontAwesome name="apple" size={18} color="#fff" />
            <Text style={styles.appleText}>Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Sign up */}
        <TouchableOpacity
          style={styles.signupRow}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.signupText}>
            Don't have an account?{' '}
            <Text style={styles.signupLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const TEAL = '#1D9E75';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 36,
  },
  logoText: {
    color: '#111',
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
  },
  headingBlock: {
    marginBottom: 28,
  },
  heading: {
    color: '#111',
    fontSize: 24,
    fontFamily: 'Poppins_Bold',
  },
  subheading: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
    marginTop: 2,
  },
  label: {
    color: '#555',
    fontSize: 11,
    fontFamily: 'Poppins_SemiBold',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#111',
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    color: TEAL,
    fontSize: 12,
    fontFamily: 'Poppins_SemiBold',
  },
  button: {
    backgroundColor: TEAL,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_SemiBold',
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#efefef',
  },
  dividerText: {
    color: '#bbb',
    fontSize: 12,
    fontFamily: 'Poppins_Regular',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  googleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    height: 48,
  },
  googleText: {
    color: '#333',
    fontSize: 13,
    fontFamily: 'Poppins_SemiBold',
  },
  appleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    borderRadius: 10,
    height: 48,
  },
  appleText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins_SemiBold',
  },
  signupRow: {
    alignItems: 'center',
  },
  signupText: {
    color: '#aaa',
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
  },
  signupLink: {
    color: TEAL,
    fontFamily: 'Poppins_SemiBold',
  },
});