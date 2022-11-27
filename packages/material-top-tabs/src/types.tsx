import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { TabBar, SceneRendererProps, TabView } from 'react-native-tab-view';
import {
  ParamListBase,
  Descriptor,
  NavigationHelpers,
  Route,
  NavigationProp,
} from '@react-navigation/native';
import { TabNavigationState } from '@react-navigation/routers';

export type MaterialTopTabNavigationEventMap = {
  /**
   * Event which fires on tapping on the tab in the tab bar.
   */
  tabPress: undefined;
  /**
   * Event which fires on long press on the tab in the tab bar.
   */
  tabLongPress: undefined;
  /**
   * Event which fires when a swipe gesture starts, i.e. finger touches the screen.
   */
  swipeStart: undefined;
  /**
   * Event which fires when a swipe gesture ends, i.e. finger leaves the screen.
   */
  swipeEnd: undefined;
};

export type MaterialTopTabNavigationHelpers = NavigationHelpers<
  ParamListBase,
  MaterialTopTabNavigationEventMap
>;

export type MaterialTopTabNavigationProp<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList = string
> = NavigationProp<
  ParamList,
  RouteName,
  TabNavigationState,
  MaterialTopTabNavigationOptions,
  MaterialTopTabNavigationEventMap
> & {
  /**
   * Jump to an existing tab.
   *
   * @param name Name of the route for the tab.
   * @param [params] Params object for the route.
   */
  jumpTo<RouteName extends Extract<keyof ParamList, string>>(
    ...args: ParamList[RouteName] extends undefined | any
      ? [RouteName] | [RouteName, ParamList[RouteName]]
      : [RouteName, ParamList[RouteName]]
  ): void;
};

export type MaterialTopTabNavigationOptions = {
  /**
   * Title text for the screen.
   */
  title?: string;

  /**
   * Title string of a tab displayed in the tab bar
   * or a function that given { focused: boolean, color: string } returns a React.Node, to display in tab bar.
   * When undefined, scene title is used. To hide, see tabBarOptions.showLabel in the previous section.
   */
  tabBarLabel?:
    | string
    | ((props: { focused: boolean; color: string }) => React.ReactNode);

  /**
   * A function that given { focused: boolean, color: string } returns a React.Node to display in the tab bar.
   */
  tabBarIcon?: (props: { focused: boolean; color: string }) => React.ReactNode;

  /**
   * Accessibility label for the tab button. This is read by the screen reader when the user taps the tab.
   * It's recommended to set this if you don't have a label for the tab.
   */
  tabBarAccessibilityLabel?: string;

  /**
   * ID to locate this tab button in tests.
   */
  tabBarTestID?: string;

  /**
   * Boolean indicating whether the tab bar is visible when this screen is active.
   */
  tabBarVisible?: boolean;
};

export type MaterialTopTabDescriptor = Descriptor<
  ParamListBase,
  string,
  TabNavigationState,
  MaterialTopTabNavigationOptions
>;

export type MaterialTopTabDescriptorMap = {
  [key: string]: MaterialTopTabDescriptor;
};

export type MaterialTopTabNavigationConfig = Partial<
  Omit<
    React.ComponentProps<typeof TabView>,
    | 'navigationState'
    | 'onIndexChange'
    | 'onSwipeStart'
    | 'onSwipeEnd'
    | 'renderScene'
    | 'renderTabBar'
    | 'renderLazyPlaceholder'
  >
> & {
  /**
   * Function that returns a React element to render for routes that haven't been rendered yet.
   * Receives an object containing the route as the prop.
   * The lazy prop also needs to be enabled.
   *
   * This view is usually only shown for a split second. Keep it lightweight.
   *
   * By default, this renders null.
   */
  lazyPlaceholder?: (props: { route: Route<string> }) => React.ReactNode;
  /**
   * Function that returns a React element to display as the tab bar.
   */
  tabBar?: (props: MaterialTopTabBarProps) => React.ReactNode;
  /**
   * Options for the tab bar which will be passed as props to the tab bar component.
   */
  tabBarOptions?: MaterialTopTabBarOptions;
  /**
   * Position of the tab bar. Defaults to `top`.
   */
  tabBarPosition?: 'top' | 'bottom';
};

export type MaterialTopTabBarOptions = Partial<
  Omit<
    React.ComponentProps<typeof TabBar>,
    | 'navigationState'
    | 'activeColor'
    | 'inactiveColor'
    | 'renderLabel'
    | 'renderIcon'
    | 'getLabelText'
    | 'getAccessibilityLabel'
    | 'getTestID'
    | 'onTabPress'
    | 'onTabLongPress'
    | keyof SceneRendererProps
  >
> & {
  /**
   * Color for the icon and label in the active tab.
   */
  activeTintColor?: string;
  /**
   * Color for the icon and label in the inactive tabs.
   */
  inactiveTintColor?: string;
  /**
   * Style object for the tab icon container.
   */
  iconStyle?: StyleProp<ViewStyle>;
  /**
   * Style object for the tab label.
   */
  labelStyle?: StyleProp<TextStyle>;
  /**
   * Whether the tab label should be visible. Defaults to `true`.
   */
  showLabel?: boolean;
  /**
   * Whether the tab icon should be visible. Defaults to `false`.
   */
  showIcon?: boolean;
  /**
   * Whether label font should scale to respect Text Size accessibility settings.
   */
  allowFontScaling?: boolean;
};

export type MaterialTopTabBarProps = MaterialTopTabBarOptions &
  SceneRendererProps & {
    state: TabNavigationState;
    navigation: NavigationHelpers<
      ParamListBase,
      MaterialTopTabNavigationEventMap
    >;
    descriptors: MaterialTopTabDescriptorMap;
  };
