import * as React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  DefaultRouterOptions,
  NavigationState,
  Router,
  StackRouter,
  TabRouter,
} from '@react-navigation/routers';
import BaseNavigationContainer from '../BaseNavigationContainer';
import NavigationStateContext from '../NavigationStateContext';
import MockRouter, { MockActions } from './__fixtures__/MockRouter';
import useNavigationBuilder from '../useNavigationBuilder';
import Screen from '../Screen';
import type { NavigationContainerRef } from '../types';

it('throws when getState is accessed without a container', () => {
  expect.assertions(1);

  const Test = () => {
    const { getState } = React.useContext(NavigationStateContext);

    // eslint-disable-next-line babel/no-unused-expressions
    getState;

    return null;
  };

  const element = <Test />;

  expect(() => render(element).update(element)).toThrowError(
    "Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?"
  );
});

it('throws when setState is accessed without a container', () => {
  expect.assertions(1);

  const Test = () => {
    const { setState } = React.useContext(NavigationStateContext);

    // eslint-disable-next-line babel/no-unused-expressions
    setState;

    return null;
  };

  const element = <Test />;

  expect(() => render(element).update(element)).toThrowError(
    "Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?"
  );
});

it('throws when nesting containers', () => {
  expect(() =>
    render(
      <BaseNavigationContainer>
        <BaseNavigationContainer>
          <React.Fragment />
        </BaseNavigationContainer>
      </BaseNavigationContainer>
    )
  ).toThrowError(
    "Looks like you have nested a 'NavigationContainer' inside another."
  );

  expect(() =>
    render(
      <BaseNavigationContainer>
        <BaseNavigationContainer independent>
          <React.Fragment />
        </BaseNavigationContainer>
      </BaseNavigationContainer>
    )
  ).not.toThrowError(
    "Looks like you have nested a 'NavigationContainer' inside another."
  );
});

it('handle dispatching with ref', () => {
  const CurrentParentRouter = MockRouter;

  function CurrentChildRouter(options: DefaultRouterOptions) {
    const CurrentMockRouter = MockRouter(options);
    const ChildRouter: Router<
      NavigationState,
      MockActions | { type: 'REVERSE' }
    > = {
      ...CurrentMockRouter,

      shouldActionChangeFocus() {
        return true;
      },

      getStateForAction(state, action, options) {
        if (action.type === 'REVERSE') {
          return {
            ...state,
            routes: state.routes.slice().reverse(),
          };
        }
        return CurrentMockRouter.getStateForAction(state, action, options);
      },
    };
    return ChildRouter;
  }

  const ChildNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(
      CurrentChildRouter,
      props
    );

    return descriptors[state.routes[state.index].key].render();
  };

  const ParentNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(
      CurrentParentRouter,
      props
    );

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const onStateChange = jest.fn();

  const initialState = {
    index: 1,
    routes: [
      {
        key: 'baz',
        name: 'baz',
        state: {
          index: 0,
          key: '4',
          routeNames: ['qux', 'lex'],
          routes: [
            { key: 'qux', name: 'qux' },
            { key: 'lex', name: 'lex' },
          ],
        },
      },
      { key: 'bar', name: 'bar' },
    ],
  };

  const element = (
    <BaseNavigationContainer
      ref={ref}
      initialState={initialState}
      onStateChange={onStateChange}
    >
      <ParentNavigator>
        <Screen name="foo">{() => null}</Screen>
        <Screen name="foo2">
          {() => (
            <ChildNavigator>
              <Screen name="qux">{() => null}</Screen>
              <Screen name="lex">{() => null}</Screen>
            </ChildNavigator>
          )}
        </Screen>
        <Screen name="bar">{() => null}</Screen>
        <Screen name="baz">
          {() => (
            <ChildNavigator>
              <Screen name="qux">{() => null}</Screen>
              <Screen name="lex">{() => null}</Screen>
            </ChildNavigator>
          )}
        </Screen>
      </ParentNavigator>
    </BaseNavigationContainer>
  );

  render(element).update(element);

  act(() => {
    ref.current?.dispatch({ type: 'REVERSE' });
  });

  expect(onStateChange).toBeCalledTimes(1);
  expect(onStateChange).lastCalledWith({
    stale: false,
    type: 'test',
    index: 0,
    key: '0',
    routeNames: ['foo', 'foo2', 'bar', 'baz'],
    routes: [
      {
        key: 'baz',
        name: 'baz',
        state: {
          stale: false,
          type: 'test',
          index: 0,
          key: '1',
          routeNames: ['qux', 'lex'],
          routes: [
            { key: 'lex', name: 'lex' },
            { key: 'qux', name: 'qux' },
          ],
        },
      },
      { key: 'bar', name: 'bar' },
    ],
  });
});

