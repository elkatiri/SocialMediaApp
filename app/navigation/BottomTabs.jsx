/* eslint-disable react-native/no-raw-text */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Feather'
import IconIonicons from 'react-native-vector-icons/Ionicons'

import Home from '../screens/home/home'
import Users from '../screens/users/users'
import Profile from '../screens/profile/profile'
import AddPost from '../screens/addPost/addPost'
import Messages from '../screens/messages/messages'

import { supabase } from '@/lib/supabase'

const Tab = createBottomTabNavigator()
const TEAL = '#1D9E75'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toDateMs(value) {
  if (!value) return 0
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : 0
}

async function fetchUnreadDmCount(userId) {
  if (!userId) return 0

  let conversations = []
  let hasLastSenderColumn = true

  // Newer schema includes last_message_sender_id (fast unread computation).
  // If the column doesn't exist yet, fall back to computing from dm_messages.
  {
    const { data: convRows, error: convError } = await supabase
      .from('dm_conversations')
      .select('id, user1, user2, last_message_at, last_message_sender_id')
      .or(`user1.eq.${userId},user2.eq.${userId}`)

    if (convError) {
      if (convError?.code === '42P01') return 0
      if (convError?.code === '42703') {
        hasLastSenderColumn = false
      } else {
        throw convError
      }
    }

    if (!convError) {
      conversations = asArray(convRows)
    }
  }

  if (!hasLastSenderColumn) {
    const { data: convRows2, error: convError2 } = await supabase
      .from('dm_conversations')
      .select('id, user1, user2, last_message_at')
      .or(`user1.eq.${userId},user2.eq.${userId}`)

    if (convError2) {
      if (convError2?.code === '42P01') return 0
      throw convError2
    }
    conversations = asArray(convRows2)
  }

  const ids = conversations.map((c) => c?.id).filter(Boolean)
  if (ids.length === 0) return 0

  const { data: readRows, error: readError } = await supabase
    .from('dm_reads')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
    .in('conversation_id', ids)

  if (readError) {
    // If dm_reads doesn't exist yet, treat everything as unread based on last message.
    if (readError?.code !== '42P01') throw readError
  }

  const readAtByConversation = {}
  for (const row of asArray(readRows)) {
    if (!row?.conversation_id) continue
    readAtByConversation[row.conversation_id] = toDateMs(row.last_read_at)
  }

  let lastMessageByConversation = null
  if (!hasLastSenderColumn) {
    const { data: msgRows, error: msgError } = await supabase
      .from('dm_messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(500)

    if (msgError) {
      if (msgError?.code === '42P01') return 0
      throw msgError
    }

    lastMessageByConversation = {}
    for (const row of asArray(msgRows)) {
      if (!row?.conversation_id) continue
      if (lastMessageByConversation[row.conversation_id]) continue
      lastMessageByConversation[row.conversation_id] = row
    }
  }

  let unread = 0
  for (const c of conversations) {
    if (!c?.id) continue

    const lastSenderId = hasLastSenderColumn
      ? c?.last_message_sender_id
      : lastMessageByConversation?.[c.id]?.sender_id

    const lastMessageAt = c?.last_message_at
      ? c.last_message_at
      : lastMessageByConversation?.[c.id]?.created_at

    if (!lastMessageAt) continue
    if (!lastSenderId) continue
    if (lastSenderId === userId) continue

    const lastReadMs = readAtByConversation[c.id] || 0
    const lastMsgMs = toDateMs(lastMessageAt)
    if (lastMsgMs > lastReadMs) unread += 1
  }

  return unread
}

function CustomTabBar({ state, navigation, unreadDmCount }) {
  const insets = useSafeAreaInsets()

  const icons = {
    Home: { lib: 'Feather', name: 'home' },
    Users: { lib: 'Feather', name: 'users' },
    AddPost: { lib: 'Feather', name: 'plus-square' },
    Messages: { lib: 'Feather', name: 'message-circle' },
    Profile: { lib: 'Feather', name: 'user' },
  }

  const renderIcon = (routeName, isFocused) => {
    if (routeName === 'AddPost') return null

    const iconConfig = icons[routeName]
    const IconComponent = iconConfig?.lib === 'Feather' ? Icon : IconIonicons
    const iconName = iconConfig?.name

    if (!iconName) return null

    const showBadge = routeName === 'Messages' && (unreadDmCount || 0) > 0

    return (
      <View style={styles.iconWrap}>
        <IconComponent
          name={iconName}
          size={26}
          color={isFocused ? '#000000' : '#8E8E93'}
          strokeWidth={isFocused ? 2 : 1.5}
        />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {unreadDmCount > 99 ? '99+' : String(unreadDmCount)}
            </Text>
          </View>
        )}
      </View>
    )
  }

  const tabItems = state.routes.map((route, index) => {
    const isFocused = state.index === index
    const isAdd = route.name === 'AddPost'

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name)
      }
    }

    if (isAdd) {
      return (
        <Pressable
          key={route.key}
          onPress={onPress}
          style={({ pressed }) => [
            styles.addButtonContainer,
            pressed && styles.addButtonPressed,
          ]}
        >
          <View style={styles.addButton}>
            <Icon name="plus" size={30} color="#fff" />
          </View>
        </Pressable>
      )
    }

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
      >
        {renderIcon(route.name, isFocused)}
      </Pressable>
    )
  })

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
      {tabItems}
    </View>
  )
}

export default function BottomTabs() {
  const [unreadDmCount, setUnreadDmCount] = useState(0)
  const channelsRef = useRef([])

  const refreshUnread = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) throw error
      if (!user?.id) {
        setUnreadDmCount(0)
        return
      }

      const count = await fetchUnreadDmCount(user.id)
      setUnreadDmCount(typeof count === 'number' ? count : 0)
    } catch (e) {
      console.warn('Unread DM badge refresh failed:', e)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      await refreshUnread()
      if (cancelled) return

      // Realtime: refresh badge when new messages arrive or when read state changes.
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const userId = user?.id
      if (!userId) return

      const dmMessagesChannel = supabase
        .channel(`dm_badge_messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'dm_messages',
          },
          (payload) => {
            const row = payload?.new
            if (!row?.id) return
            if (row.sender_id === userId) return
            refreshUnread()
          }
        )
        .subscribe()

      const dmReadsChannel = supabase
        .channel(`dm_badge_reads:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dm_reads',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshUnread()
          }
        )
        .subscribe()

      channelsRef.current = [dmMessagesChannel, dmReadsChannel]
    }

    init()

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshUnread()
      }
    })

    return () => {
      cancelled = true
      try {
        appStateSub?.remove?.()
      } catch {
        // ignore
      }
      for (const ch of channelsRef.current) {
        try {
          supabase.removeChannel(ch)
        } catch {
          // ignore
        }
      }
      channelsRef.current = []
    }
  }, [refreshUnread])

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar {...props} unreadDmCount={unreadDmCount} />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Users" component={Users} />
      <Tab.Screen name="AddPost" component={AddPost} />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  tabItemPressed: {
    opacity: 0.5,
  },

  iconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -7,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  addButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonPressed: {
    transform: [{ scale: 0.9 }],
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
})