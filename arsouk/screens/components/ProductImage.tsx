// screens/components/ProductImage.tsx
import React from 'react';
import { Image, StyleSheet } from 'react-native';

const DEFAULT_IMAGE = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=No+Image';

interface ProductImageProps {
  imageUrl?: string;
}

const ProductImage: React.FC<ProductImageProps> = ({ imageUrl }) => (
  <Image 
    source={{ uri: imageUrl || DEFAULT_IMAGE }}
    style={styles.productImage}
    resizeMode="cover"
    defaultSource={{ uri: DEFAULT_IMAGE }}
  />
);

const styles = StyleSheet.create({
  productImage: {
    width: '100%',
    height: 300,
  },
});

export default ProductImage;