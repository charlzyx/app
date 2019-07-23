import React, { Component } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Page from '../core/Page';
import R from '../core/router';

class Detail extends Page {
  gotoHome = () => {
    R.go('Home', { detail: 'detail' });
  }

  back = () => {
    R.pop({ detailback: 'detailback' });
  }


  onShow() {
    console.log('list on Show R.db', R.db);
  }

  componentDidMount() {
    console.log('detail did mount');
  }

  componentWillUnmount() {
    console.log('detail will umount');
  }

  render() {
    return <View>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <Text>Detail</Text>
      <TouchableOpacity onPress={this.gotoHome}>
        <Text>Home</Text>
        <Text>Home</Text>
        <Text>Home</Text>
        <Text>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={this.back}>
        <Text>back</Text>
        <Text>back</Text>
        <Text>back</Text>
        <Text>back</Text>
      </TouchableOpacity>
    </View>
  }
}

export default Detail;
