/* @flow */

import * as React from 'react';
import { StyleSheet, Keyboard, I18nManager } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';

import type {
  Layout,
  NavigationState,
  Route,
  Listener,
  PagerCommonProps,
  EventEmitterProps,
} from './types';

type Props<T: Route> = {|
  ...PagerCommonProps,
  onIndexChange: (index: number) => mixed,
  navigationState: NavigationState<T>,
  layout: Layout,
  // Clip unfocused views to improve memory usage
  // Don't enable this on iOS where this is buggy and views don't re-appear
  removeClippedSubviews?: boolean,
  children: (props: {|
    // Listeners for a when we enter a new screen
    ...EventEmitterProps,
    // Animated value which represents the state of current index
    // It can include fractional digits as it represents the intermediate value
    position: Animated.Node<number>,
    // Function to actually render the content of the pager
    // The parent component takes care of rendering
    render: (children: React.Node) => React.Node,
    // Callback to call when switching the tab
    // The tab switch animation is performed even if the index in state is unchanged
    jumpTo: (key: string) => void,
  |}) => React.Node,
|};

const {
  Clock,
  Value,
  onChange,
  abs,
  add,
  and,
  block,
  call,
  ceil,
  clockRunning,
  cond,
  divide,
  eq,
  event,
  floor,
  greaterThan,
  lessThan,
  max,
  min,
  multiply,
  neq,
  or,
  not,
  round,
  set,
  spring,
  startClock,
  stopClock,
  sub,
  timing,
} = Animated;

const TRUE = 1;
const FALSE = 0;
const NOOP = 0;
const UNSET = -1;

const DIRECTION_LEFT = 1;
const DIRECTION_RIGHT = -1;

const SWIPE_DISTANCE_MINIMUM = 20;
const SWIPE_DISTANCE_MULTIPLIER = 1 / 1.75;

const SPRING_CONFIG = {
  damping: 30,
  mass: 1,
  stiffness: 200,
  overshootClamping: true,
  restSpeedThreshold: 0.001,
  restDisplacementThreshold: 0.001,
};

const TIMING_CONFIG = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

export default class Pager<T: Route> extends React.Component<Props<T>> {
  static defaultProps = {
    swipeVelocityThreshold: 1200,
  };

  componentDidUpdate(prevProps: Props<T>) {
    const { index } = this.props.navigationState;

    if (
      // Check for index in state to avoid unintended transition if component updates during swipe
      (index !== prevProps.navigationState.index &&
        index !== this._currentIndexValue) ||
      // Check if the user updated the index correctly after an update
      (typeof this._pendingIndexValue === 'number' &&
        index !== this._pendingIndexValue)
    ) {
      // Index in user's state is different from the index being tracked
      this._jumpToIndex(index);
    }

    // Reset the pending index
    this._pendingIndexValue = undefined;

    // Update our mappings of animated nodes when props change
    if (
      prevProps.navigationState.routes.length !==
      this.props.navigationState.routes.length
    ) {
      this._routesLength.setValue(this.props.navigationState.routes.length);
    }

    if (prevProps.layout.width !== this.props.layout.width) {
      this._progress.setValue(-index * this.props.layout.width);
      this._layoutWidth.setValue(this.props.layout.width);
    }

    if (this.props.swipeDistanceThreshold != null) {
      if (
        prevProps.swipeDistanceThreshold !== this.props.swipeDistanceThreshold
      ) {
        this._swipeDistanceThreshold.setValue(
          this.props.swipeDistanceThreshold
        );
      }
    } else {
      if (prevProps.layout.width !== this.props.layout.width) {
        this._swipeDistanceThreshold.setValue(
          this.props.layout.width * SWIPE_DISTANCE_MULTIPLIER
        );
      }
    }

    if (
      prevProps.swipeVelocityThreshold !== this.props.swipeVelocityThreshold
    ) {
      this._swipeVelocityThreshold.setValue(this.props.swipeVelocityThreshold);
    }

    if (prevProps.springConfig !== this.props.springConfig) {
      const { springConfig } = this.props;

      this._springConfig.damping.setValue(
        springConfig.damping !== undefined
          ? springConfig.damping
          : SPRING_CONFIG.damping
      );

      this._springConfig.mass.setValue(
        springConfig.mass !== undefined ? springConfig.mass : SPRING_CONFIG.mass
      );

      this._springConfig.stiffness.setValue(
        springConfig.stiffness !== undefined
          ? springConfig.stiffness
          : SPRING_CONFIG.stiffness
      );

      this._springConfig.restSpeedThreshold.setValue(
        springConfig.restSpeedThreshold !== undefined
          ? springConfig.restSpeedThreshold
          : SPRING_CONFIG.restSpeedThreshold
      );

      this._springConfig.restDisplacementThreshold.setValue(
        springConfig.restDisplacementThreshold !== undefined
          ? springConfig.restDisplacementThreshold
          : SPRING_CONFIG.restDisplacementThreshold
      );
    }

    if (prevProps.timingConfig !== this.props.timingConfig) {
      const { timingConfig } = this.props;

      this._timingConfig.duration.setValue(
        timingConfig.duration !== undefined
          ? timingConfig.duration
          : TIMING_CONFIG.duration
      );
    }
  }

