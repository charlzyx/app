import React, { Component } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Page from '../core/Page';
import R from '../core/router';
import List from './List';

class Home extends Page {
  gotoList = () => {
    R.push(List, { from: 'home' }).then(wt => {
      // console.log('Home then', wt);
    }).catch(e => {
      // console.log('Home catch', e);
    });
  }

  onShow() {
    // console.log('home on Show R.db', R.db);
    // // console.log('home show this', this);
  }

  onHide() {
    // console.log('home hide this', this);
  }

  componentDidMount() {
    // // console.log('home did mount', this);
  }

  componentWillUnmount() {
    // // console.log('home will umount', this);
  }

  render() {
    return <View>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <Text>Home</Text>
      <TouchableOpacity onPress={this.gotoList}>
        <Text>List</Text>
        <Text>List</Text>
        <Text>List</Text>
        <Text>List</Text>
      </TouchableOpacity>
    </View>
  }
}

export default Home;
