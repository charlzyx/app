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

    event.on('change', this.onChange);
  }

  onChange = (history) => {
    this.setState({ history });
    this.forceUpdate();
  }

  render() {
    const { history } = this.state;
    return <Layer>
      {history.map(nav => nav.map(page => page.element))}
    </Layer>
  }
}


export default Root;
