import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/ensureUserProfile';

const TEAL = '#1D9E75';
const BG = '#FFFFFF';
const CARD = '#FAFAFA';
const BORDER = '#EFEFEF';
const TEXT = '#111111';
const MUTED = '#6B7280';

function nameForUser(user) {
  if (!user) return 'User';
  if (typeof user.username === 'string' && user.username.trim()) return user.username.trim();
  return 'User';
}

function initialsForName(name) {
  const clean = typeof name === 'string' ? name.trim() : '';
  if (!clean) return 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + last).toUpperCase();
}

function Avatar({ uri, name }) {
  const initials = initialsForName(name);
  if (typeof uri === 'string' && uri.trim().length > 0) {
    return (
      <View style={styles.avatar}>
        <Image source={{ uri }} style={styles.avatarImg} />
      </View>
    );
  }

  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

export default function UsersScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState(null);

  const [users, setUsers] = useState([]);
  const [outgoingByToUserId, setOutgoingByToUserId] = useState({});
  const [acceptedFriendIds, setAcceptedFriendIds] = useState(new Set());
  const [incoming, setIncoming] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const lastAlertedNotificationIdRef = useRef(null);

  const [showActivity, setShowActivity] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  const [actingUserId, setActingUserId] = useState(null);

  const myId = me?.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setMe(null);
        setUsers([]);
        setIncoming([]);
        setOutgoingByToUserId({});
        setAcceptedFriendIds(new Set());
        setNotifications([]);
        return;
      }

      await ensureUserProfile(user);
      setMe(user);

      const [
        { data: usersData, error: usersError },
        { data: outgoingData, error: outgoingError },
        { data: incomingData, error: incomingError },
        { data: acceptedData, error: acceptedError },
        { data: notifData, error: notifError },
      ] = await Promise.all([
          supabase
            .from('users')
            .select('id, username, avatar_url')
            .neq('id', user.id)
            .order('username', { ascending: true }),
          supabase
            .from('friend_requests')
            .select('id, to_user, status')
            .eq('from_user', user.id)
            .in('status', ['pending', 'accepted']),
          supabase
            .from('friend_requests')
            .select('id, from_user, to_user, status, created_at')
            .eq('to_user', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
          supabase
            .from('friend_requests')
            .select('from_user, to_user')
            .eq('status', 'accepted')
            .or(`from_user.eq.${user.id},to_user.eq.${user.id}`),
          supabase
            .from('notifications')
            .select('id, user_id, actor_user_id, type, is_read, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

      // Users list
      if (usersError) {
        if (usersError?.code === '42P01') {
          Alert.alert('Database missing', "The 'users' table is missing in Supabase.");
        }
        throw usersError;
      }
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Outgoing requests map
      if (outgoingError) {
        if (outgoingError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create a 'friend_requests' table in Supabase to use friend requests."
          );
        }
        throw outgoingError;
      }
      const outgoingMap = {};
      for (const row of outgoingData || []) {
        if (!row?.to_user) continue;
        outgoingMap[row.to_user] = row;
      }
      setOutgoingByToUserId(outgoingMap);

      // Accepted friends (either direction)
      if (acceptedError) {
        if (acceptedError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create a 'friend_requests' table in Supabase to use friend requests."
          );
        }
        throw acceptedError;
      }
      const nextFriendIds = new Set();
      for (const row of acceptedData || []) {
        if (!row?.from_user || !row?.to_user) continue;
        const otherId = row.from_user === user.id ? row.to_user : row.from_user;
        if (otherId && otherId !== user.id) nextFriendIds.add(otherId);
      }
      setAcceptedFriendIds(nextFriendIds);

      // Incoming requests
      if (incomingError) {
        if (incomingError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create a 'friend_requests' table in Supabase to use friend requests."
          );
        }
        throw incomingError;
      }
      setIncoming(Array.isArray(incomingData) ? incomingData : []);

      // Notifications
      if (notifError) {
        if (notifError?.code === '42P01') {
          Alert.alert(
            'Database missing',
            "Create a 'notifications' table in Supabase to see acceptance notifications."
          );
        }
        throw notifError;
      }
      const nextNotifications = Array.isArray(notifData) ? notifData : [];
      setNotifications(nextNotifications);

      const newestUnread = nextNotifications.find(
        (n) =>
          !n?.is_read &&
          (n?.type === 'friend_request_accepted' || n?.type === 'friend_request_received')
      );

      if (newestUnread?.id && newestUnread.id !== lastAlertedNotificationIdRef.current) {
        lastAlertedNotificationIdRef.current = newestUnread.id;
        const msg =
          newestUnread.type === 'friend_request_received'
            ? 'You received a new friend request.'
            : 'Someone accepted your friend request.';
        Alert.alert('Notification', msg);
      }
    } catch (error) {
      console.error('Users screen load error:', error);
      const message =
        typeof error?.message === 'string' ? error.message : 'Failed to load users.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optional deep link behavior (e.g. Home bell opens Activity)
  useEffect(() => {
    const openPanel = route?.params?.openPanel;
    if (!openPanel) return;

    if (openPanel === 'activity') {
      setShowActivity(true);
      setShowRequests(false);
    } else if (openPanel === 'requests') {
      setShowRequests(true);
      setShowActivity(false);
    }

    // Clear param so it doesn't keep forcing the panel.
    navigation?.setParams?.({ openPanel: undefined });
  }, [navigation, route?.params?.openPanel]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const incomingWithUsers = useMemo(() => {
    if (!incoming.length) return [];
    const byId = new Map(users.map(u => [u.id, u]));
    return incoming.map(req => ({
      ...req,
      fromUser: byId.get(req.from_user),
    }));
  }, [incoming, users]);

  const notificationsWithUsers = useMemo(() => {
    if (!notifications.length) return [];
    const byId = new Map(users.map(u => [u.id, u]));
    return notifications.map(n => ({
      ...n,
      actor: byId.get(n.actor_user_id),
    }));
  }, [notifications, users]);

  const unreadNotificationsCount = useMemo(() => {
    return notificationsWithUsers.filter((n) => !n?.is_read).length;
  }, [notificationsWithUsers]);

  const handleSendRequest = useCallback(
    async (toUserId) => {
      if (!myId) {
        Alert.alert('Not signed in', 'Please log in first.');
        return;
      }
      if (!toUserId) return;

      setActingUserId(toUserId);
      try {
        const { error } = await supabase.from('friend_requests').upsert(
          {
            from_user: myId,
            to_user: toUserId,
            status: 'pending',
          },
          { onConflict: 'from_user,to_user' }
        );

        if (error) throw error;

        // Notify the recipient
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: toUserId,
          actor_user_id: myId,
          type: 'friend_request_received',
          is_read: false,
        });
        if (notifError && notifError.code !== '23505') {
          console.warn('Create request notification failed:', notifError);
        }

        await load();
      } catch (error) {
        console.error('Send request error:', error);
        const message =
          typeof error?.message === 'string' ? error.message : 'Failed to send request.';
        Alert.alert('Error', message);
      } finally {
        setActingUserId(null);
      }
    },
    [load, myId]
  );

  const handleAccept = useCallback(
    async (request) => {
      if (!myId) return;
      if (!request?.id) return;

      setActingUserId(request.from_user);
      try {
        // Mark request as accepted
        const { error: updateError } = await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', request.id)
          .eq('to_user', myId);

        if (updateError) throw updateError;

        // Notify the sender
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: request.from_user,
          actor_user_id: myId,
          type: 'friend_request_accepted',
          is_read: false,
        });

        if (notifError) throw notifError;

        await load();
      } catch (error) {
        console.error('Accept request error:', error);
        const message =
          typeof error?.message === 'string' ? error.message : 'Failed to accept request.';
        Alert.alert('Error', message);
      } finally {
        setActingUserId(null);
      }
    },
    [load, myId]
  );

  const handleOpenNotification = useCallback(
    async (notification) => {
      if (!notification?.id || notification?.is_read) return;
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id)
          .eq('user_id', myId);
        await load();
      } catch (error) {
        console.warn('Mark notification read failed:', error);
      }
    },
    [load, myId]
  );

  const renderHeader = () => {
    return (
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>Discover</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                setShowActivity((v) => !v);
                setShowRequests(false);
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                showActivity && styles.iconBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle activity"
            >
              <Icon name="bell" size={18} color={TEXT} />
              {unreadNotificationsCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => {
                setShowRequests((v) => !v);
                setShowActivity(false);
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                showRequests && styles.iconBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle requests"
            >
              <Icon name="user-plus" size={18} color={TEXT} />
              {incomingWithUsers.length > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {incomingWithUsers.length > 99 ? '99+' : String(incomingWithUsers.length)}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={onRefresh}
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
            >
              <Icon name="refresh-cw" size={16} color={TEXT} />
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>Find people, send requests, and see activity.</Text>

        {showActivity ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            {notificationsWithUsers.length === 0 ? (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            ) : (
              notificationsWithUsers.map((n) => {
                const actorName = nameForUser(n.actor);
                const text =
                  n.type === 'friend_request_accepted'
                    ? `${actorName} accepted your request.`
                    : n.type === 'friend_request_received'
                      ? `${actorName} sent you a friend request.`
                      : 'Notification.';

                const iconName =
                  n.type === 'friend_request_received'
                    ? 'user-plus'
                    : 'bell';

                return (
                  <Pressable
                    key={n.id}
                    onPress={() => handleOpenNotification(n)}
                    style={({ pressed }) => [
                      styles.notificationRow,
                      !n.is_read && styles.notificationRowUnread,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.notificationLeft}>
                      <Icon name={iconName} size={16} color={n.is_read ? '#666' : TEAL} />
                      <Text style={[styles.notificationText, !n.is_read && { color: '#111' }]}>
                        {text}
                      </Text>
                    </View>
                    {!n.is_read ? <Text style={styles.unreadPill}>NEW</Text> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

        {showRequests ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requests</Text>
            {incomingWithUsers.length === 0 ? (
              <Text style={styles.emptyText}>No incoming requests.</Text>
            ) : (
              incomingWithUsers.map((req) => {
                const fromName = nameForUser(req.fromUser);
                const isActing = actingUserId === req.from_user;
                return (
                  <View key={req.id} style={styles.requestRow}>
                    <View style={styles.requestLeft}>
                      <Avatar uri={req.fromUser?.avatar_url} name={fromName} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestText}>{fromName}</Text>
                        <Text style={styles.requestSubText}>wants to connect</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleAccept(req)}
                      disabled={isActing}
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        isActing && { opacity: 0.6 },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text style={styles.acceptText}>
                        {isActing ? 'Accepting…' : 'Accept'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>People</Text>
      </View>
    );
  };

  const renderUser = ({ item }) => {
    const outgoing = outgoingByToUserId[item.id];
    const status = outgoing?.status;
    const isActing = actingUserId === item.id;

    const isFriend = acceptedFriendIds.has(item.id) || status === 'accepted';

    const buttonLabel = isFriend ? 'Friends' : status === 'pending' ? 'Requested' : 'Add';
    const disabled = isFriend || status === 'pending' || isActing;

    const displayName = nameForUser(item);

    return (
      <View style={styles.userRow}>
        <View style={styles.userLeft}>
          <Avatar uri={item.avatar_url} name={displayName} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userMeta}>@{item.id.slice(0, 8)}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleSendRequest(item.id)}
          disabled={disabled}
          style={({ pressed }) => [
            styles.addBtn,
            isFriend && styles.addBtnAccepted,
            disabled && styles.addBtnDisabled,
            pressed && !disabled && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.addText, disabled && styles.addTextDisabled]}>
            {isActing ? 'Please wait…' : buttonLabel}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {myId ? 'No users found.' : 'Please log in to see users.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  headerWrap: { paddingTop: 8, paddingBottom: 6 },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: 0.2 },
  subtitle: { marginTop: 6, fontSize: 13, color: MUTED },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: '#BFE9D8',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TEAL,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: TEXT },

  section: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: CARD,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: TEXT },
  emptyText: { marginTop: 8, fontSize: 13, color: MUTED },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    backgroundColor: '#F3F4F6',
  },
  avatarInitials: { fontSize: 12, fontWeight: '800', color: '#374151' },

  notificationRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  notificationRowUnread: {
    borderColor: '#BFE9D8',
  },
  notificationLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  notificationText: { fontSize: 13, color: MUTED, flex: 1 },
  unreadPill: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: TEAL,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  requestRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  requestText: { fontSize: 14, color: TEXT, fontWeight: '800' },
  requestSubText: { marginTop: 2, fontSize: 12, color: MUTED },
  acceptBtn: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  userLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userName: { fontSize: 14, color: TEXT, fontWeight: '800' },
  userMeta: { marginTop: 2, fontSize: 12, color: MUTED },

  addBtn: {
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: BG,
  },
  addBtnAccepted: {
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  addBtnDisabled: {
    borderColor: '#DDD',
  },
  addText: { color: TEAL, fontSize: 13, fontWeight: '800' },
  addTextDisabled: { color: '#888' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#666' },
});
