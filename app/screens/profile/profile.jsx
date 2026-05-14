import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
    useFonts,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/ensureUserProfile';

const TEAL = '#1D9E75';
const POSTS_BUCKET = (process.env.EXPO_PUBLIC_POSTS_BUCKET || 'posts').trim();

function tryExtractStoragePath(imageUrl) {
    if (typeof imageUrl !== 'string') return null;
    const url = imageUrl.trim();
    if (!url) return null;

    if (!/^https?:\/\//i.test(url)) return url;

    const marker = '/storage/v1/object/public/';
    const idx = url.indexOf(marker);
    if (idx !== -1) {
        const after = url.slice(idx + marker.length);
        const prefix = `${POSTS_BUCKET}/`;
        if (after.startsWith(prefix)) return after.slice(prefix.length);
    }

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

async function resolvePostImageUrl(imageUrl) {
    if (!imageUrl) return null;
    const extractedPath = tryExtractStoragePath(imageUrl);
    if (!extractedPath) return imageUrl;

    try {
        const { data, error } = await supabase.storage
            .from(POSTS_BUCKET)
            .createSignedUrl(extractedPath, 60 * 60);

        if (!error && data?.signedUrl) return data.signedUrl;
    } catch (e) {
        // ignore
    }

    return /^https?:\/\//i.test(imageUrl) ? imageUrl : null;
}

export default function ProfileScreen({ navigation }) {
    const [fontsLoaded] = useFonts({
        Poppins_400Regular,
        Poppins_500Medium,
        Poppins_600SemiBold,
        Poppins_700Bold,
    });

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [userId, setUserId] = useState(null);
    const [posts, setPosts] = useState([]);
    const [friends, setFriends] = useState([]);

    const [editingPostId, setEditingPostId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const postsCount = useMemo(() => posts.length, [posts]);
    const friendsCount = useMemo(() => friends.length, [friends]);

    const fetchMine = useCallback(async () => {
        try {
            setLoading(true);
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;
            if (!user) {
                setUserId(null);
                setUserProfile(null);
                setPosts([]);
                setFriends([]);
                return;
            }

            setUserId(user.id);
            await ensureUserProfile(user);

            const { data: profileRow, error: profileError } = await supabase
                .from('users')
                .select('id, username, avatar_url, created_at')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) throw profileError;
            setUserProfile(profileRow);

            // Friends (accepted requests)
            try {
                const { data: acceptedRows, error: acceptedError } = await supabase
                    .from('friend_requests')
                    .select('from_user, to_user')
                    .eq('status', 'accepted')
                    .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);

                if (acceptedError) throw acceptedError;

                const friendIds = new Set();
                for (const row of acceptedRows || []) {
                    if (!row?.from_user || !row?.to_user) continue;
                    const otherId = row.from_user === user.id ? row.to_user : row.from_user;
                    if (otherId && otherId !== user.id) friendIds.add(otherId);
                }

                if (friendIds.size === 0) {
                    setFriends([]);
                } else {
                    const { data: friendProfiles, error: friendsError } = await supabase
                        .from('users')
                        .select('id, username, avatar_url')
                        .in('id', Array.from(friendIds))
                        .order('username', { ascending: true });

                    if (friendsError) throw friendsError;
                    setFriends(Array.isArray(friendProfiles) ? friendProfiles : []);
                }
            } catch (friendsError) {
                // If the table doesn't exist yet, don't block the profile.
                if (friendsError?.code === '42P01') {
                    setFriends([]);
                } else {
                    console.warn('Friends fetch failed:', friendsError);
                }
            }

            const { data: myPosts, error: postsError } = await supabase
                .from('posts')
                .select('id, content, image_url, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            const mapped = await Promise.all(
                (myPosts || []).map(async (row) => {
                    const createdAt = row?.created_at ? new Date(row.created_at) : null;
                    const time = createdAt ? createdAt.toLocaleString() : '';
                    const image = await resolvePostImageUrl(row?.image_url);
                    return {
                        id: row.id,
                        content: row.content || '',
                        time,
                        image,
                    };
                })
            );

            setPosts(mapped);
        } catch (error) {
            console.error('Profile fetch error:', error);
            Alert.alert('Error', 'Failed to load your profile/posts.');
        } finally {
            setLoading(false);
        }
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMine();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchMine();
    }, [fetchMine]);

    useFocusEffect(
        React.useCallback(() => {
            fetchMine();
        }, [fetchMine])
    );

    if (!fontsLoaded) return null;

    const startEdit = (post) => {
        setEditingPostId(post.id);
        setEditingText(post.content);
    };

    const cancelEdit = () => {
        setEditingPostId(null);
        setEditingText('');
    };

    const saveEdit = async () => {
        const trimmed = editingText.trim();
        if (!trimmed) {
            Alert.alert('Missing content', 'Post content can’t be empty.');
            return;
        }
        if (!userId || !editingPostId) return;

        try {
            setSavingEdit(true);
            const { error } = await supabase
                .from('posts')
                .update({ content: trimmed })
                .eq('id', editingPostId)
                .eq('user_id', userId);

            if (error) throw error;

            setPosts((prev) =>
                prev.map((p) => (p.id === editingPostId ? { ...p, content: trimmed } : p))
            );
            cancelEdit();
        } catch (error) {
            console.error('Post update error:', error);
            Alert.alert('Error', 'Failed to update post.');
        } finally {
            setSavingEdit(false);
        }
    };

    const deletePost = async (postId) => {
        if (!userId) return;

        Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const { error } = await supabase
                            .from('posts')
                            .delete()
                            .eq('id', postId)
                            .eq('user_id', userId);
                        if (error) throw error;
                        setPosts((prev) => prev.filter((p) => p.id !== postId));
                    } catch (error) {
                        console.error('Post delete error:', error);
                        Alert.alert('Error', 'Failed to delete post.');
                    }
                },
            },
        ]);
    };

    const openPostActions = (post) => {
        Alert.alert('Post', 'Choose an action', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit', onPress: () => startEdit(post) },
            { text: 'Delete', style: 'destructive', onPress: () => deletePost(post.id) },
        ]);
    };

    const header = (
        <View>
            <View style={styles.header}>
                <Image
                    source={{
                        uri:
                            userProfile?.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                userProfile?.username || 'User'
                            )}`,
                    }}
                    style={styles.avatar}
                />
                <Text style={styles.name}>{userProfile?.username || 'User'}</Text>
                <Text style={styles.username}>@{userProfile?.username || 'user'}</Text>
            </View>

            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{friendsCount}</Text>
                    <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{postsCount}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <Pressable
                    onPress={() => navigation.navigate('AddPost')}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && styles.buttonPressed,
                    ]}
                >
                    <Icon name="plus" size={16} color="#fff" style={styles.btnIcon} />
                    <Text style={styles.primaryButtonText}>New Post</Text>
                </Pressable>

                <Pressable
                    onPress={() => navigation.navigate('Setting')}
                    style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.buttonPressed,
                    ]}
                >
                    <Icon name="settings" size={16} color="#111" style={styles.btnIcon} />
                    <Text style={styles.secondaryButtonText}>Settings</Text>
                </Pressable>
            </View>

            <View style={styles.friendsBlock}>
                <Text style={styles.friendsTitle}>Friends</Text>
                {friendsCount === 0 ? (
                    <Text style={styles.friendsEmpty}>No friends yet.</Text>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.friendsRow}
                    >
                        {friends.map((f) => (
                            <View key={f.id} style={styles.friendChip}>
                                <Image
                                    source={{
                                        uri:
                                            f.avatar_url ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                f.username || 'User'
                                            )}`,
                                    }}
                                    style={styles.friendAvatar}
                                />
                                <Text style={styles.friendName} numberOfLines={1}>
                                    {f.username || 'User'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {editingPostId ? (
                <View style={styles.inlineEditor}>
                    <Text style={styles.inlineEditorTitle}>Edit post</Text>
                    <TextInput
                        style={styles.editInput}
                        value={editingText}
                        onChangeText={setEditingText}
                        multiline
                        editable={!savingEdit}
                        textAlignVertical="top"
                    />
                    <View style={styles.editButtonsRow}>
                        <Pressable
                            onPress={cancelEdit}
                            disabled={savingEdit}
                            style={({ pressed }) => [
                                styles.smallButton,
                                pressed && !savingEdit && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.smallButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={saveEdit}
                            disabled={savingEdit}
                            style={({ pressed }) => [
                                styles.smallPrimaryButton,
                                pressed && !savingEdit && styles.buttonPressed,
                            ]}
                        >
                            {savingEdit ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.smallPrimaryButtonText}>Save</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            ) : null}

            <Text style={styles.sectionTitle}>My Posts</Text>
        </View>
    );

    const renderItem = ({ item }) => {
        return (
            <Pressable
                onPress={() => openPostActions(item)}
                style={({ pressed }) => [styles.gridItem, pressed && styles.gridItemPressed]}
            >
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.gridImage} />
                ) : (
                    <View style={styles.gridPlaceholder}>
                        <Icon name="file-text" size={20} color="#999" />
                    </View>
                )}
            </Pressable>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={TEAL} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={header}
                contentContainerStyle={styles.list}
                refreshing={refreshing}
                onRefresh={onRefresh}
                numColumns={3}
                columnWrapperStyle={styles.gridRow}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff',
    },

    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },

    list: {
        paddingBottom: 80,
    },

    header: {
        alignItems: 'center',
        paddingVertical: 20,
    },

    avatar: {
        width: 92,
        height: 92,
        borderRadius: 46,
        marginBottom: 10,
        backgroundColor: '#F5F5F5',
    },

    name: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 20,
        color: '#111',
    },

    username: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },

    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: '#E8E8E8',
        paddingHorizontal: 12,
    },

    stat: {
        alignItems: 'center',
    },

    statNumber: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
        color: '#111',
    },

    statLabel: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },

    actions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    friendsBlock: {
        paddingHorizontal: 16,
        paddingTop: 14,
    },

    friendsTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
        color: '#111',
        marginBottom: 10,
    },

    friendsEmpty: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 13,
        color: '#666',
    },

    friendsRow: {
        paddingRight: 8,
    },

    friendChip: {
        width: 72,
        alignItems: 'center',
        marginRight: 12,
    },

    friendAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F5F5F5',
    },

    friendName: {
        marginTop: 6,
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        color: '#111',
        maxWidth: 72,
        textAlign: 'center',
    },

    primaryButton: {
        flex: 1,
        backgroundColor: TEAL,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginRight: 10,
    },

    primaryButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#fff',
    },

    secondaryButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    secondaryButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#111',
    },

    btnIcon: {
        marginRight: 8,
    },

    buttonPressed: {
        opacity: 0.9,
    },

    sectionTitle: {
        marginTop: 18,
        marginBottom: 10,
        paddingHorizontal: 16,
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
        color: '#111',
    },

    inlineEditor: {
        marginTop: 14,
        paddingHorizontal: 16,
    },

    inlineEditorTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#111',
        marginBottom: 8,
    },

    editInput: {
        borderWidth: 1,
        borderColor: '#E8E8E8',
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#111',
        minHeight: 70,
        textAlignVertical: 'top',
    },

    editButtonsRow: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },

    smallButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        marginRight: 10,
        minWidth: 90,
        alignItems: 'center',
    },

    smallButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#111',
    },

    smallPrimaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: TEAL,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },

    smallPrimaryButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#fff',
    },

    gridRow: {
        paddingHorizontal: 2,
    },

    gridItem: {
        flex: 1,
        aspectRatio: 1,
        margin: 2,
        backgroundColor: '#F5F5F5',
    },

    gridItemPressed: {
        opacity: 0.9,
    },

    gridImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    gridPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
    },
});