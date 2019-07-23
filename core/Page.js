import React, { PureComponent, createContext } from 'react';
import { Animated, Dimensions }  from 'react-native';
import Layer from '../core/Layer';


const { height, width } = Dimensions.get('window')

const ANIMATE_DURATION = 233;

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

  renderProps = ({ route, ref}) => {
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
    this.route = this.props.route;
    this.state = {
      translateX: new Animated.Value(width * 0.6),  // 透明度初始值设为0
      opacity: new Animated.Value(0),
    }
  }

  /** 给页面内组件用的 */
  _hooks = {
    onShow: {},
    onHide: {},
  }

  _animatingEnter = () => {
    Animated.timing(                  // 随时间变化而执行动画
      this.state.opacity,            // 动画中的变量值
      {
        toValue: 1,                   // 透明度最终变为1，即完全不透明
        duration: ANIMATE_DURATION ,              // 让动画持续一段时间
        // useNativeDriver: true,
      }
    ).start();
    Animated.timing(                  // 随时间变化而执行动画
      this.state.translateX,            // 动画中的变量值
      {
        toValue: 0,                   // 透明度最终变为1，即完全不透明
        duration: ANIMATE_DURATION ,              // 让动画持续一段时间
        // useNativeDriver: true,
      }
    ).start();
  }

  _animatingLeave = (duration) => {
    console.log('animatingLeave');
    Animated.timing(                  // 随时间变化而执行动画
      this.state.opacity,            // 动画中的变量值
      {
        toValue: 0,                   // 透明度最终变为1，即完全不透明
        duration,              // 让动画持续一段时间
        // useNativeDriver: true,
      }
    ).start();
    Animated.timing(                  // 随时间变化而执行动画
      this.state.translateX,            // 动画中的变量值
      {
        toValue: width * 0.6,                   // 透明度最终变为1，即完全不透明
        duration,              // 让动画持续一段时间
        // useNativeDriver: true,
      }
    ).start()
  }

  _boxIt() {
    this._originOnShow = this._originOnHide = this._originRender = noop;
    this._originBeforeLeave = Promise.resolve;

    if (this.componentDidMount && this.componentDidMount !== this._boxDidMount) {
      this._originComponentDidMount = this.componentDidMount;
      this.componentDidMount = this._boxDidMount;
    }
    if (this.componentWillUnmount && this.componentWillUnmount !== this._boxWillUnmount) {
      this._originComponentWillUmount = this.componentWillUnmount;
      this.componentWillUnmount = this._boxWillUnmount;
    }
    if (this.render && this.render !== this._boxRender) {
      this._originRender = this.render;
      this.render = this._boxRender;
    }
    if (this.onShow !== this._boxOnShow) {
      this._originOnShow = typeof this.onShow === 'function' ? this.onShow : noop;
      this.onShow = this._boxOnShow;
    }
    if (this.onHide !== this._boxOnHide) {
      this._originOnHide = typeof this.onHide === 'function' ? this.onHide : noop;
      this.onHide = this._boxOnHide;
    }
    if (this.beforeLeave && this.beforeLeave !== this._boxBeforeLeave) {
      this._originBeforeLeave = this.beforeLeave.bind(this);
      this.beforeLeave = this._boxBeforeLeave;
    }
  }

  _boxBeforeLeave(route) {
    return this._originBeforeLeave(route);
  }

  _boxDidMount() {
    this._originComponentDidMount();
    this._boxOnShow();
    this._animatingEnter();
  }

  _boxWillUnmount() {
    this._boxOnHide();
    this._originComponentWillUmount();
  }

  _boxRender() {
    const { route } = this;
    const { translateX, opacity } = this.state;
    return <Layer
      animated
      style={{
        opacity,
        transform: [{ translateX } ]
      }}>
      <Provider value={{ ref: this, route }}>
        {this._originRender()}
      </Provider>
    </Layer>
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

}

export default Page;
