import * as React from 'react';
import { Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getFocusedRouteNameFromRoute,
  ParamListBase,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderBackButton } from '@react-navigation/elements';
import TouchableBounce from '../Shared/TouchableBounce';
import Albums from '../Shared/Albums';
import Contacts from '../Shared/Contacts';
import Chat from '../Shared/Chat';
import SimpleStackScreen, { SimpleStackParams } from './SimpleStack';

const getTabBarIcon = (name: string) => ({
  color,
  size,
}: {
  color: string;
  size: number;
}) => <MaterialCommunityIcons name={name} color={color} size={size} />;

type BottomTabParams = {
  TabStack: NavigatorScreenParams<SimpleStackParams>;
  TabAlbums: undefined;
  TabContacts: undefined;
  TabChat: undefined;
};

const BottomTabs = createBottomTabNavigator<BottomTabParams>();

export default function BottomTabsScreen({
  navigation,
  route,
}: StackScreenProps<ParamListBase, string>) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'Article';

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      title: routeName,
    });
  }, [navigation, routeName]);

  return (
    <BottomTabs.Navigator
      screenOptions={{
        headerLeft: (props) => (
          <HeaderBackButton {...props} onPress={navigation.goBack} />
        ),
        tabBarButton:
          Platform.OS === 'web'
            ? undefined
            : (props) => <TouchableBounce {...props} />,
      }}
    >
      <BottomTabs.Screen
        name="TabStack"
        component={SimpleStackScreen}
        options={{
          title: 'Article',
          tabBarIcon: getTabBarIcon('file-document'),
        }}
      />
      <BottomTabs.Screen
        name="TabChat"
        component={Chat}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: getTabBarIcon('message-reply'),
          tabBarBadge: 2,
        }}
      />
      <BottomTabs.Screen
        name="TabContacts"
        component={Contacts}
        options={{
          title: 'Contacts',
          tabBarIcon: getTabBarIcon('contacts'),
        }}
      />
      <BottomTabs.Screen
        name="TabAlbums"
        component={Albums}
        options={{
          title: 'Albums',
          tabBarIcon: getTabBarIcon('image-album'),
        }}
      />
    </BottomTabs.Navigator>
  );
}
