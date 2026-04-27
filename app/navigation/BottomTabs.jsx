import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import Home from '../screens/home/home';
import Profile from '../screens/profile/profile';
import AddPost from '../screens/addPost/addPost';
import Setting from '../screens/setting/setting';

const Tab = createBottomTabNavigator();
const TEAL = '#1D9E75';

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  const icons = {
    Home: 'home',
    AddPost: 'plus',
    Profile: 'user',
    Setting: 'settings',
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 10 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isAdd = route.name === 'AddPost';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isAdd) {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.addButton}>
                <Icon name="plus" size={20} color="#fff" />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <Icon
                name={icons[route.name]}
                size={20}
                color={isFocused ? '#fff' : '#555'}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="AddPost" component={AddPost} />
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Setting" component={Setting} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 0,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapActive: {
    backgroundColor: '#2a2a2a',
  },

  addButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});