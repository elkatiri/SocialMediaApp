/* eslint-disable react-native/no-raw-text */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Feather'
import IconIonicons from 'react-native-vector-icons/Ionicons'

import Home from '../screens/home/home'
import Users from '../screens/users/users'
import Profile from '../screens/profile/profile'
import AddPost from '../screens/addPost/addPost'
import Setting from '../screens/setting/setting'

const Tab = createBottomTabNavigator()
const TEAL = '#1D9E75'

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets()

  const icons = {
    Home: { lib: 'Feather', name: 'home' },
    Users: { lib: 'Feather', name: 'users' },
    AddPost: { lib: 'Feather', name: 'plus-square' },
    Profile: { lib: 'Feather', name: 'user' },
    Setting: { lib: 'Feather', name: 'settings' },
  }

  const renderIcon = (routeName, isFocused) => {
    if (routeName === 'AddPost') return null

    const iconConfig = icons[routeName]
    const IconComponent = iconConfig?.lib === 'Feather' ? Icon : IconIonicons
    const iconName = iconConfig?.name

    if (!iconName) return null

    return (
      <IconComponent
        name={iconName}
        size={26}
        color={isFocused ? '#000000' : '#8E8E93'}
        strokeWidth={isFocused ? 2 : 1.5}
      />
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
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Users" component={Users} />
      <Tab.Screen name="AddPost" component={AddPost} />
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Setting" component={Setting} />
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