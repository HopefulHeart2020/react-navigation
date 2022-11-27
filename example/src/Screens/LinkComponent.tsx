import * as React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import {
  Link,
  StackActions,
  RouteProp,
  ParamListBase,
  useLinkProps,
} from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import Article from '../Shared/Article';
import Albums from '../Shared/Albums';

type SimpleStackParams = {
  Article: { author: string };
  Album: undefined;
};

type SimpleStackNavigation = StackNavigationProp<SimpleStackParams>;

const scrollEnabled = Platform.select({ web: true, default: false });

const LinkButton = ({
  to,
  ...rest
}: React.ComponentProps<typeof Button> & { to: string }) => {
  const { onPress, ...props } = useLinkProps({ to });

  return (
    <Button
      {...props}
      {...rest}
      {...Platform.select({
        web: { onClick: onPress } as any,
        default: { onPress },
      })}
    />
  );
};

const ArticleScreen = ({
  navigation,
  route,
}: {
  navigation: SimpleStackNavigation;
  route: RouteProp<SimpleStackParams, 'Article'>;
}) => {
  return (
    <ScrollView>
      <View style={styles.buttons}>
        <Link
          to="/link-component/Album"
          style={[styles.button, { padding: 8 }]}
        >
          Go to /link-component/Album
        </Link>
        <Link
          to="/link-component/Album"
          action={StackActions.replace('Album')}
          style={[styles.button, { padding: 8 }]}
        >
          Replace with /link-component/Album
        </Link>
        <LinkButton
          to="/link-component/Album"
          mode="contained"
          style={styles.button}
        >
          Go to /link-component/Album
        </LinkButton>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Go back
        </Button>
      </View>
      <Article
        author={{ name: route.params.author }}
        scrollEnabled={scrollEnabled}
      />
    </ScrollView>
  );
};

const AlbumsScreen = ({
  navigation,
}: {
  navigation: SimpleStackNavigation;
}) => {
  return (
    <ScrollView>
      <View style={styles.buttons}>
        <Link
          to="/link-component/Article?author=Babel"
          style={[styles.button, { padding: 8 }]}
        >
          Go to /link-component/Article
        </Link>
        <LinkButton
          to="/link-component/Article?author=Babel"
          mode="contained"
          style={styles.button}
        >
          Go to /link-component/Article
        </LinkButton>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Go back
        </Button>
      </View>
      <Albums scrollEnabled={scrollEnabled} />
    </ScrollView>
  );
};

const SimpleStack = createStackNavigator<SimpleStackParams>();

type Props = Partial<React.ComponentProps<typeof SimpleStack.Navigator>> & {
  navigation: StackNavigationProp<ParamListBase>;
};

export default function SimpleStackScreen({ navigation, ...rest }: Props) {
  navigation.setOptions({
    headerShown: false,
  });

  return (
    <SimpleStack.Navigator {...rest}>
      <SimpleStack.Screen
        name="Article"
        component={ArticleScreen}
        options={({ route }) => ({
          title: `Article by ${route.params.author}`,
        })}
        initialParams={{ author: 'Gandalf' }}
      />
      <SimpleStack.Screen
        name="Album"
        component={AlbumsScreen}
        options={{ title: 'Album' }}
      />
    </SimpleStack.Navigator>
  );
}

const styles = StyleSheet.create({
  buttons: {
    padding: 8,
  },
  button: {
    margin: 8,
  },
});
