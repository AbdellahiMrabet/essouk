// screens/ProductDetail.tsx - Updated with seller loading
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { productApi } from '../products/api/productApi';
import { Product, Seller } from '../products/types';

// Import modular components
import ProductHeader from './components/ProductHeader';
import ProductImage from './components/ProductImage';
import ProductInfo from './components/ProductInfo';
import PurchaseSection from './components/PurchaseSection';
import SellerInfo from './components/SellerInfo';
import PurchaseModal from './components/PurchaseModal';

const ProductDetail: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId } = route.params as { productId: number };
  
  const [product, setProduct] = useState<Product | null>(null);
  const [users, setUsers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProductDetail();
  }, [productId]);

  // Load product details and users
  const loadProductDetail = async () => {
    try {
      setLoading(true);
      
      // Load product data
      const productData = await productApi.getProductById(productId);
      setProduct(productData);
      
      // Load users to get seller information
      await loadUsers();
      
    } catch (error) {
      console.log('لا يمكن تحميل معطيات المنتج / الخدمة:', error);
      Alert.alert('خطأ', 'لا يمكن تحميل معطيات المنتج / الخدمة');
    } finally {
      setLoading(false);
    }
  };

  // Load users (sellers) data
  const loadUsers = async (): Promise<void> => {
    try {
      setLoadingSeller(true);
      const userData = await productApi.getUsers();
      setUsers(userData);
    } catch (error) {
      console.log('معلومات البائع غير متوفرى مؤقتا:', error);
      // Continue even if users fail to load
    } finally {
      setLoadingSeller(false);
    }
  };

  // Refresh seller data
  const refreshSellerData = async (): Promise<void> => {
    await loadUsers();
  };

  // Get the seller information for the current product
  const getProductSeller = (): Seller | null => {
    if (!product || users.length === 0) return null;
    
    const seller = users.find(user => user.id === product.owner_id);
    return seller || null;
  };

  const handleBackToProducts = () => {
    navigation.navigate('Products' as never);
  };

  const handleBackToHome = () => {
    navigation.navigate('Home' as never);
  };

  const handleBuyProduct = () => {
    if (!product) {
      Alert.alert('خطأ', 'لا تتوفر معلومات عن هذا المنتج.');
      return;
    }

    const seller = getProductSeller();
    if (!seller) {
      Alert.alert('Error', 'Seller information is not available.');
      return;
    }

    setBuyModalVisible(true);
  };

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => quantity > 1 && setQuantity(prev => prev - 1);

  // Get product with seller data
  const productWithSeller = product ? {
    ...product,
    owner: getProductSeller()
  } : null;

  if (loading) {
    return <LoadingScreen />;
  }

  if (!product) {
    return <ErrorScreen onBackToHome={handleBackToHome} />;
  }

  return (
    <View style={styles.container}>
      <ProductHeader 
        onBack={handleBackToProducts}
        onHome={handleBackToHome}
      />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={loadingSeller}
            onRefresh={refreshSellerData}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
      >
        <ProductImage imageUrl={product.image_url} />
        
        <View style={styles.content}>
          <ProductInfo 
            name={product.name}
            price={product.price}
            description={product.description}
            category={product.category}
          />
          
          {/* Seller Loading Indicator */}
          {loadingSeller && (
            <View style={styles.sellerLoadingContainer}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.sellerLoadingText}>Loading seller information...</Text>
            </View>
          )}
          
          <PurchaseSection 
            quantity={quantity}
            price={product.price}
            onIncreaseQuantity={increaseQuantity}
            onDecreaseQuantity={decreaseQuantity}
            onBuyProduct={handleBuyProduct}
            product={productWithSeller || product}
            sellerLoading={loadingSeller}
          />
          
          {getProductSeller() && (
            <View style={styles.sellerInfoContainer}>
              <SellerInfo 
                owner={getProductSeller()!} 
                onRefresh={refreshSellerData}
              />
            </View>
          )}

          {/* No Seller Info Message */}
          {!loadingSeller && !getProductSeller() && (
            <View style={styles.noSellerContainer}>
              <Text style={styles.noSellerText}>Seller information not available</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={refreshSellerData}
              >
                <Text style={styles.retryButtonText}>Retry Loading Seller</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <PurchaseModal
        visible={buyModalVisible}
        product={productWithSeller || product}
        quantity={quantity}
        onClose={() => setBuyModalVisible(false)}
        onConfirm={() => setBuyModalVisible(false)}
      />
    </View>
  );
};

// Loading Component
const LoadingScreen: React.FC = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color="#007bff" />
    <Text style={styles.loadingText}>Loading product...</Text>
  </View>
);

// Error Component
const ErrorScreen: React.FC<{ onBackToHome: () => void }> = ({ onBackToHome }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.errorText}>Product not found</Text>
    <TouchableOpacity style={styles.homeButton} onPress={onBackToHome}>
      <Text style={styles.homeButtonText}>Back to Home</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  homeButton: {
    padding: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  sellerLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  sellerLoadingText: {
    fontSize: 14,
    color: '#6c757d',
  },
  noSellerContainer: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    alignItems: 'center',
    marginBottom: 16,
  },
  noSellerText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    padding: 8,
    backgroundColor: '#ffc107',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  sellerInfoContainer: {
    marginTop: 5, // Increased from default to create more space
    marginBottom: 30,
  },
});

// Add RefreshControl import at the top
import { RefreshControl } from 'react-native';

export default ProductDetail;