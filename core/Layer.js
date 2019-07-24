import React, { Component } from 'react';
import { View, Animated } from 'react-native';

const colorful = () => {
    const rr = Math.floor(Math.random() * 255);
    const gg = Math.floor(Math.random() * 255);
    const bb = Math.floor(Math.random() * 255);
    return `rgba(${rr},${gg},${bb}, 1)`;
}

const css = {
 cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
}

class Layer extends Component {
  render() {
    const { children, style, animated, ...others } = this.props;
    return animated ? <Animated.View {...others} style={[css.cover, { backgroundColor: colorful() }, style]}>
      {children}
    </Animated.View>: <View {...others} style={[css.cover, { backgroundColor: colorful() }, style ]}>
      {children}
    </View>
  }
}

export default Layer;
