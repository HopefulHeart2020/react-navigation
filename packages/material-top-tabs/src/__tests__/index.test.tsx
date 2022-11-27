import * as React from 'react';
import { View, Text, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer, ParamListBase } from '@react-navigation/native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabScreenProps,
} from '../index';

it('renders a material bottom tab navigator with screens', async () => {
  const Test = ({
    route,
    navigation,
  }: MaterialTopTabScreenProps<ParamListBase>) => (
    <View>
      <Text>Screen {route.name}</Text>
      <Button onPress={() => navigation.navigate('A')} title="Go to A" />
      <Button onPress={() => navigation.navigate('B')} title="Go to B" />
    </View>
  );

  const Tab = createMaterialTopTabNavigator();

  const { findByText, queryByText } = render(
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="A" component={Test} />
        <Tab.Screen name="B" component={Test} />
      </Tab.Navigator>
    </NavigationContainer>
  );

  expect(queryByText('Screen A')).not.toBeNull();
  expect(queryByText('Screen B')).toBeNull();

  fireEvent(await findByText('Go to B'), 'press');

  expect(queryByText('Screen B')).not.toBeNull();
});
