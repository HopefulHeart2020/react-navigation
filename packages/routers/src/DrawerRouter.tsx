import shortid from 'shortid';
import { PartialState, CommonNavigationAction, Router } from './types';
import TabRouter, {
  TabActions,
  TabActionType,
  TabRouterOptions,
  TabNavigationState,
} from './TabRouter';

export type DrawerActionType =
  | TabActionType
  | {
      type: 'OPEN_DRAWER' | 'CLOSE_DRAWER' | 'TOGGLE_DRAWER';
      source?: string;
      target?: string;
    };

export type DrawerRouterOptions = TabRouterOptions;

export type DrawerNavigationState = Omit<
  TabNavigationState,
  'type' | 'history'
> & {
  /**
   * Type of the router, in this case, it's drawer.
   */
  type: 'drawer';
  /**
   * List of previously visited route keys and drawer open status.
   */
  history: ({ type: 'route'; key: string } | { type: 'drawer' })[];
};

export const DrawerActions = {
  ...TabActions,
  openDrawer(): DrawerActionType {
    return { type: 'OPEN_DRAWER' };
  },
  closeDrawer(): DrawerActionType {
    return { type: 'CLOSE_DRAWER' };
  },
  toggleDrawer(): DrawerActionType {
    return { type: 'TOGGLE_DRAWER' };
  },
};

const isDrawerOpen = (
  state: DrawerNavigationState | PartialState<DrawerNavigationState>
) => Boolean(state.history?.find(it => it.type === 'drawer'));

const openDrawer = (state: DrawerNavigationState): DrawerNavigationState => {
  if (isDrawerOpen(state)) {
    return state;
  }

  return {
    ...state,
    history: [...state.history, { type: 'drawer' }],
  };
};

const closeDrawer = (state: DrawerNavigationState): DrawerNavigationState => {
  if (!isDrawerOpen(state)) {
    return state;
  }

  return {
    ...state,
    history: state.history.filter(it => it.type !== 'drawer'),
  };
};

export default function DrawerRouter(
  options: DrawerRouterOptions
): Router<DrawerNavigationState, DrawerActionType | CommonNavigationAction> {
  const router = (TabRouter(options) as unknown) as Router<
    DrawerNavigationState,
    TabActionType | CommonNavigationAction
  >;

  return {
    ...router,

    type: 'drawer',

    getInitialState({ routeNames, routeParamList }) {
      const state = router.getInitialState({ routeNames, routeParamList });

      return {
        ...state,
        stale: false,
        type: 'drawer',
        key: `drawer-${shortid()}`,
      };
    },

    getRehydratedState(partialState, { routeNames, routeParamList }) {
      if (partialState.stale === false) {
        return partialState;
      }

      let state = router.getRehydratedState(partialState, {
        routeNames,
        routeParamList,
      });

      if (isDrawerOpen(partialState)) {
        state = openDrawer(state);
      }

      return {
        ...state,
        type: 'drawer',
        key: `drawer-${shortid()}`,
      };
    },

    getStateForRouteFocus(state, key) {
      const result = router.getStateForRouteFocus(state, key);

      return closeDrawer(result);
    },

    getStateForAction(state, action, options) {
      switch (action.type) {
        case 'OPEN_DRAWER':
          return openDrawer(state);

        case 'CLOSE_DRAWER':
          return closeDrawer(state);

        case 'TOGGLE_DRAWER':
          if (isDrawerOpen(state)) {
            return closeDrawer(state);
          }

          return openDrawer(state);

        case 'GO_BACK':
          if (isDrawerOpen(state)) {
            return closeDrawer(state);
          }

          return router.getStateForAction(state, action, options);

        default:
          return router.getStateForAction(state, action, options);
      }
    },

    actionCreators: DrawerActions,
  };
}
