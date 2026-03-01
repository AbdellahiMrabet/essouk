// screens/components/ProductHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ProductHeaderProps {
  onBack: () => void;
  onHome: () => void;
}

const ProductHeader: React.FC<ProductHeaderProps> = ({ onBack, onHome }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backButton} onPress={onBack}>
      <Text style={styles.backButtonText}>← رجوع</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.homeButton} onPress={onHome}>
      <Text style={styles.homeButtonText}>🏠 الرئيسية</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  homeButton: {
    padding: 8,
    backgroundColor: '#007bff',
    borderRadius: 6,
  },
  homeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ProductHeader;