it('handle resetting state with ref', () => {
  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const onStateChange = jest.fn();

  const element = (
    <BaseNavigationContainer ref={ref} onStateChange={onStateChange}>
      <TestNavigator>
        <Screen name="foo">{() => null}</Screen>
        <Screen name="foo2">
          {() => (
            <TestNavigator>
              <Screen name="qux">{() => null}</Screen>
              <Screen name="lex">{() => null}</Screen>
            </TestNavigator>
          )}
        </Screen>
        <Screen name="bar">{() => null}</Screen>
        <Screen name="baz">
          {() => (
            <TestNavigator>
              <Screen name="qux">{() => null}</Screen>
              <Screen name="lex">{() => null}</Screen>
            </TestNavigator>
          )}
        </Screen>
      </TestNavigator>
    </BaseNavigationContainer>
  );

  render(element).update(element);

  const state = {
    index: 1,
    routes: [
      {
        key: 'baz',
        name: 'baz',
        state: {
          index: 0,
          key: '4',
          routeNames: ['qux', 'lex'],
          routes: [
            { key: 'qux', name: 'qux' },
            { key: 'lex', name: 'lex' },
          ],
        },
      },
      { key: 'bar', name: 'bar' },
    ],
  };

  act(() => {
    ref.current?.resetRoot(state);
  });

  expect(onStateChange).toBeCalledTimes(1);
  expect(onStateChange).lastCalledWith({
    index: 1,
    key: '5',
    routeNames: ['foo', 'foo2', 'bar', 'baz'],
    routes: [
      {
        key: 'baz',
        name: 'baz',
        state: {
          index: 0,
          key: '6',
          routeNames: ['qux', 'lex'],
          routes: [
            { key: 'qux', name: 'qux' },
            { key: 'lex', name: 'lex' },
          ],
          stale: false,
          type: 'test',
        },
      },
      { key: 'bar', name: 'bar' },
    ],
    stale: false,
    type: 'test',
  });
});

it('handles getRootState', () => {
  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return descriptors[state.routes[state.index].key].render();
  };

  const ref = React.createRef<NavigationContainerRef>();

  const element = (
    <BaseNavigationContainer ref={ref}>
      <TestNavigator initialRouteName="foo">
        <Screen name="foo">
          {() => (
            <TestNavigator>
              <Screen name="qux">{() => null}</Screen>
              <Screen name="lex">{() => null}</Screen>
            </TestNavigator>
          )}
        </Screen>
        <Screen name="bar">{() => null}</Screen>
      </TestNavigator>
    </BaseNavigationContainer>
  );

  render(element);

  let state;
  if (ref.current) {
    state = ref.current.getRootState();
  }
  expect(state).toEqual({
    index: 0,
    key: '7',
    routeNames: ['foo', 'bar'],
    routes: [
      {
        key: 'foo',
        name: 'foo',
        state: {
          index: 0,
          key: '8',
          routeNames: ['qux', 'lex'],
          routes: [
            { key: 'qux', name: 'qux' },
            { key: 'lex', name: 'lex' },
          ],
          stale: false,
          type: 'test',
        },
      },
      { key: 'bar', name: 'bar' },
    ],
    stale: false,
    type: 'test',
  });
});

it('emits state events when the state changes', () => {
  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const element = (
    <BaseNavigationContainer ref={ref}>
      <TestNavigator>
        <Screen name="foo">{() => null}</Screen>
        <Screen name="bar">{() => null}</Screen>
        <Screen name="baz">{() => null}</Screen>
      </TestNavigator>
    </BaseNavigationContainer>
  );

  render(element).update(element);

  const listener = jest.fn();

  ref.current?.addListener('state', listener);

  expect(listener).not.toHaveBeenCalled();

  act(() => {
    ref.current?.navigate('bar');
  });

  expect(listener).toBeCalledTimes(1);
  expect(listener.mock.calls[0][0].data.state).toEqual({
    type: 'test',
    stale: false,
    index: 1,
    key: '9',
    routeNames: ['foo', 'bar', 'baz'],
    routes: [
      { key: 'foo', name: 'foo' },
      { key: 'bar', name: 'bar' },
      { key: 'baz', name: 'baz' },
    ],
  });

  act(() => {
    ref.current?.navigate('baz', { answer: 42 });
  });

  expect(listener).toBeCalledTimes(2);
  expect(listener.mock.calls[1][0].data.state).toEqual({
    type: 'test',
    stale: false,
    index: 2,
    key: '9',
    routeNames: ['foo', 'bar', 'baz'],
    routes: [
      { key: 'foo', name: 'foo' },
      { key: 'bar', name: 'bar' },
      { key: 'baz', name: 'baz', params: { answer: 42 } },
    ],
  });
});

