import React, { PureComponent } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');


class Animation extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      style: {},
    };
  }

  _mergeStyle = (props) => {

  }

  _enter = () => {
    const { animates } = this.props;
    animates.forEach(ani => {
      Object.keys(ani.enter).forEach(property => {
        const { to, duration } = ani.enter[property];
        Animated.timing(
          this.state.style[property],
          {
            toValue: to,
            duration,
          }
        ).start();
      });
    });
  }


  _leave = () => {
    const { animates } = this.props;
    animates.forEach(ani => {
      Object.keys(ani.leave).forEach(property => {
        const { to, duration } = ani.leave[property];
        Animated.timing(
          this.state.style[property],
          {
            toValue: to,
            duration,
          }
        ).start();
      });
    });
  }

  render() {
    const { style } = this.state;
    const { style: css, children, ...others } = this.props;
    return <Animated.View style={[style, css]} {...others} >
      {children}
    </Animated.View>
  }
}

Animation.fade = {
  enter: {
    opacity: {
      from: 0,
      to: 1,
      duration: 233,
    },
  },
  leave: {
    opacity: {
      from: 1,
      to: 0,
      duration: 233,
    },
  }
};

Animation.enterByRight = {
  enter: {
    transform: [
      {
        translateX: {
          from: width,
          to: 0,
          duration: 233,
        },
      }
   ],
  },
  leave: {
    transform: [
      {
        translateX: {
          from: 0,
          to: width,
          duration: 233,
        },
      }
   ],
  }
};

Animation.enterByBottom = {
  enter: {
    transform: [
      {
        translateY: {
          from: height,
          to: 0,
          duration: 233,
        },
      },
   ],
  },
  leave: {
    transform: [
      {
        translateY: {
          from: 0,
          to: height,
          duration: 233,
        },
      }
   ],
  }
};


export default Animation;