  // Clock used for tab transition animations
  _clock = new Clock();

  // Current state of the gesture
  _velocityX = new Value(0);
  _gestureX = new Value(0);
  _gestureState = new Value(State.UNDETERMINED);
  _offsetX = new Value(0);

  // Current progress of the page (translateX value)
  _progress = new Value(
    // Initial value is based on the index and page width
    this.props.navigationState.index * this.props.layout.width * DIRECTION_RIGHT
  );

  // Initial index of the tabs
  _index = new Value(this.props.navigationState.index);

  // Next index of the tabs, updated for navigation from outside (tab press, state update)
  _nextIndex = new Value(UNSET);

  // Scene that was last entered
  _lastEnteredIndex = new Value(this.props.navigationState.index);

  // Whether the user is currently dragging the screen
  _isSwiping = new Value(FALSE);

  // Whether the update was due to swipe gesture
  // This controls whether the transition will use a spring or timing animation
  // Remember to set it before transition needs to occur
  _isSwipeGesture = new Value(FALSE);

  // Mappings to some prop values
  // We use them in animation calculations, so we need live animated nodes
  _routesLength = new Value(this.props.navigationState.routes.length);
  _layoutWidth = new Value(this.props.layout.width);

  // Threshold values to determine when to trigger a swipe gesture
  _swipeDistanceThreshold = new Value(this.props.swipeDistanceThreshold || 180);
  _swipeVelocityThreshold = new Value(this.props.swipeVelocityThreshold);

  // The position value represent the position of the pager on a scale of 0 - routes.length-1
  // It is calculated based on the translate value and layout width
  // If we don't have the layout yet, we should return the current index
  _position = cond(
    this._layoutWidth,
    divide(multiply(this._progress, -1), this._layoutWidth),
    this._index
  );

  // Animation configuration
  _springConfig = {
    damping: new Value(
      this.props.springConfig.damping !== undefined
        ? this.props.springConfig.damping
        : SPRING_CONFIG.damping
    ),
    mass: new Value(
      this.props.springConfig.mass !== undefined
        ? this.props.springConfig.mass
        : SPRING_CONFIG.mass
    ),
    stiffness: new Value(
      this.props.springConfig.stiffness !== undefined
        ? this.props.springConfig.stiffness
        : SPRING_CONFIG.stiffness
    ),
    restSpeedThreshold: new Value(
      this.props.springConfig.restSpeedThreshold !== undefined
        ? this.props.springConfig.restSpeedThreshold
        : SPRING_CONFIG.restSpeedThreshold
    ),
    restDisplacementThreshold: new Value(
      this.props.springConfig.restDisplacementThreshold !== undefined
        ? this.props.springConfig.restDisplacementThreshold
        : SPRING_CONFIG.restDisplacementThreshold
    ),
  };

  _timingConfig = {
    duration: new Value(
      this.props.timingConfig.duration !== undefined
        ? this.props.timingConfig.duration
        : TIMING_CONFIG.duration
    ),
  };

  // The reason for using this value instead of simply passing `this._velocity`
  // into a spring animation is that we need to reverse it if we're using RTL mode.
  // Also, it's not possible to pass multiplied value there, because
  // value passed to STATE of spring (the first argument) has to be Animated.Value
  // and it's not allowed to pass other nodes there. The result of multiplying is not an
  // Animated.Value. So this value is being updated on each start of spring animation.
  _initialVelocityForSpring = new Value(0);

  // The current index change caused by the pager's animation
  // The pager is used as a controlled component
  // We need to keep track of the index to determine when to trigger animation
  // The state will change at various points, we should only respond when we are out of sync
  // This will ensure smoother animation and avoid weird glitches
  _currentIndexValue = this.props.navigationState.index;

  // The pending index value as result of state update caused by swipe gesture
  // We need to set it when state changes from inside this component
  // It also needs to be reset right after componentDidUpdate fires
  _pendingIndexValue: ?number = undefined;

  // Listeners for the entered screen
  _enterListeners: Listener[] = [];

