import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function Home() {
    return (
        <ScrollView style={styles.container}>
            
            
            <View style={styles.content}>
                <Text style={styles.subtitle}>Welcome to Social Media App</Text>
                <Text style={styles.description}>
                    Stay connected with your friends and share moments.
                </Text>
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
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});