import { View } from 'react-native'
import React from 'react'
import ProductList from '../products/Products'

const Home = () => {
  
  return (
    <View style={{ flex: 1 }}>
      <ProductList />
    </View>
  )
}

export default Home