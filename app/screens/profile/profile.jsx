import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProfileScreen() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // useEffect(() => {
    //     // Fetch authenticated user data
    //     fetchUserProfile();
    // }, []);

    // const fetchUserProfile = async () => {
    //     try {
    //         // Replace with your actual API call
    //         const response = await fetch('/api/user/profile');
    //         const data = await response.json();
    //         setUser(data);
    //     } catch (error) {
    //         console.error('Error fetching profile:', error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // if (loading) {
    //     return (
    //         <View style={styles.container}>
    //             <Text>Loading...</Text>
    //         </View>
    //     );
    // }

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <Image
                    source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }}
                    style={styles.avatar}
                />
                <Text style={styles.name}>{user?.name}</Text>
                <Text style={styles.username}>@{user?.username}</Text>
                <Text style={styles.bio}>{user?.bio}</Text>
            </View>

            {/* Stats */}
            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{user?.followers || 0}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{user?.following || 0}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{user?.posts || 0}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                    <Text style={styles.secondaryButtonText}>Settings</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    username: {
        fontSize: 16,
        color: '#666',
    },
    bio: {
        fontSize: 14,
        color: '#999',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    stat: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
    },
    button: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#f0f0f0',
    },
    secondaryButtonText: {
        color: '#000',
        fontWeight: '600',
    },
});