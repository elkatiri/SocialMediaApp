import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView 
} from "react-native";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import Icon from "react-native-vector-icons/Feather";

export default function Home() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with your API endpoint
      // const response = await fetch('YOUR_API_URL/posts');
      // const data = await response.json();
      // setPosts(data);
      
      // Temporary empty data structure
      setPosts([]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
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
    await fetchStories();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, []);

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
        
        <Pressable onPress={() => alert('Comments')} style={styles.actionButton}>
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

  const handleLike = (postId) => {
    // TODO: API call to like/unlike post
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            liked: !post.liked, 
            likes: post.liked ? post.likes - 1 : post.likes + 1 
          }
        : post
    ));
  };

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
            <Pressable onPress={() => alert("Notifications")} style={styles.iconBtn}>
              <Icon name="bell" size={22} color="#333" />
              <View style={styles.notificationBadge} />
            </Pressable>

            <Pressable onPress={() => alert("Messages")} style={styles.iconBtn}>
              <Icon name="message-square" size={22} color="#333" />
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
    borderWidth: 1.5,
    borderColor: "#fff",
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