  _jumpToIndex = (index: number) => {
    // If the index changed, we need to trigger a tab switch
    this._isSwipeGesture.setValue(FALSE);
    this._nextIndex.setValue(index);
  };

  _jumpTo = (key: string) => {
    const { navigationState } = this.props;

    const index = navigationState.routes.findIndex(route => route.key === key);

    // A tab switch might occur when we're in the middle of a transition
    // In that case, the index might be same as before
    // So we conditionally make the pager to update the position
    if (navigationState.index === index) {
      this._jumpToIndex(index);
    } else {
      this.props.onIndexChange(index);
    }
  };

  _addListener = (type: 'enter', listener: Listener) => {
    switch (type) {
      case 'enter':
        this._enterListeners.push(listener);
        break;
    }
  };

  _removeListener = (type: 'enter', listener: Listener) => {
    switch (type) {
      case 'enter': {
        const index = this._enterListeners.indexOf(listener);

        if (index > -1) {
          this._enterListeners.splice(index, 1);
        }

        break;
      }
    }
  };

  _handleEnteredIndexChange = ([value]: [number]) => {
    const index = Math.max(
      0,
      Math.min(value, this.props.navigationState.routes.length - 1)
    );

    this._enterListeners.forEach(listener => listener(index));
  };

  _transitionTo = (index: Animated.Node<number>) => {
    const toValue = new Value(0);
    const frameTime = new Value(0);

    const state = {
      position: this._progress,
      time: new Value(0),
      finished: new Value(FALSE),
    };

    return block([
      cond(clockRunning(this._clock), NOOP, [
        // Animation wasn't running before
        // Set the initial values and start the clock
        set(toValue, multiply(index, this._layoutWidth, DIRECTION_RIGHT)),
        set(frameTime, 0),
        set(state.time, 0),
        set(state.finished, FALSE),
        set(this._index, index),
        startClock(this._clock),
      ]),
      cond(
        this._isSwipeGesture,
        // Animate the values with a spring for swipe
        [
          cond(
            not(clockRunning(this._clock)),
            I18nManager.isRTL
              ? set(
                  this._initialVelocityForSpring,
                  multiply(-1, this._velocityX)
                )
              : set(this._initialVelocityForSpring, this._velocityX)
          ),
          spring(
            this._clock,
            { ...state, velocity: this._initialVelocityForSpring },
            { ...SPRING_CONFIG, ...this._springConfig, toValue }
          ),
        ],
        // Otherwise use a timing animation for faster switching
        timing(
          this._clock,
          { ...state, frameTime },
          { ...TIMING_CONFIG, ...this._timingConfig, toValue }
        )
      ),
      cond(state.finished, [
        // Reset values
        set(this._isSwipeGesture, FALSE),
        set(this._gestureX, 0),
        set(this._velocityX, 0),
        // When the animation finishes, stop the clock
        stopClock(this._clock),
      ]),
    ]);
  };

  _handleGestureEvent = event([
    {
      nativeEvent: {
        translationX: this._gestureX,
        velocityX: this._velocityX,
        state: this._gestureState,
      },
    },
  ]);

