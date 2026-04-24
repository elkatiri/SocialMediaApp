import React from 'react'
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native' 
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/FontAwesome';
import { useFonts as UseFonts, Poppins_400Regular, Poppins_700Bold, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

export default function Welcome() {
  const [fontsLoaded] = UseFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_Bold: Poppins_700Bold,
    Poppins_SemiBold: Poppins_600SemiBold
  });

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require('../../../assets/images/welcoming.png')}
      resizeMode="cover"
      style={styles.background}
    >
      <SafeAreaView style={{ flex: 1 }}>
        
        <View style={styles.Headercontainer}>
          <Icon name="users" size={28} color="black" />
          <Text style={styles.text}>Connectfy</Text>
        </View>

        <View style={styles.startedButtonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  Headercontainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },

  text: {
    fontSize: 24,
    fontFamily: 'Poppins_Bold',
  },

  startedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    alignSelf: 'center',
  },

  button: {
    backgroundColor: '#090909',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_SemiBold',
  },
});