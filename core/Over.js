import React, { Component } from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';


const css = {
  cover: {
    position: 'absolute',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'cetner',
  }
}

class Over extends Component {
  render() {
    const { children, center, visible, touchable, ...others } = this.props;
    return visible ?
      touchable
        ? <TouchableWithoutFeedback {...others} style={[css.cover, center ? css.center : null, style]}>
          {children}
        </TouchableWithoutFeedback>
        : <View {...others} style={[css.cover, center ? css.center : null, style]} >
          {children}
        </View>
      : null
  }
}


export default Over;
