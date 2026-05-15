import React, { useCallback, useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
} from "react-native";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import Icon from "react-native-vector-icons/Feather";
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';

const POSTS_BUCKET = (process.env.EXPO_PUBLIC_POSTS_BUCKET || 'posts').trim();

function tryExtractStoragePath(imageUrl) {
  if (typeof imageUrl !== 'string') return null;
  const url = imageUrl.trim();
  if (!url) return null;

  // If it's already a plain storage path (e.g. userId/123.jpg)
  if (!/^https?:\/\//i.test(url)) return url;

  // Supabase public URL format: .../storage/v1/object/public/<bucket>/<path>
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const after = url.slice(idx + marker.length);
    const prefix = `${POSTS_BUCKET}/`;
    if (after.startsWith(prefix)) return after.slice(prefix.length);
  }

  // Signed URL format (can vary), try to find '/storage/v1/object/sign/<bucket>/'
  const marker2 = '/storage/v1/object/sign/';
  const idx2 = url.indexOf(marker2);
  if (idx2 !== -1) {
    const after = url.slice(idx2 + marker2.length);
    const prefix = `${POSTS_BUCKET}/`;
    if (after.startsWith(prefix)) {
      const rest = after.slice(prefix.length);
      return rest.split('?')[0];
    }
  }

  return null;
}

