/* @flow */

export type GestureEvent = {
  nativeEvent: {
    changedTouches: Array<any>;
    identifier: number;
    locationX: number;
    locationY: number;
    pageX: number;
    pageY: number;
    target: number;
    timestamp: number;
    touches: Array<any>;
  };
}

export type GestureState = {
  stateID: number;
  moveX: number;
  moveY: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  numberActiveTouches: number;
}
