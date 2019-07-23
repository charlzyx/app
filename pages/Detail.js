import React, { Component } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Page from '../core/Page';
import Cover from '../core/Cover';
import Hello from '../biz/Hello';
import R from '../core/router';

class Detail extends Page {
  gotoHome = () => {
    R.go('Home', { detail: 'detail' });
  }

  back = () => {
    R.pop({ detailback: 'detailback' });
  }

  popup = () => {
    R.popup(() => <Cover>
      <Hello></Hello>
      <TouchableOpacity onPress={this.dismiss}>
        <Text>dismiss</Text>
        <Text>dismiss</Text>
        <Text>dismiss</Text>
        <Text>dismiss</Text>
      </TouchableOpacity>
    </Cover>)
  }

  dismiss = () => {
    R.dismiss();
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
      <TouchableOpacity onPress={this.popup}>
        <Text>pop</Text>
        <Text>pop</Text>
        <Text>pop</Text>
        <Text>pop</Text>
      </TouchableOpacity>

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
