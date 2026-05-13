import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/ensureUserProfile';
import { uploadPostImage } from '@/lib/uploadPostImage';

const TEAL = '#1D9E75';

export default function AddPost({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [content, setContent] = useState('');
  const [localImageUri, setLocalImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  const canPost = useMemo(() => {
    return !submitting && content.trim().length > 0;
  }, [content, submitting]);

  if (!fontsLoaded) return null;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setLocalImageUri(asset.uri);
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Error', 'Failed to pick an image.');
    }
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      Alert.alert('Missing content', 'Write something before posting.');
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in to create a post.');
        navigation?.navigate?.('Login');
        return;
      }

      await ensureUserProfile(user);

      let finalImageUrl = null;
      if (localImageUri) {
        // Store the storage object path in the DB; Home will resolve it to a signed/public URL.
        finalImageUrl = await uploadPostImage({
          userId: user.id,
          localUri: localImageUri,
        });
      }

      const { error } = await supabase.from('posts').insert({
        content: trimmedContent,
        image_url: finalImageUrl,
        user_id: user.id,
      });

      if (error) throw error;

      setContent('');
      setLocalImageUri(null);
      Alert.alert('Posted', 'Your post has been created.');
      navigation?.navigate?.('Home');
    } catch (error) {
      const rawMessage =
        typeof error?.message === 'string' ? error.message : 'Failed to create post.';

      const message = /row level security|rls|permission denied|not authorized/i.test(
        rawMessage
      )
        ? `${rawMessage}\n\nThis usually means Row Level Security is blocking inserts. Add an INSERT policy on posts (user_id = auth.uid()).`
        : rawMessage;

      setErrorText(message);
      Alert.alert('Error', message);
      console.error('AddPost submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="edit-3" size={20} color={TEAL} />
          <Text style={styles.headerTitle}>New Post</Text>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canPost}
          style={({ pressed }) => [
            styles.postButton,
            !canPost && styles.postButtonDisabled,
            pressed && canPost && styles.postButtonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>PHOTO</Text>
          {localImageUri ? (
            <View style={styles.imageCard}>
              <Image source={{ uri: localImageUri }} style={styles.previewImage} />
              <View style={styles.imageActions}>
                <Pressable
                  onPress={pickImage}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && !submitting && styles.secondaryButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Change</Text>
                </Pressable>
                <Pressable
                  onPress={() => setLocalImageUri(null)}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && !submitting && styles.secondaryButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              disabled={submitting}
              style={({ pressed }) => [
                styles.pickImageRow,
                pressed && !submitting && styles.pickImageRowPressed,
              ]}
            >
              <Icon name="image" size={18} color={TEAL} style={styles.rowIcon} />
              <Text style={styles.pickImageText}>Choose a photo</Text>
            </Pressable>
          )}

          <Text style={styles.label}>CONTENT</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              placeholderTextColor="#BDBDBD"
              multiline
              editable={!submitting}
              textAlignVertical="top"
            />
          </View>

          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.hintRow}>
            <Icon name="info" size={14} color="#8E8E93" style={styles.rowIconSmall} />
            <Text style={styles.hintText}>
              Photo upload uses Supabase Storage (bucket “post-images” by default).
              Set EXPO_PUBLIC_POSTS_BUCKET to change it.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#111',
    marginLeft: 8,
  },

  postButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: TEAL,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postButtonPressed: {
    opacity: 0.9,
  },

  postButtonDisabled: {
    backgroundColor: '#B7D9CF',
  },

  postButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },

  content: {
    padding: 16,
  },

  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#666',
    marginTop: 14,
    marginBottom: 8,
  },

  pickImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  pickImageRowPressed: {
    opacity: 0.85,
  },

  pickImageText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#111',
  },

  imageCard: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    overflow: 'hidden',
  },

  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E8E8E8',
  },

  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },

  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
    alignItems: 'center',
  },

  secondaryButtonPressed: {
    opacity: 0.85,
  },

  secondaryButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#111',
  },

  textAreaWrap: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  textArea: {
    minHeight: 140,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
  },

  rowIcon: {
    marginRight: 10,
  },

  rowIconSmall: {
    marginRight: 8,
  },


  errorText: {
    marginTop: 12,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#ff3b30',
  },

  hintRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  hintText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
});
