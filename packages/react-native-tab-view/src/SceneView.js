/* @flow */

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyleProp } from 'react-native/Libraries/StyleSheet/StyleSheet';
import type {
  SceneRendererProps,
  EventEmitterProps,
  NavigationState,
  Route,
} from './types';

type Props<T: Route> = {|
  ...SceneRendererProps,
  ...EventEmitterProps,
  navigationState: NavigationState<T>,
  lazy: boolean,
  index: number,
  children: (props: { loading: boolean }) => React.Node,
  style?: ViewStyleProp,
|};

type State = {
  loading: boolean,
};

export default class SceneView<T: Route> extends React.Component<
  Props<T>,
  State
> {
  static getDerivedStateFromProps(props: Props<T>, state: State) {
    if (state.loading && props.navigationState.index === props.index) {
      // Always render the route when it becomes focused
      return { loading: false };
    }

    return null;
  }

  state = {
    loading: this.props.navigationState.index !== this.props.index,
  };

  componentDidMount() {
    if (this.props.lazy) {
      // If lazy mode is enabled, listen to when we enter screens
      this.props.addListener('enter', this._handleEnter);
    } else if (this.state.loading) {
      // If lazy mode is not enabled, render the scene with a delay if not loaded already
      // This improves the initial startup time as the scene is no longer blocking
      setTimeout(() => this.setState({ loading: false }), 0);
    }
  }

  componentDidUpdate(prevProps: Props<T>, prevState: State) {
    if (
      this.props.lazy !== prevProps.lazy ||
      this.state.loading !== prevState.loading
    ) {
      // We only need the listener if the tab hasn't loaded yet and lazy is enabled
      if (this.props.lazy && this.state.loading) {
        this.props.addListener('enter', this._handleEnter);
      } else {
        this.props.removeListener('enter', this._handleEnter);
      }
    }
  }

  componentWillUnmount() {
    this.props.removeListener('enter', this._handleEnter);
  }

  _handleEnter = value => {
    const { index } = this.props;

    // If we're entering the current route, we need to load it
    if (value === index && this.state.loading) {
      this.setState({ loading: false });
    }
  };

  render() {
    const { navigationState, index, layout, style } = this.props;
    const { loading } = this.state;

    const focused = navigationState.index === index;

    return (
      <View
        accessibilityElementsHidden={!focused}
        importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.route,
          // If we don't have the layout yet, make the focused screen fill the container
          // This avoids delay before we are able to render pages side by side
          layout.width
            ? { width: layout.width }
            : focused
            ? StyleSheet.absoluteFill
            : null,
          style,
        ]}
      >
        {// Only render the route only if it's either focused or layout is available
        // When layout is not available, we must not render unfocused routes
        // so that the focused route can fill the screen
        focused || layout.width ? this.props.children({ loading }) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  route: {
    flex: 1,
    overflow: 'hidden',
  },
});