  _translateX = block([
    onChange(
      this._index,
      call([this._index], ([value]) => {
        this._currentIndexValue = value;

        // Without this check, the pager can go to an infinite update <-> animate loop for sync updates
        if (value !== this.props.navigationState.index) {
          // If the index changed, and previous animation has finished, update state
          this.props.onIndexChange(value);

          this._pendingIndexValue = value;

          // Force componentDidUpdate to fire, whether user does a setState or not
          // This allows us to detect when the user drops the update and revert back
          // It's necessary to make sure that the state stays in sync
          this.forceUpdate();
        }
      })
    ),
    onChange(
      this._position,
      // Listen to updates in the position to detect when we enter a screen
      // This is useful for things such as lazy loading when index change will fire too late
      cond(
        I18nManager.isRTL
          ? lessThan(this._gestureX, 0)
          : greaterThan(this._gestureX, 0),
        // Based on the direction of the gesture, determine if we're entering the previous or next screen
        cond(neq(floor(this._position), this._lastEnteredIndex), [
          set(this._lastEnteredIndex, floor(this._position)),
          call([floor(this._position)], this._handleEnteredIndexChange),
        ]),
        cond(neq(ceil(this._position), this._lastEnteredIndex), [
          set(this._lastEnteredIndex, ceil(this._position)),
          call([ceil(this._position)], this._handleEnteredIndexChange),
        ])
      )
    ),
    onChange(
      this._isSwiping,
      // Listen to updates for this value only when it changes
      // Without `onChange`, this will fire even if the value didn't change
      // We don't want to call the listeners if the value didn't change
      call([this._isSwiping], ([value]) => {
        const { keyboardDismissMode, onSwipeStart, onSwipeEnd } = this.props;

        if (value === TRUE) {
          onSwipeStart && onSwipeStart();

          if (keyboardDismissMode === 'on-drag') {
            Keyboard.dismiss();
          }
        } else {
          onSwipeEnd && onSwipeEnd();
        }
      })
    ),
    onChange(
      this._nextIndex,
      cond(neq(this._nextIndex, UNSET), [
        // Stop any running animations
        cond(clockRunning(this._clock), stopClock(this._clock)),
        // Update the index to trigger the transition
        set(this._index, this._nextIndex),
        set(this._nextIndex, UNSET),
      ])
    ),
    cond(
      eq(this._gestureState, State.ACTIVE),
      [
        cond(this._isSwiping, NOOP, [
          // We weren't dragging before, set it to true
          set(this._isSwiping, TRUE),
          set(this._isSwipeGesture, TRUE),
          // Also update the drag offset to the last progress
          set(this._offsetX, this._progress),
        ]),
        // Update progress with previous offset + gesture distance
        set(
          this._progress,
          I18nManager.isRTL
            ? sub(this._offsetX, this._gestureX)
            : add(this._offsetX, this._gestureX)
        ),
        // Stop animations while we're dragging
        stopClock(this._clock),
      ],
      [
        set(this._isSwiping, FALSE),
        this._transitionTo(
          cond(
            and(
              greaterThan(abs(this._gestureX), SWIPE_DISTANCE_MINIMUM),
              or(
                greaterThan(abs(this._gestureX), this._swipeDistanceThreshold),
                greaterThan(abs(this._velocityX), this._swipeVelocityThreshold)
              )
            ),
            // For swipe gesture, to calculate the index, determine direction and add to index
            // When the user swipes towards the left, we transition to the next tab
            // When the user swipes towards the right, we transition to the previous tab
            round(
              min(
                max(
                  0,
                  sub(
                    this._index,
                    cond(
                      greaterThan(
                        // Gesture can be positive, or negative
                        // Get absolute for comparision
                        abs(this._gestureX),
                        this._swipeDistanceThreshold
                      ),
                      // If gesture value exceeded the threshold, calculate direction from distance travelled
                      cond(
                        greaterThan(this._gestureX, 0),
                        I18nManager.isRTL ? DIRECTION_RIGHT : DIRECTION_LEFT,
                        I18nManager.isRTL ? DIRECTION_LEFT : DIRECTION_RIGHT
                      ),
                      // Otherwise calculate direction from the gesture velocity
                      cond(
                        greaterThan(this._velocityX, 0),
                        I18nManager.isRTL ? DIRECTION_RIGHT : DIRECTION_LEFT,
                        I18nManager.isRTL ? DIRECTION_LEFT : DIRECTION_RIGHT
                      )
                    )
                  )
                ),
                sub(this._routesLength, 1)
              )
            ),
            // Index didn't change/changed due to state update
            this._index
          )
        ),
      ]
    ),
    this._progress,
  ]);

  render() {
    const {
      layout,
      navigationState,
      swipeEnabled,
      children,
      removeClippedSubviews,
    } = this.props;

    // Make sure that the translation doesn't exceed the bounds to prevent overscrolling
    const translateX = min(
      max(
        multiply(
          this._layoutWidth,
          sub(this._routesLength, 1),
          DIRECTION_RIGHT
        ),
        this._translateX
      ),
      0
    );

    return children({
      position: this._position,
      addListener: this._addListener,
      removeListener: this._removeListener,
      jumpTo: this._jumpTo,
      render: children => (
        <PanGestureHandler
          enabled={layout.width !== 0 && swipeEnabled}
          onGestureEvent={this._handleGestureEvent}
          onHandlerStateChange={this._handleGestureEvent}
          activeOffsetX={[-SWIPE_DISTANCE_MINIMUM, SWIPE_DISTANCE_MINIMUM]}
          failOffsetY={[-SWIPE_DISTANCE_MINIMUM, SWIPE_DISTANCE_MINIMUM]}
        >
          <Animated.View
            removeClippedSubviews={removeClippedSubviews}
            style={[
              styles.container,
              layout.width
                ? {
                    width: layout.width * navigationState.routes.length,
                    transform: [
                      {
                        translateX: I18nManager.isRTL
                          ? multiply(translateX, -1)
                          : translateX,
                      },
                    ],
                  }
                : null,
            ]}
          >
            {children}
          </Animated.View>
        </PanGestureHandler>
      ),
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
});
