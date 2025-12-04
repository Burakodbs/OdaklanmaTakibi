import {Tabs} from 'expo-router';
import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import {HapticTab} from '@/components/haptic-tab';
import {Colors} from '@/constants/theme';
import {useColorScheme} from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.icon,
          tabBarStyle: {
              backgroundColor: colors.card,
              borderTopWidth: 0,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: -2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              height: 60,
              paddingBottom: 5,
          },
          tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
          },
      }}>
      <Tabs.Screen
        name="index"
        options={{
            title: 'Zamanlayıcı',
            tabBarIcon: ({color, size}) => (
                <MaterialCommunityIcons name="timer-sand" color={color} size={size}/>
            ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
            title: 'Raporlar',
            tabBarIcon: ({color, size}) => (
                <MaterialCommunityIcons name="chart-bar" color={color} size={size}/>
            ),
        }}
      />
    </Tabs>
  );
}
