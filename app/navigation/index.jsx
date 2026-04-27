import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Welcome from '../screens/welcome/welcome';
import Login from '../screens/login/login';
import Register from '../screens/register/register';
// import Home from '../screens/home/home';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        {/* <Stack.Screen name="Home" component={Home} /> */}
      </Stack.Navigator>
  );
}