it('emits state events when new navigator mounts', () => {
  jest.useFakeTimers();

  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const NestedNavigator = () => {
    const [isRendered, setIsRendered] = React.useState(false);

    React.useEffect(() => {
      setTimeout(() => setIsRendered(true), 100);
    }, []);

    if (!isRendered) {
      return null;
    }

    return (
      <TestNavigator>
        <Screen name="baz">{() => null}</Screen>
        <Screen name="bax">{() => null}</Screen>
      </TestNavigator>
    );
  };

  const onStateChange = jest.fn();

  const element = (
    <BaseNavigationContainer ref={ref} onStateChange={onStateChange}>
      <TestNavigator>
        <Screen name="foo">{() => null}</Screen>
        <Screen name="bar" component={NestedNavigator} />
      </TestNavigator>
    </BaseNavigationContainer>
  );

  render(element).update(element);

  const listener = jest.fn();

  ref.current?.addListener('state', listener);

  expect(listener).not.toHaveBeenCalled();
  expect(onStateChange).not.toHaveBeenCalled();

  act(() => {
    jest.runAllTimers();
  });

  const resultState = {
    stale: false,
    type: 'test',
    index: 0,
    key: '10',
    routeNames: ['foo', 'bar'],
    routes: [
      { key: 'foo', name: 'foo' },
      {
        key: 'bar',
        name: 'bar',
        state: {
          stale: false,
          type: 'test',
          index: 0,
          key: '11',
          routeNames: ['baz', 'bax'],
          routes: [
            { key: 'baz', name: 'baz' },
            { key: 'bax', name: 'bax' },
          ],
        },
      },
    ],
  };

  expect(listener).toBeCalledTimes(1);
  expect(listener.mock.calls[0][0].data.state).toEqual(resultState);

  expect(onStateChange).toBeCalledTimes(1);
  expect(onStateChange).lastCalledWith(resultState);
});

