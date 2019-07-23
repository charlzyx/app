import React, { PureComponent, createContext } from 'react';
import Layer from './Layer';


const noop = () => {};
const { Provider, Consumer} = createContext({});

export const PageConsumer = Consumer;

class Page extends PureComponent {
  constructor(props) {
    super(props);
    this.boxIt();
    this.route = this.props.route;
  }

  boxIt() {
    this._originOnShow = this._originOnHide = this._originRender = noop;
    this.originCanIPop = Promise.resolve;

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
    if (this.onShow && this.onShow !== this._boxOnShow) {
      this._originOnShow = this.onShow;
      this.onShow = this._boxOnShow;
    }
    if (this.onHide && this.onHide !== this._boxOnHide) {
      this._originOnHide = this.onHide;
      this.onHide = this._boxOnHide;
    }
    if (this.canI && this.canI.pop && this.canI.pop !== this._boxCanI.pop) {
      this._originCanIPop = this.canI.pop.bind(this);
      this.canI.pop = this._boxCanI.pop;
    }
  }

  _boxCanI = {
    pop() {
      return this._originCanIPop();
    }
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
      <Provider value={route}>
        {this._originRender()}
      </Provider>
    </Layer>
  }

  _boxOnShow() {
    this._originOnShow();
  }

  _boxOnHide() {
    this._originOnHide();
  }

}

export default Page;
