/* @flow */

import React, { PureComponent, Children, PropTypes } from 'react';
import {
  View,
  ViewPagerAndroid,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { SceneRendererPropType } from './TabViewPropTypes';
import type { SceneRendererProps } from './TabViewTypeDefinitions';

type PageScrollEvent = {
  nativeEvent: {
    position: number;
    offset: number;
  };
}

type PageScrollState = 'dragging' | 'settling' | 'idle'

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },

  page: {
    overflow: 'hidden',
  },
});

type Props = SceneRendererProps & {
  swipeEnabled?: boolean;
  animationEnabled?: boolean;
  children?: any;
}

export default class TabViewPagerAndroid extends PureComponent<void, Props, void> {
  static propTypes = {
    ...SceneRendererPropType,
    swipeEnabled: PropTypes.bool,
    animationEnabled: PropTypes.bool,
    children: PropTypes.node,
  };

  componentWillMount() {
    this._currentIndex = this._getPageIndex(this.props.navigationState.index);
    this._jumpListener = this.props.subscribe('jump', this._handleJump);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.layout !== nextProps.layout || Children.count(this.props.children) !== Children.count(nextProps.children)) {
      global.requestAnimationFrame(() => {
        if (this._viewPager) {
          this._viewPager.setPageWithoutAnimation(this._getPageIndex(nextProps.navigationState.index));
        }
      });
    }
  }

  componentDidUpdate() {
    if (this._isIdle) {
      this._setPage(this.props.navigationState.index);
    }
  }

  componentWillUnmount() {
    this._jumpListener.remove();
  }

  _jumpListener: Object;
  _viewPager: Object;
  _isDrag: boolean = false;
  _isIdle: boolean = true;
  _currentIndex: number;

  _getPageIndex = (index: number) => (
    I18nManager.isRTL ?
      (Children.count(this.props.children) - 1) - index :
      index
  )

  _setPage = (index: number) => {
    const pageIndex = this._getPageIndex(index);

    if (this._viewPager && this._currentIndex !== pageIndex) {
      this._currentIndex = pageIndex;
      if (this.props.animationEnabled !== false) {
        this._viewPager.setPage(pageIndex);
      } else {
        this._viewPager.setPageWithoutAnimation(pageIndex);
      }
    }
  }

  _handleJump = (index: number) => {
    if (this._isIdle) {
      this._setPage(index);
    }
  };

  _handlePageScroll = (e: PageScrollEvent) => {
    if (this._isDrag) {
      this.props.position.setValue(
        this._getPageIndex(e.nativeEvent.position) + (e.nativeEvent.offset * (I18nManager.isRTL ? -1 : 1))
      );
    }
  };

  _handlePageScrollStateChanged = (e: PageScrollState) => {
    this._isIdle = e === 'idle';
    if (e === 'dragging') {
      this._isDrag = true;
    } else if (e === 'idle') {
      this._isDrag = false;
      if (this._currentIndex !== this._getPageIndex(this.props.navigationState.index)) {
        this.props.jumpToIndex(this._currentIndex);
      }
    }
  };

  _handlePageSelected = (e: PageScrollEvent) => {
    this._currentIndex = this._getPageIndex(e.nativeEvent.position);
  };

  _setRef = (el: Object) => (this._viewPager = el);

  render() {
    const { children, navigationState, swipeEnabled } = this.props;
    const tabContents = Children.map(children, (child, i) => (
      <View
        key={navigationState.routes[i].key}
        testID={navigationState.routes[i].testID}
        style={styles.page}
      >
        {child}
      </View>
    ));

    return (
      <ViewPagerAndroid
        key={navigationState.routes.length}
        keyboardDismissMode='on-drag'
        initialPage={this._getPageIndex(navigationState.index)}
        scrollEnabled={swipeEnabled !== false}
        onPageScroll={this._handlePageScroll}
        onPageScrollStateChanged={this._handlePageScrollStateChanged}
        onPageSelected={this._handlePageSelected}
        style={styles.container}
        ref={this._setRef}
      >
        {I18nManager.isRTL ? tabContents.reverse() : tabContents}
      </ViewPagerAndroid>
    );
  }
}
