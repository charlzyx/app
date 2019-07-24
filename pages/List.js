import React, { Component } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Page from '../core/Page';
import R from '../core/router';
import Detail from './Detail';
import Hello from '../biz/Hello';

class List extends Page {
  gotoDetail = () => {
    R.push(Detail, { list: 'list' });
  }
  back = () => {
    R.pop({ listback: 'listback' });
  }

  onShow() {
    // console.log('list on Show R.db', R.db);
  }

  beforeEnter() {
    return new Promise((resolve, reject) => {
      setTimeout(Math.random() > 0.2 ? resolve : reject, 300);
    });
    // return Promise.reject('List Reject');
  }

  componentDidMount() {
    // // console.log('List did mount');
  }

  componentWillUnmount() {
    // // console.log('List will umount');
  }

  render() {
    return <View>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Text>List</Text>
      <Hello></Hello>
      <Text>List</Text>
      <TouchableOpacity onPress={this.gotoDetail}>
        <Text>Detail</Text>
        <Text>Detail</Text>
        <Text>Detail</Text>
        <Text>Detail</Text>
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

export default List;
