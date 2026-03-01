// screens/components/PurchaseModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { Product } from '../../products/types';
import { contactService } from '../../services/contactService';

interface PurchaseModalProps {
  visible: boolean;
  product: Product;
  quantity: number;
  onClose: () => void;
  onConfirm: () => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  visible,
  product,
  quantity,
  onClose,
  onConfirm
}) => {
  const [message, setMessage] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  const totalPrice = product.price * quantity;

  const handlePurchase = async () => {
    if (!product.owner) return;

    setPurchasing(true);
    try {
      const finalMessage = message || `مرحبا ${product.owner.username}! أريد شراء "${product.name}".`;

      contactService.showUserContactOptions(
        product.owner,
        `شراء: ${product.name} (${quantity}x)`,
        `معلومات الشراء:
المنتج: ${product.name}
الكمية: ${quantity}
سعر الفرد: $${product.price.toFixed(2)}
المجموع: $${totalPrice.toFixed(2)}

Message: ${finalMessage}`
      );

      onConfirm();
      setMessage('');
      Alert.alert('تم', 'تم تأكيد الشراء تواصل مع البائع.');
    } catch (error) {
      Alert.alert('خطأ', 'حاول مرة أخرى.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Confirm Purchase</Text>
          
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text>Product:</Text>
              <Text style={styles.bold}>{product.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Quantity:</Text>
              <Text style={styles.bold}>{quantity}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Unit Price:</Text>
              <Text style={styles.bold}>${product.price.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.bold}>المجموع:</Text>
              <Text style={styles.total}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.label}>Message to Seller:</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={3}
            value={message}
            onChangeText={setMessage}
            placeholder="Add any additional details..."
            placeholderTextColor="#999"
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancel]}
              onPress={onClose}
              disabled={purchasing}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.confirm]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.confirmText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 8,
    marginTop: 8,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    height: 80,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancel: {
    backgroundColor: '#6c757d',
  },
  confirm: {
    backgroundColor: '#28a745',
  },
  cancelText: {
    color: 'white',
    fontWeight: '600',
  },
  confirmText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default PurchaseModal;