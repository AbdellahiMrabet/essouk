// screens/components/ProductInfo.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProductInfoProps {
  name: string;
  price: number;
  description: string;
  category: string;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ 
  name, 
  price, 
  description, 
  category 
}) => (
  <View style={styles.container}>
    <Text style={styles.productName}>{name}</Text>
    <Text style={styles.productPrice}>MRO {price.toFixed(2)}</Text>
    <Text style={styles.productDescription}>{description}</Text>
    <Text style={styles.productCategory}>الفئة: {category}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 20,
    color: '#007bff',
    fontWeight: '600',
    marginBottom: 15,
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
    color: '#666',
  },
  productCategory: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default ProductInfo;