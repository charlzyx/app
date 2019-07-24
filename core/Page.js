import React, { PureComponent, createContext } from 'react';
import { Animated, Dimensions}  from 'react-native';
import Layer from '../core/Layer';


const { height, width } = Dimensions.get('window');

const ANIMATE_DURATION = 164;

const noop = () => {};
const { Provider, Consumer} = createContext({});
let hookId = 1;

export class PageLife extends PureComponent {

  linked = false;
  hookIds = [];
  pageRef = null;

  link = (ref) => {
    if (this.linked || !ref) return;
    this.pageRef = ref;
    const { onShow, onHide } = this.props;
    if (onShow !== undefined && typeof onShow !== 'function') {
      throw new Error('<PageLife onShow={fn}> onShow must be an function');
    }
    if (onHide !== undefined && typeof onHide !== 'function') {
      throw new Error('<PageLife onHide={fn}> onHide must be an function');
    }
    if (ref) {
      if (onShow) {
        this.hookIds.push(hookId);
        ref._hooks.onShow[hookId++] = onShow;
      }
      if (onHide) {
        this.hookIds.push(hookId);
        ref._hooks.onHide[hookId++] = onHide;
      }
      this.linked = true;
    }
  }

  componentWillUnmount() {
    if (!this.pageRef) return;
    this.hookIds.forEach(id => {
      delete this.pageRef._hooks.onShow[id];
      delete this.pageRef._hooks.onHide[id];
    });
  }

  renderProps = ({ ref }) => {
    const { children } = this.props;
    this.link(ref);
    return children;
  }

  render() {
    return <Consumer>
      {this.renderProps}
    </Consumer>
  }
};

class Page extends PureComponent {
  constructor(props) {
    super(props);
    this._boxIt();
    this.route = props.route;
    this.state = {
      translateX: new Animated.Value(width),
      opacity: new Animated.Value(0.8),
    }
  }

  /** 给页面内组件用的 */
  _hooks = {
    onShow: {},
    onHide: {},
  }

  _animatingEnter = () => {
    Animated.timing(
      this.state.opacity,
      {
        toValue: 1,
        duration: ANIMATE_DURATION,
      }
    ).start();
    Animated.timing(
      this.state.translateX,
      {
        toValue: 0,
        duration: ANIMATE_DURATION,
      }
    ).start();
  }

  _animatingLeave = (duration) => {
    Animated.timing(
      this.state.opacity,
      {
        toValue: 0.8,
        duration,
      }
    ).start();
    Animated.timing(
      this.state.translateX,
      {
        toValue: width,
        duration,
      }
    ).start()
  }

  _boxIt() {
    this._originOnShow = noop;
    this._originOnHide = noop;
    this._originRender = noop;
    this._originBeforeEnter = Promise.resolve;
    this._originBeforeLeave = Promise.resolve;

    if (this.render && this.render !== this._boxRender) {
      this._originRender = this.render;
      this.render = this._boxRender;
    }
    if (this.onShow !== this._boxOnShow) {
      if (typeof this.onShow === 'function') {
        this._originOnShow = this.onShow;
      }
      this.onShow = this._boxOnShow;
    }
    if (this.onHide !== this._boxOnHide) {
      if (typeof this.onHide === 'function') {
        this._originOnHide = this.onHide;
      }
      this.onHide = this._boxOnHide;
    }
    if (this.beforeEnter !== this._boxBeforeEnter) {
      if (typeof this.beforeEnter === 'function') {
        this._originBeforeEnter = this.beforeEnter.bind(this);
      }
      this.beforeEnter = this._boxBeforeEnter;
    }
    if (this.beforeLeave !== this._boxBeforeLeave) {
      if (typeof this.beforeLeave === 'function') {
        this._originBeforeLeave = this.beforeLeave.bind(this);
      }
      this.beforeLeave = this._boxBeforeLeave;
    }
  }

  _boxBeforeEnter(route) {
    return this._originBeforeEnter(route);
  }

  _boxBeforeLeave(route) {
    return this._originBeforeLeave(route);
  }

  _boxOnShow() {
    this._originOnShow();
    const onShowMap = this._hooks.onShow;
    Object.keys(onShowMap).forEach(key => {
      onShowMap[key](this.route);
    });
  }

  _boxOnHide() {
    this._originOnHide();
    const onHideMap = this._hooks.onHide;
    Object.keys(onHideMap).forEach(key => {
      onHideMap[key](this.route);
    });
  }

  _boxRender() {
    const { route } = this;
    const { translateX, opacity } = this.state;
    return <Layer
      animated
      style={{
        opacity,
        transform: [{ translateX }]
      }}>
      <Provider value={{ ...route, ref: this }}>
        {this._originRender()}
      </Provider>
    </Layer>
  }

}

export default Page;
