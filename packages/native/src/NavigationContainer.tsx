import * as React from 'react';
import {
  BaseNavigationContainer,
  NavigationContainerProps,
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/core';
import ThemeProvider from './theming/ThemeProvider';
import DefaultTheme from './theming/DefaultTheme';
import LinkingContext from './LinkingContext';
import useThenable from './useThenable';
import useLinking from './useLinking';
import useDocumentTitle from './useDocumentTitle';
import useBackButton from './useBackButton';
import type { Theme, LinkingOptions, DocumentTitleOptions } from './types';

type Props<ParamList extends {}> = NavigationContainerProps & {
  theme?: Theme;
  linking?: LinkingOptions<ParamList>;
  fallback?: React.ReactNode;
  documentTitle?: DocumentTitleOptions;
  onReady?: () => void;
};

/**
 * Container component which holds the navigation state designed for React Native apps.
 * This should be rendered at the root wrapping the whole app.
 *
 * @param props.initialState Initial state object for the navigation tree. When deep link handling is enabled, this will override deep links when specified. Make sure that you don't specify an `initialState` when there's a deep link (`Linking.getInitialURL()`).
 * @param props.onReady Callback which is called after the navigation tree mounts.
 * @param props.onStateChange Callback which is called with the latest navigation state when it changes.
 * @param props.theme Theme object for the navigators.
 * @param props.linking Options for deep linking. Deep link handling is enabled when this prop is provided, unless `linking.enabled` is `false`.
 * @param props.fallback Fallback component to render until we have finished getting initial state when linking is enabled. Defaults to `null`.
 * @param props.documentTitle Options to configure the document title on Web. Updating document title is handled by default unless `documentTitle.enabled` is `false`.
 * @param props.children Child elements to render the content.
 * @param props.ref Ref object which refers to the navigation object containing helper methods.
 */
function NavigationContainerInner(
  {
    theme = DefaultTheme,
    linking,
    fallback = null,
    documentTitle,
    onReady,
    ...rest
  }: Props<ParamListBase>,
  ref?: React.Ref<NavigationContainerRef<ParamListBase> | null>
) {
  const isLinkingEnabled = linking ? linking.enabled !== false : false;

  const refContainer = React.useRef<NavigationContainerRef<ParamListBase>>(
    null
  );

  useBackButton(refContainer);
  useDocumentTitle(refContainer, documentTitle);

  const { getInitialState } = useLinking(refContainer, {
    enabled: isLinkingEnabled,
    prefixes: [],
    ...linking,
  });

  const [isResolved, initialState] = useThenable(getInitialState);

  React.useImperativeHandle(ref, () => refContainer.current);

  const linkingContext = React.useMemo(() => ({ options: linking }), [linking]);

  const isReady = rest.initialState != null || !isLinkingEnabled || isResolved;

  const onReadyRef = React.useRef(onReady);

  React.useEffect(() => {
    onReadyRef.current = onReady;
  });

  React.useEffect(() => {
    if (isReady) {
      onReadyRef.current?.();
    }
  }, [isReady]);

  if (!isReady) {
    // This is temporary until we have Suspense for data-fetching
    // Then the fallback will be handled by a parent `Suspense` component
    return fallback as React.ReactElement;
  }

  return (
    <LinkingContext.Provider value={linkingContext}>
      <ThemeProvider value={theme}>
        <BaseNavigationContainer
          {...rest}
          initialState={
            rest.initialState == null ? initialState : rest.initialState
          }
          ref={refContainer}
        />
      </ThemeProvider>
    </LinkingContext.Provider>
  );
}

const NavigationContainer = React.forwardRef(NavigationContainerInner) as <
  RootParamList extends {} = ReactNavigation.RootParamList
>(
  props: Props<RootParamList> & {
    ref?: React.Ref<NavigationContainerRef<RootParamList>>;
  }
) => React.ReactElement;

export default NavigationContainer;
