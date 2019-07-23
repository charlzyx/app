import React, { PureComponent, createContext } from 'react';
import Layer from './Layer';


const noop = () => {};
const { Provider, Consumer} = createContext({});

export class PageLife extends PureComponent {

  linked = false;

  link = (ref) => {
    if (this.linked || !ref) return;
    const { onShow, onHide } = this.props;
    if (onShow !== undefined && typeof onShow !== 'function') {
      throw new Error('<PageLife onShow={fn}> onShow must be an function');
    }
    if (onHide !== undefined && typeof onHide !== 'function') {
      throw new Error('<PageLife onHide={fn}> onHide must be an function');
    }
    if (ref) {
      ref._hooks.onShow.push(onShow);
      ref._hooks.onHide.push(onHide);
      this.linked = true;
    }
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
  }

  /** 给页面内组件用的 */
  _hooks = {
    onShow: [],
    onHide: [],
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
  }

  _boxWillUnmount() {
    this._boxOnHide();
    this._originComponentWillUmount();
  }

  _boxRender() {
    const { route } = this;
    return <Layer>
      <Provider value={{ ref: this, route }}>
        {this._originRender()}
      </Provider>
    </Layer>
  }

  _boxOnShow() {
    this._originOnShow();
    this._hooks.onShow.forEach(fn => fn(this));
  }

  _boxOnHide() {
    this._originOnHide();
    this._hooks.onHide.forEach(fn => fn(this));
  }

}

export default Page;
