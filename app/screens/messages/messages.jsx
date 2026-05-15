import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
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
import { useFocusEffect } from '@react-navigation/native'

import { supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/ensureUserProfile'

const TEAL = '#1D9E75'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function formatTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return ''
  }
}

function otherUserIdForConversation(conversation, myId) {
  if (!conversation || !myId) return null
  if (conversation.user1 === myId) return conversation.user2
  if (conversation.user2 === myId) return conversation.user1
  return null
}

function safeNavigateToRoot(navigation, routeName, params) {
  const parent = navigation?.getParent?.()
  if (parent?.navigate) parent.navigate(routeName, params)
  else navigation?.navigate?.(routeName, params)
}

export default function MessagesScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [me, setMe] = useState(null)
  const [conversations, setConversations] = useState([])
  const [userById, setUserById] = useState({})

  const myId = me?.id

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        setMe(null)
        setConversations([])
        setUserById({})
        return
      }

      await ensureUserProfile(user)
      setMe(user)

      const { data: convRows, error: convError } = await supabase
        .from('dm_conversations')
        .select('id, user1, user2, last_message_text, last_message_at, created_at')
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (convError) {
        if (convError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create the 'dm_conversations' and 'dm_messages' tables in Supabase to use Messages."
          )
          setConversations([])
          setUserById({})
          return
        }
        throw convError
      }

      const nextConversations = asArray(convRows)
      setConversations(nextConversations)

      const otherIds = Array.from(
        new Set(
          nextConversations
            .map((c) => otherUserIdForConversation(c, user.id))
            .filter(Boolean)
        )
      )

      if (otherIds.length === 0) {
        setUserById({})
        return
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', otherIds)

      if (profilesError) throw profilesError

      const map = {}
      for (const row of asArray(profiles)) {
        if (!row?.id) continue
        map[row.id] = row
      }
      setUserById(map)
    } catch (error) {
      console.error('Messages load error:', error)
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to load messages.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const list = useMemo(() => {
    return conversations.map((c) => {
      const otherId = otherUserIdForConversation(c, myId)
      const other = otherId ? userById[otherId] : null
      const username = other?.username || 'User'
      const avatar =
        other?.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`

      return {
        id: c.id,
        otherId,
        username,
        avatar,
        lastText: c.last_message_text || '',
        time: formatTime(c.last_message_at || c.created_at),
      }
    })
  }, [conversations, myId, userById])

  if (!fontsLoaded) return null

  const openNew = () => {
    if (!myId) {
      Alert.alert('Sign in required', 'Please sign in to send messages.')
      safeNavigateToRoot(navigation, 'Login')
      return
    }
    safeNavigateToRoot(navigation, 'NewMessage')
  }

  const openChat = (conversationId) => {
    safeNavigateToRoot(navigation, 'Chat', { conversationId })
  }

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => openChat(item.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.username}>{item.username}</Text>
          {!!item.time && <Text style={styles.time}>{item.time}</Text>}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastText || 'Tap to chat'}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color="#9CA3AF" />
    </Pressable>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Pressable
          onPress={openNew}
          hitSlop={8}
          style={({ pressed }) => [styles.newBtn, pressed && styles.newBtnPressed]}
        >
          <Icon name="edit-3" size={18} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>Start a new chat to send a message.</Text>
          <Pressable
            onPress={openNew}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>New message</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
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

  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#111',
  },

  newBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },

  newBtnPressed: { opacity: 0.7 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingVertical: 6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F1F1',
    backgroundColor: '#fff',
  },

  pressed: { opacity: 0.6 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },

  body: { flex: 1 },

  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  username: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#111',
  },

  time: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B7280',
  },

  preview: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B7280',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#111',
    marginBottom: 6,
  },

  emptyBody: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 14,
  },

  primaryBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  primaryBtnPressed: { opacity: 0.8 },

  primaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#fff',
  },
})
