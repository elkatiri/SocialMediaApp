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

export default function NewMessageScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  })

  const [loading, setLoading] = useState(true)
  const [meId, setMeId] = useState(null)
  const [users, setUsers] = useState([])
  const [creatingForUserId, setCreatingForUserId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user?.id) {
        setMeId(null)
        setUsers([])
        return
      }

      await ensureUserProfile(user)
      setMeId(user.id)

      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .neq('id', user.id)
        .order('username', { ascending: true })

      if (error) throw error
      setUsers(asArray(data))
    } catch (error) {
      console.error('NewMessage load error:', error)
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to load users.'
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

  const canInteract = useMemo(() => {
    return !!meId && !creatingForUserId
  }, [meId, creatingForUserId])

  const findOrCreateConversation = useCallback(
    async (otherId) => {
      if (!meId || !otherId) return null

      const { data: existing, error: existingError } = await supabase
        .from('dm_conversations')
        .select('id, user1, user2')
        .or(
          `and(user1.eq.${meId},user2.eq.${otherId}),and(user1.eq.${otherId},user2.eq.${meId})`
        )
        .limit(1)

      if (existingError) {
        if (existingError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create the 'dm_conversations' and 'dm_messages' tables in Supabase to use Messages."
          )
          return null
        }
        throw existingError
      }

      const row = asArray(existing)[0]
      if (row?.id) return row.id

      const { data: inserted, error: insertError } = await supabase
        .from('dm_conversations')
        .insert({ user1: meId, user2: otherId })
        .select('id')
        .single()

      if (!insertError && inserted?.id) return inserted.id

      // If it already exists (race), re-select.
      if (insertError?.code === '23505') {
        const { data: retry, error: retryError } = await supabase
          .from('dm_conversations')
          .select('id')
          .or(
            `and(user1.eq.${meId},user2.eq.${otherId}),and(user1.eq.${otherId},user2.eq.${meId})`
          )
          .limit(1)

        if (retryError) throw retryError
        const retryRow = asArray(retry)[0]
        if (retryRow?.id) return retryRow.id
      }

      throw insertError
    },
    [meId]
  )

  const openChatWithUser = useCallback(
    async (otherId) => {
      if (!meId) {
        Alert.alert('Sign in required', 'Please sign in to send messages.')
        navigation?.navigate?.('Login')
        return
      }

      setCreatingForUserId(otherId)
      try {
        const conversationId = await findOrCreateConversation(otherId)
        if (!conversationId) return
        navigation?.navigate?.('Chat', { conversationId })
      } catch (error) {
        console.error('Create/open conversation failed:', error)
        const message =
          typeof error?.message === 'string'
            ? error.message
            : 'Failed to start a chat.'
        Alert.alert('Error', message)
      } finally {
        setCreatingForUserId(null)
      }
    },
    [findOrCreateConversation, meId, navigation]
  )

  if (!fontsLoaded) return null

  const renderItem = ({ item }) => {
    const username = item?.username || 'User'
    const avatar =
      item?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`

    const isWorking = creatingForUserId === item.id

    return (
      <Pressable
        disabled={!canInteract}
        onPress={() => openChatWithUser(item.id)}
        style={({ pressed }) => [
          styles.row,
          pressed && canInteract && styles.pressed,
        ]}
      >
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <View style={styles.body}>
          <Text style={styles.username}>{username}</Text>
        </View>
        {isWorking ? (
          <ActivityIndicator size="small" color={TEAL} />
        ) : (
          <Icon name="chevron-right" size={18} color="#9CA3AF" />
        )}
      </Pressable>
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
        <Text style={styles.title}>New message</Text>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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

  headerPressed: { opacity: 0.6 },

  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111',
  },

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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },

  body: { flex: 1 },

  username: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#111',
  },
})