export default function Home() {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const openMessages = useCallback(() => {
    navigation.navigate('Messages');
  }, [navigation]);

  const openSettings = useCallback(() => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate('Setting');
    else navigation.navigate('Setting');
  }, [navigation]);

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);

      const { data, error } = await supabase
        .from('posts')
        .select(
          `id,
           content,
           image_url,
           created_at,
           user_id,
           users ( username, avatar_url )`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postIds = (data || []).map((row) => row.id).filter(Boolean);

      let likesRows = [];
      if (postIds.length > 0) {
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('post_id,user_id')
          .in('post_id', postIds);

        if (likesError) {
          console.error('Error fetching likes:', likesError);
        } else {
          likesRows = likesData || [];
        }
      }

      let commentsRows = [];
      if (postIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds);

        if (commentsError) {
          console.error('Error fetching comments:', commentsError);
        } else {
          commentsRows = commentsData || [];
        }
      }

      const likesCountByPost = {};
      const likedByMe = new Set();
      for (const like of likesRows) {
        if (!like?.post_id) continue;
        likesCountByPost[like.post_id] = (likesCountByPost[like.post_id] || 0) + 1;
        if (userId && like.user_id === userId) {
          likedByMe.add(like.post_id);
        }
      }

      const commentsCountByPost = {};
      for (const c of commentsRows) {
        if (!c?.post_id) continue;
        commentsCountByPost[c.post_id] = (commentsCountByPost[c.post_id] || 0) + 1;
      }

      const mapped = await Promise.all((data || []).map(async (row) => {
        const profile = Array.isArray(row?.users) ? row.users[0] : row?.users;
        const createdAt = row?.created_at ? new Date(row.created_at) : null;
        const time = createdAt
          ? createdAt.toLocaleString()
          : '';

        const username = profile?.username || 'User';

        let image = null;
        if (row.image_url) {
          const extractedPath = tryExtractStoragePath(row.image_url);
          if (extractedPath) {
            try {
              const { data: signed, error: signedError } = await supabase.storage
                .from(POSTS_BUCKET)
                .createSignedUrl(extractedPath, 60 * 60);
              if (!signedError && signed?.signedUrl) {
                image = signed.signedUrl;
              } else {
                image = /^https?:\/\//i.test(row.image_url) ? row.image_url : null;
              }
            } catch (e) {
              image = /^https?:\/\//i.test(row.image_url) ? row.image_url : null;
            }
          } else {
            image = row.image_url;
          }
        }

        return {
          id: row.id,
          user_id: row.user_id,
          name: username,
          user: username,
          avatar:
            profile?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
          time,
          content: row.content || '',
          image,
          liked: likedByMe.has(row.id),
          likes: likesCountByPost[row.id] || 0,
          comments: commentsCountByPost[row.id] || 0,
        };
      }));

      setPosts(mapped);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadNotificationsCount = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) {
        setUnreadNotificationsCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        if (error?.code === '42P01') {
          // notifications table not created yet
          setUnreadNotificationsCount(0);
          return;
        }
        throw error;
      }

      setUnreadNotificationsCount(typeof count === 'number' ? count : 0);
    } catch (e) {
      console.warn('Fetch unread notifications count failed:', e);
    }
  }, []);

  const handleLike = async (postId) => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to like posts.');
      return;
    }

    const existing = posts.find((p) => p.id === postId);
    const wasLiked = !!existing?.liked;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !wasLiked,
              likes: Math.max(0, (p.likes || 0) + (wasLiked ? -1 : 1)),
            }
          : p
      )
    );

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes').insert({
          post_id: postId,
          user_id: currentUserId,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Like toggle failed:', error);
      Alert.alert('Error', 'Failed to update like.');
      fetchPosts();
    }
  };

  // Fetch stories from API
  const fetchStories = async () => {
    try {
      // TODO: Replace with your API endpoint
      // const response = await fetch('YOUR_API_URL/stories');
      // const data = await response.json();
      // setStories(data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    await fetchUnreadNotificationsCount();
    await fetchStories();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
      fetchUnreadNotificationsCount();
    }, [fetchPosts, fetchUnreadNotificationsCount])
  );

  useEffect(() => {
    if (!currentUserId) return;

    // Realtime updates (optional). Keep this defensive so it never crashes the screen.
    let channel;
    try {
      if (typeof supabase?.channel !== 'function') return;

      channel = supabase.channel('home-notifications');
      if (!channel || typeof channel.on !== 'function') return;

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`,
          },
          () => {
            fetchUnreadNotificationsCount();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Home notifications realtime setup failed:', e);
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [currentUserId, fetchUnreadNotificationsCount]);

  const renderPost = ({ item }) => (
    <View style={styles.post}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postUser}>
          <Image source={{ uri: item.avatar }} style={styles.postAvatar} />
          <View>
            <View style={styles.postUserInfo}>
              <Text style={styles.postUserName}>{item.name}</Text>
              <Text style={styles.postUserHandle}>@{item.user}</Text>
            </View>
            <Text style={styles.postTime}>{item.time}</Text>
          </View>
        </View>
        <Pressable onPress={() => alert('More options')}>
          <Icon name="more-horizontal" size={20} color="#666" />
        </Pressable>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{item.content}</Text>
      
      {/* Post Image (if exists) */}
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      )}
      
      {/* Post Actions */}
      <View style={styles.postActions}>
        <Pressable onPress={() => handleLike(item.id)} style={styles.actionButton}>
          <Icon 
            name={item.liked ? "heart" : "heart"} 
            size={24} 
            color={item.liked ? "#ff3b30" : "#666"} 
          />
          <Text style={styles.actionText}>{item.likes}</Text>
        </Pressable>
        
        <Pressable
          onPress={() => navigation.navigate('Comments', { postId: item.id })}
          style={styles.actionButton}
        >
          <Icon name="message-circle" size={22} color="#666" />
          <Text style={styles.actionText}>{item.comments}</Text>
        </Pressable>
        
        <Pressable onPress={() => alert('Share')} style={styles.actionButton}>
          <Icon name="send" size={22} color="#666" />
        </Pressable>
        
        <Pressable onPress={() => alert('Save')} style={styles.saveButton}>
          <Icon name="bookmark" size={22} color="#666" />
        </Pressable>
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return null;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1D9E75"
            colors={["#1D9E75"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="users" size={24} color="#1D9E75" />
            <Text style={styles.logo}>Connectfy</Text>
          </View>

          <View style={styles.rightSection}>
            <Pressable
              onPress={() => navigation.navigate('Users', { openPanel: 'activity' })}
              style={styles.iconBtn}
            >
              <Icon name="bell" size={22} color="#333" />
              {unreadNotificationsCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable onPress={openMessages} style={styles.iconBtn}>
              <Icon name="message-square" size={22} color="#333" />
            </Pressable>

            <Pressable onPress={openSettings} style={styles.iconBtn}>
              <Icon name="settings" size={22} color="#333" />
            </Pressable>
          </View>
        </View>

        {/* Feed Posts */}
        {posts.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              When you follow people, their posts will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.feed}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8E8E8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#1D9E75",
    marginLeft: 8,
  },

  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBtn: {
    padding: 8,
    marginLeft: 8,
    position: "relative",
  },

  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: "#ff3b30",
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: '#fff',
    lineHeight: 12,
  },

  feed: {
    paddingBottom: 80,
  },

  post: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8E8E8",
  },

  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  postUser: {
    flexDirection: "row",
    alignItems: "center",
  },

  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },

  postUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  postUserName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#000",
    marginRight: 6,
  },

  postUserHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#666",
  },

  postTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },

  postContent: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#333",
    paddingHorizontal: 12,
    paddingBottom: 10,
    lineHeight: 20,
  },

  postImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
    backgroundColor: "#F5F5F5",
  },

  postActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },

  actionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
  },

  saveButton: {
    marginLeft: "auto",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },

  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },

  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});