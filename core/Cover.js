import React, { Component } from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';


const css = {
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'cetner',
  }
}

class Cover extends Component {
  render() {
    const { children, center, visible, touchable, ...others } = this.props;
    return visible ?
      touchable
        ? <TouchableWithoutFeedback {...others} style={[css.cover, center ? css.center: null, style]}>
          {children}
         </TouchableWithoutFeedback>
        : <View {...others} style={[css.cover, center ? css.center: null, style]} >
          {children}
        </View>
      : null
  }
}


export default Cover;
