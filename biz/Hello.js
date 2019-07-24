import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { PageLife } from '../core/Page'

class Hello extends Component {
  onShow() {
    // console.log('hello onShow');
  }
  onHide() {
    // console.log('hello onHide');
  }

  render() {
    return <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <PageLife onShow={this.onShow} onHide={this.onHide}></PageLife>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
        <Text>Hello</Text>
      </View>
  }
}

export default Hello;
