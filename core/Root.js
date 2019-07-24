import React, { PureComponent } from 'react';
import Layer from './Layer';
import R, { event } from './router';

import routes from '../routes';

/**
 * 静态路由注册
 */
routes.forEach(r => {
  R.registry(r.path, r.component);
})


class Root extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      history: [],
    }

    this.eventId = R.listen(this.onChange);
  }

  onChange = (history) => {
    this.setState({ history });
    this.forceUpdate();
  }

  componentWillUnmount() {
    R.unlisten(this.eventId);
  }

  render() {
    const { history } = this.state;
    return <Layer>
      {history.map(nav => nav.map(route => route.element))}
    </Layer>
  }
}


export default Root;
