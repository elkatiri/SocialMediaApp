import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold
} from '@expo-google-fonts/poppins';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_SemiBold: Poppins_600SemiBold,
    Poppins_Bold: Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // await registerUser(fullName, email, password);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if(error){
        Alert.alert('Error', 'Registration failed: ' + error.message);
        console.error('Registration error:', error);
        return;
      }
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'Sign in', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Registration failed: ' + error.message);
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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <Icon name="users" size={20} color={TEAL} />
            <Text style={styles.logoText}>Connectfy</Text>
          </View>

          {/* Heading */}
          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>Join Connectfy today</Text>
          </View>

          {/* Full Name */}
          <Text style={styles.label}>FULL NAME</Text>
          <View style={styles.inputRow}>
            <Icon name="user" size={16} color="#aaa" />
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#bbb"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
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
              placeholder="Min. 6 characters"
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

          {/* Confirm Password */}
          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={[
            styles.inputRow,
            confirmPassword.length > 0 && {
              borderColor: confirmPassword === password ? '#1D9E75' : '#E24B4A'
            }
          ]}>
            <Icon name="lock" size={16} color="#aaa" />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#bbb"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              editable={!loading}
            />
            <Pressable onPress={() => setShowConfirm(p => !p)} hitSlop={8}>
              <Icon name={showConfirm ? 'eye-off' : 'eye'} size={16} color="#bbb" />
            </Pressable>
          </View>

          {/* Match hint */}
          {confirmPassword.length > 0 && (
            <Text style={[
              styles.matchHint,
              { color: confirmPassword === password ? TEAL : '#E24B4A' }
            ]}>
              {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
            </Text>
          )}

          {/* Register button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create account'}
            </Text>
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
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
  matchHint: {
    fontSize: 12,
    fontFamily: 'Poppins_Regular',
    marginTop: -10,
    marginBottom: 14,
    marginLeft: 4,
  },
  button: {
    backgroundColor: TEAL,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  loginRow: {
    alignItems: 'center',
  },
  loginText: {
    color: '#aaa',
    fontSize: 13,
    fontFamily: 'Poppins_Regular',
  },
  loginLink: {
    color: TEAL,
    fontFamily: 'Poppins_SemiBold',
  },
});