it('emits option events when options change with tab router', () => {
  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(TabRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const element = (
    <BaseNavigationContainer ref={ref}>
      <TestNavigator>
        <Screen name="foo" options={{ x: 1 }}>
          {() => null}
        </Screen>
        <Screen name="bar" options={{ y: 2 }}>
          {() => null}
        </Screen>
        <Screen name="baz" options={{ v: 3 }}>
          {() => (
            <TestNavigator>
              <Screen name="qux" options={{ g: 5 }}>
                {() => null}
              </Screen>
              <Screen name="quxx" options={{ h: 9 }}>
                {() => null}
              </Screen>
            </TestNavigator>
          )}
        </Screen>
      </TestNavigator>
    </BaseNavigationContainer>
  );

  const listener = jest.fn();

  render(element).update(element);
  ref.current?.addListener('options', listener);

  act(() => {
    ref.current?.navigate('bar');
  });

  expect(listener).toBeCalledTimes(1);
  expect(listener.mock.calls[0][0].data.options).toEqual({ y: 2 });
  expect(ref.current?.getCurrentOptions()).toEqual({ y: 2 });

  ref.current?.removeListener('options', listener);

  const listener2 = jest.fn();

  ref.current?.addListener('options', listener2);

  act(() => {
    ref.current?.navigate('baz');
  });

  expect(listener2).toBeCalledTimes(1);
  expect(listener2.mock.calls[0][0].data.options).toEqual({ g: 5 });
  expect(ref.current?.getCurrentOptions()).toEqual({ g: 5 });

  act(() => {
    ref.current?.navigate('quxx');
  });

  expect(listener2).toBeCalledTimes(2);
  expect(listener2.mock.calls[1][0].data.options).toEqual({ h: 9 });
  expect(ref.current?.getCurrentOptions()).toEqual({ h: 9 });
});

it('emits option events when options change with stack router', () => {
  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(StackRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const element = (
    <BaseNavigationContainer ref={ref}>
      <TestNavigator>
        <Screen name="foo" options={{ x: 1 }}>
          {() => null}
        </Screen>
        <Screen name="bar" options={{ y: 2 }}>
          {() => null}
        </Screen>
        <Screen name="baz" options={{ v: 3 }}>
          {() => (
            <TestNavigator>
              <Screen name="qux" options={{ g: 5 }}>
                {() => null}
              </Screen>
              <Screen name="quxx" options={{ h: 9 }}>
                {() => null}
              </Screen>
            </TestNavigator>
          )}
        </Screen>
      </TestNavigator>
    </BaseNavigationContainer>
  );

  const listener = jest.fn();

  render(element).update(element);
  ref.current?.addListener('options', listener);

  act(() => {
    ref.current?.navigate('bar');
  });

  expect(listener).toBeCalledTimes(1);
  expect(listener.mock.calls[0][0].data.options).toEqual({ y: 2 });
  expect(ref.current?.getCurrentOptions()).toEqual({ y: 2 });

  ref.current?.removeListener('options', listener);

  const listener2 = jest.fn();

  ref.current?.addListener('options', listener2);

  act(() => {
    ref.current?.navigate('baz');
  });

  expect(listener2).toBeCalledTimes(1);
  expect(listener2.mock.calls[0][0].data.options).toEqual({ g: 5 });
  expect(ref.current?.getCurrentOptions()).toEqual({ g: 5 });

  act(() => {
    ref.current?.navigate('quxx');
  });

  expect(listener2).toBeCalledTimes(2);
  expect(listener2.mock.calls[1][0].data.options).toEqual({ h: 9 });
  expect(ref.current?.getCurrentOptions()).toEqual({ h: 9 });
});

it('throws if there is no navigator rendered', () => {
  expect.assertions(1);

  const ref = React.createRef<NavigationContainerRef>();

  const element = <BaseNavigationContainer ref={ref} children={null} />;

  render(element);

  act(() => {
    expect(() => ref.current?.dispatch({ type: 'WHATEVER' })).toThrow(
      "The 'navigation' object hasn't been initialized yet."
    );
  });
});

it("throws if the ref hasn't finished initializing", () => {
  expect.assertions(1);

  const ref = React.createRef<NavigationContainerRef>();

  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return descriptors[state.routes[state.index].key].render();
  };

  const TestScreen = () => {
    React.useEffect(() => {
      expect(() => ref.current?.dispatch({ type: 'WHATEVER' })).toThrow(
        "The 'navigation' object hasn't been initialized yet."
      );
    }, []);

    return null;
  };

  const element = (
    <BaseNavigationContainer ref={ref}>
      <TestNavigator>
        <Screen name="foo" component={TestScreen} />
      </TestNavigator>
    </BaseNavigationContainer>
  );

  render(element);
});

it('invokes the unhandled action listener with the unhandled action', () => {
  const ref = React.createRef<NavigationContainerRef>();
  const fn = jest.fn();

  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const TestScreen = () => <></>;

  render(
    <BaseNavigationContainer ref={ref} onUnhandledAction={fn}>
      <TestNavigator>
        <Screen name="foo" component={TestScreen} />
        <Screen name="bar" component={TestScreen} />
      </TestNavigator>
    </BaseNavigationContainer>
  );

  act(() => ref.current!.navigate('bar'));
  act(() => ref.current!.navigate('baz'));

  expect(fn).toHaveBeenCalledWith({
    payload: {
      name: 'baz',
    },
    type: 'NAVIGATE',
  });
});

it('works with state change events in independent nested container', () => {
  const TestNavigator = (props: any) => {
    const { state, descriptors } = useNavigationBuilder(MockRouter, props);

    return (
      <React.Fragment>
        {state.routes.map((route) => descriptors[route.key].render())}
      </React.Fragment>
    );
  };

  const ref = React.createRef<NavigationContainerRef>();

  const onStateChange = jest.fn();

  render(
    <BaseNavigationContainer>
      <TestNavigator>
        <Screen name="foo">
          {() => (
            <BaseNavigationContainer
              independent
              ref={ref}
              onStateChange={onStateChange}
            >
              <TestNavigator>
                <Screen name="qux">{() => null}</Screen>
                <Screen name="lex">{() => null}</Screen>
              </TestNavigator>
            </BaseNavigationContainer>
          )}
        </Screen>
        <Screen name="bar">{() => null}</Screen>
      </TestNavigator>
    </BaseNavigationContainer>
  );

  act(() => ref.current?.navigate('lex'));

  expect(onStateChange).toBeCalledWith({
    index: 1,
    key: '15',
    routeNames: ['qux', 'lex'],
    routes: [
      { key: 'qux', name: 'qux' },
      { key: 'lex', name: 'lex' },
    ],
    stale: false,
    type: 'test',
  });

  expect(ref.current?.getRootState()).toEqual({
    index: 1,
    key: '15',
    routeNames: ['qux', 'lex'],
    routes: [
      { key: 'qux', name: 'qux' },
      { key: 'lex', name: 'lex' },
    ],
    stale: false,
    type: 'test',
  });
});
