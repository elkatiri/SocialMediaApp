import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins'
import { supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/ensureUserProfile'

const TEAL = '#1D9E75'

export default function Comments({ navigation, route }) {
  const postId = route?.params?.postId

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')

  const canSend = useMemo(() => {
    return !submitting && text.trim().length > 0
  }, [submitting, text])

  const fetchComments = useCallback(async () => {
    if (!postId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('comments')
        .select(
          `id,
           content,
           created_at,
           user_id,
           users ( username, avatar_url )`
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const mapped = (data || []).map((row) => {
        const profile = Array.isArray(row?.users) ? row.users[0] : row?.users
        const username = profile?.username || 'User'
        const createdAt = row?.created_at ? new Date(row.created_at) : null

        return {
          id: row.id,
          content: row.content || '',
          user: username,
          avatar:
            profile?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
          time: createdAt ? createdAt.toLocaleString() : '',
        }
      })

      setComments(mapped)
    } catch (error) {
      console.error('Fetch comments error:', error)
      Alert.alert('Error', 'Failed to load comments.')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  if (!fontsLoaded) return null

  const sendComment = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    try {
      setSubmitting(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to comment.')
        navigation?.navigate?.('Login')
        return
      }

      await ensureUserProfile(user)

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: trimmed,
      })

      if (error) throw error

      setText('')
      await fetchComments()
    } catch (error) {
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to send comment.'
      console.error('Send comment error:', error)
      Alert.alert('Error', message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.commentRow}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{item.user}</Text>
          {!!item.time && <Text style={styles.time}>{item.time}</Text>}
        </View>
        <Text style={styles.content}>{item.content}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Icon name="arrow-left" size={20} color="#111" />
        </Pressable>
        <Text style={styles.title}>Comments</Text>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor="#BDBDBD"
            editable={!submitting}
          />
          <Pressable
            onPress={sendComment}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendBtn,
              !canSend && styles.sendBtnDisabled,
              pressed && canSend && styles.sendBtnPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },

  pressed: {
    opacity: 0.6,
  },

  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: {
    padding: 16,
    paddingBottom: 90,
  },

  commentRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    backgroundColor: '#F5F5F5',
  },

  commentBody: {
    flex: 1,
  },

  commentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  username: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#111',
    marginRight: 10,
  },

  time: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#999',
  },

  content: {
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#fff',
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#111',
  },

  sendBtn: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendBtnPressed: {
    opacity: 0.9,
  },

  sendBtnDisabled: {
    backgroundColor: '#B7D9CF',
  },
})
