import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Root from './core/Root';
import R from './core/router';
import Home from './pages/Home';


export default class App extends Component {

  componentDidMount() {
    R.push(Home);
  }

  render()  {
    return (
      <View style={styles.container}>
        <Root />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
