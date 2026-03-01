// screens/components/SellerInfo.tsx - Updated with onRefresh prop
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Seller } from '../../products/types';

interface SellerInfoProps {
  owner: Seller;
  onRefresh?: () => void;
}

const SellerInfo: React.FC<SellerInfoProps> = ({ owner, onRefresh }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>معلومات البائع</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.info}>الاسم: {owner.username}</Text>
      {owner.email && (
        <Text style={styles.info}>الايميل: {owner.email}</Text>
      )}
      {owner.phone && (
        <Text style={styles.info}>الهاتف: {owner.phone}</Text>
      )}
      {owner.whats && (
        <Text style={styles.info}>الواتساب: {owner.whats}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
});

export default SellerInfo;