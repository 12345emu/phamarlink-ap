import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { TabView } from 'react-native-tab-view';
import CustomTabBar from './CustomTabBar';

import Pharmacies from '../app/(tabs)/pharmacies';
import Orders from '../app/(tabs)/orders';
import Chat from '../app/(tabs)/chat';
import Profile from '../app/(tabs)/profile';
import Home from '../app/(tabs)/index';

const initialLayout = { width: Dimensions.get('window').width };

const routes = [
  { key: 'pharmacies', name: 'pharmacies', title: 'Pharmacies' },
  { key: 'orders', name: 'orders', title: 'Orders' },
  { key: 'index', name: 'index', title: 'Home' },
  { key: 'chat', name: 'chat', title: 'Chat' },
  { key: 'profile', name: 'profile', title: 'Profile' },
];

export default function SwipeableTabs() {
  const [index, setIndex] = useState(2); // Home is center
  const profileIndex = routes.findIndex(r => r.key === 'profile');

  const navigation = {
    navigate: (routeName: string) => {
      const idx = routes.findIndex(r => r.key === routeName);
      if (idx !== -1) setIndex(idx);
    },
  };

  const renderScene = ({ route }: { route: any }) => {
    switch (route.key) {
      case 'pharmacies':
        return <Pharmacies />;
      case 'orders':
        return <Orders />;
      case 'index':
        return <Home goToProfile={() => setIndex(profileIndex)} navigation={navigation} />;
      case 'chat':
        return <Chat />;
      case 'profile':
        return <Profile />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        renderTabBar={() => null}
        swipeEnabled
      />
      <CustomTabBar
        state={{
          key: 'tabview',
          index,
          routeNames: routes.map(r => r.name),
          routes,
          type: 'tab',
          stale: false,
          history: [],
          preloadedRouteKeys: [],
        }}
        navigation={navigation as any}
        descriptors={{}}
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    </View>
  );
} 