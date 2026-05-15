import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function otherUserId(conversation, meId) {
  if (!conversation || !meId) return null
  if (conversation.user1 === meId) return conversation.user2
  if (conversation.user2 === meId) return conversation.user1
  return null
}

export default function ChatScreen({ navigation, route }) {
  const conversationId = route?.params?.conversationId

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  })

  const [loading, setLoading] = useState(true)
  const [meId, setMeId] = useState(null)
  const [otherProfile, setOtherProfile] = useState(null)

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const channelRef = useRef(null)
  const markReadTimerRef = useRef(null)

  const canSend = useMemo(() => {
    return !sending && text.trim().length > 0
  }, [sending, text])

  const load = useCallback(async () => {
    if (!conversationId) {
      setLoading(false)
      Alert.alert('Missing chat', 'No conversation was provided.')
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user?.id) {
        setMeId(null)
        setOtherProfile(null)
        setMessages([])
        Alert.alert('Sign in required', 'Please sign in to view messages.')
        navigation?.navigate?.('Login')
        return
      }

      await ensureUserProfile(user)
      setMeId(user.id)

      const { data: convRow, error: convError } = await supabase
        .from('dm_conversations')
        .select('id, user1, user2')
        .eq('id', conversationId)
        .maybeSingle()

      if (convError) {
        if (convError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create the 'dm_conversations' and 'dm_messages' tables in Supabase to use Messages."
          )
          setOtherProfile(null)
          setMessages([])
          return
        }
        throw convError
      }

      if (!convRow) {
        Alert.alert('Not found', 'This conversation no longer exists.')
        navigation?.goBack?.()
        return
      }

      const otherId = otherUserId(convRow, user.id)

      if (otherId) {
        const { data: other, error: otherError } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .eq('id', otherId)
          .maybeSingle()

        if (otherError) throw otherError
        setOtherProfile(other)
      } else {
        setOtherProfile(null)
      }

      const { data: msgRows, error: msgError } = await supabase
        .from('dm_messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (msgError) {
        if (msgError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create the 'dm_messages' table in Supabase to use chat."
          )
          setMessages([])
          return
        }
        throw msgError
      }

      setMessages(asArray(msgRows))

      // Mark as read once the chat is loaded.
      try {
        await supabase
          .from('dm_reads')
          .upsert(
            {
              conversation_id: conversationId,
              user_id: user.id,
              last_read_at: new Date().toISOString(),
            },
            { onConflict: 'conversation_id,user_id' }
          )
      } catch (e) {
        // If dm_reads doesn't exist yet, don't block the chat UI.
        if (e?.code !== '42P01') console.warn('dm_reads upsert failed:', e)
      }
    } catch (error) {
      console.error('Chat load error:', error)
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to load chat.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }, [conversationId, navigation])

  useEffect(() => {
    load()
  }, [load])

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return

    // Clean previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload?.new
          if (!row?.id) return

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev
            return [row, ...prev]
          })

          // If I'm viewing this chat, mark it read when a new inbound message arrives.
          if (row.sender_id && row.sender_id !== meId && meId) {
            if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current)
            markReadTimerRef.current = setTimeout(async () => {
              try {
                await supabase
                  .from('dm_reads')
                  .upsert(
                    {
                      conversation_id: conversationId,
                      user_id: meId,
                      last_read_at: new Date().toISOString(),
                    },
                    { onConflict: 'conversation_id,user_id' }
                  )
              } catch (e) {
                if (e?.code !== '42P01') console.warn('dm_reads upsert failed:', e)
              }
            }, 250)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error for dm_messages')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current)
        markReadTimerRef.current = null
      }
    }
  }, [conversationId, meId])

  const send = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || !meId || !conversationId) return

    try {
      setSending(true)

      // Optimistic insert
      const tempId = `temp-${Date.now()}`
      const optimistic = {
        id: tempId,
        sender_id: meId,
        body: trimmed,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [optimistic, ...prev])
      setText('')

      const { data: inserted, error: insertError } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: meId,
          body: trimmed,
        })
        .select('id, sender_id, body, created_at')
        .single()

      if (insertError) throw insertError

      // Replace optimistic row
      if (inserted?.id) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId)
          if (withoutTemp.some((m) => m.id === inserted.id)) return withoutTemp
          return [inserted, ...withoutTemp]
        })

        // Best-effort conversation metadata update
        await supabase
          .from('dm_conversations')
          .update({
            last_message_at: inserted.created_at,
            last_message_text: inserted.body,
            last_message_sender_id: meId,
          })
          .eq('id', conversationId)
      }
    } catch (error) {
      console.error('Send message error:', error)
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to send message.'
      Alert.alert('Error', message)
      // Reload to reconcile optimistic state
      load()
    } finally {
      setSending(false)
    }
  }, [conversationId, load, meId, text])

  if (!fontsLoaded) return null

  const otherName = otherProfile?.username || 'Chat'

  const renderItem = ({ item }) => {
    const isMine = item.sender_id === meId

    return (
      <View
        style={[
          styles.bubbleRow,
          isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}
        >
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            {item.body}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [pressed && styles.headerPressed]}
        >
          <Icon name="arrow-left" size={20} color="#111" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {otherName}
        </Text>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          inverted
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
            placeholder="Message…"
            placeholderTextColor="#BDBDBD"
            editable={!sending}
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendBtn,
              !canSend && styles.sendBtnDisabled,
              pressed && canSend && styles.sendBtnPressed,
            ]}
          >
            {sending ? (
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
  safe: { flex: 1, backgroundColor: '#fff' },

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

  headerPressed: { opacity: 0.6 },

  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111',
    marginHorizontal: 12,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingVertical: 10, paddingHorizontal: 12 },

  bubbleRow: { flexDirection: 'row', marginVertical: 4 },

  bubbleRowMine: { justifyContent: 'flex-end' },

  bubbleRowTheirs: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  bubbleMine: { backgroundColor: TEAL },

  bubbleTheirs: { backgroundColor: '#F3F4F6' },

  bubbleText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#111',
  },

  bubbleTextMine: { color: '#fff' },

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
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#111',
    marginRight: 10,
  },

  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
  },

  sendBtnPressed: { opacity: 0.85 },

  sendBtnDisabled: { opacity: 0.45 },
})
