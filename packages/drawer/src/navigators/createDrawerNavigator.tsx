import {
  createNavigatorFactory,
  DefaultNavigatorOptions,
  DrawerActionHelpers,
  DrawerNavigationState,
  DrawerRouter,
  DrawerRouterOptions,
  ParamListBase,
  useNavigationBuilder,
} from '@react-navigation/native';
import * as React from 'react';
import warnOnce from 'warn-once';

import type {
  DrawerNavigationConfig,
  DrawerNavigationEventMap,
  DrawerNavigationOptions,
} from '../types';
import DrawerView from '../views/DrawerView';

type Props = DefaultNavigatorOptions<
  ParamListBase,
  DrawerNavigationState<ParamListBase>,
  DrawerNavigationOptions,
  DrawerNavigationEventMap
> &
  DrawerRouterOptions &
  DrawerNavigationConfig;

function DrawerNavigator({
  initialRouteName,
  defaultStatus,
  backBehavior,
  children,
  screenListeners,
  screenOptions,
  // @ts-expect-error: lazy is deprecated
  lazy,
  // @ts-expect-error: drawerContentOptions is deprecated
  drawerContentOptions,
  ...rest
}: Props) {
  let defaultScreenOptions: DrawerNavigationOptions = {};

  if (drawerContentOptions) {
    Object.assign(defaultScreenOptions, {
      drawerPosition: drawerContentOptions.drawerPosition,
      drawerType: drawerContentOptions.drawerType,
      swipeEdgeWidth: drawerContentOptions.edgeWidth,
      drawerHideStatusBarOnOpen: drawerContentOptions.hideStatusBar,
      keyboardDismissMode: drawerContentOptions.keyboardDismissMode,
      swipeMinDistance: drawerContentOptions.minSwipeDistance,
      overlayColor: drawerContentOptions.overlayColor,
      drawerStatusBarAnimation: drawerContentOptions.statusBarAnimation,
      gestureHandlerProps: drawerContentOptions.gestureHandlerProps,
    });

    warnOnce(
      drawerContentOptions,
      `Drawer Navigator: 'drawerContentOptions' is deprecated. Migrate the options to 'screenOptions' instead.\n\nPlace the following in 'screenOptions' in your code to keep current behavior:\n\n${JSON.stringify(
        defaultScreenOptions,
        null,
        2
      )}\n\nSee https://reactnavigation.org/docs/6.x/drawer-navigator#options for more details.`
    );
  }

  if (typeof lazy === 'boolean') {
    defaultScreenOptions.lazy = lazy;

    warnOnce(
      true,
      `Drawer Navigator: 'lazy' in props is deprecated. Move it to 'screenOptions' instead.`
    );
  }

  const {
    state,
    descriptors,
    navigation,
    NavigationContent,
  } = useNavigationBuilder<
    DrawerNavigationState<ParamListBase>,
    DrawerRouterOptions,
    DrawerActionHelpers<ParamListBase>,
    DrawerNavigationOptions,
    DrawerNavigationEventMap
  >(DrawerRouter, {
    initialRouteName,
    defaultStatus,
    backBehavior,
    children,
    screenListeners,
    screenOptions,
    defaultScreenOptions,
  });

  return (
    <NavigationContent>
      <DrawerView
        {...rest}
        state={state}
        descriptors={descriptors}
        navigation={navigation}
      />
    </NavigationContent>
  );
}

export default createNavigatorFactory<
  DrawerNavigationState<ParamListBase>,
  DrawerNavigationOptions,
  DrawerNavigationEventMap,
  typeof DrawerNavigator
>(DrawerNavigator);
