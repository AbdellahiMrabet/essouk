// ProdAdmin.tsx - Cleaned and Optimized Version
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Product, Seller, FormData } from './types';
import { productApi } from './api/productApi';
import { expoNotificationService } from '../services/expoNotificationService';
import { contactService } from '../services/contactService';
import { userService } from '../services/userService';

type RootStackParamList = {
  ProductDetail: { productId: number };
  ProdAdmin: undefined;
};

type ProductListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProdAdmin'>;

const DEFAULT_IMAGE = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=No+Image';
const TOKEN_KEY = 'auth_token';

const ProdAdmin: React.FC = () => {
  const navigation = useNavigation<ProductListNavigationProp>();
  const navigationRef = useRef(navigation);

  // State declarations
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<Seller[]>([]);
  const [selectedProductsForContact, setSelectedProductsForContact] = useState<Product[]>([]);
  const [contactSelectionMode, setContactSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    description: '',
    category: 'General',
    owner_id: null,
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [currentUser, setCurrentUser] = useState<Seller['usertype_id'] | null>(null);

  // Load current user data
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async (): Promise<void> => {
    try {
      const userData = await SecureStore.getItemAsync('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        console.log('Loaded current user:', user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // Effects
  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    expoNotificationService.setNavigationRef(navigationRef);
    const cleanup = expoNotificationService.setupNotificationListeners();
    expoNotificationService.getInitialNotification();
    return cleanup;
  }, []);

  // Initialization
  const initializeApp = async (): Promise<void> => {
    try {
      await loadToken();
      await loadUsers();
      await initializeNotifications();
    } catch (error) {
      console.error('Error initializing app:', error);
      setError('Failed to initialize app');
      setLoading(false);
    }
  };

  const loadToken = async (): Promise<void> => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken || '');
        console.log('Token loaded from storage', token);
        SecureStore.setItemAsync(TOKEN_KEY, token || '');
      }
      else {
          console.log('No token found in storage');
          setToken('');
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  };

  const loadUsers = async (): Promise<void> => {
    try {
      const userData = await productApi.getUsers();
      setUsers(userData);
      await loadProducts(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      await loadProducts([]);
    }
  };

  const loadProducts = async (usersData: Seller[] = users): Promise<void> => {
    try {
      setError('');
      const data = await productApi.getProducts();
      
      const productsWithOwners = data.map(product => ({
        ...product,
        owner: usersData.find(seller => seller.id === product.owner_id) || null
      }));
      
      setProducts(productsWithOwners);
    } catch (err) {
      setError('Failed to load products. Please check your connection.');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const initializeNotifications = async (): Promise<void> => {
    try {
      await expoNotificationService.initialize();
      const enabled = await expoNotificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  // Search and Filter
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim() && searchCategory === 'all') return products;

    return products.filter(product => {
      const matchesSearch = !searchQuery.trim() || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.owner?.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = searchCategory === 'all' || 
        product.category.toLowerCase() === searchCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, searchCategory]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(product => product.category));
    return ['all', ...Array.from(uniqueCategories)].filter(category => 
      category?.trim() !== ''
    );
  }, [products]);

  const clearSearch = (): void => {
    setSearchQuery('');
    setSearchCategory('all');
  };

  // Permission Requests
  const requestMediaLibraryPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  };

  const requestCameraPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  };

  // Refresh and Retry
  const onRefresh = (): void => {
    setRefreshing(true);
    loadUsers();
  };

  const handleRetry = (): void => {
    setRefreshing(true);
    loadUsers();
  };

  // Contact Selection Functions
  const selectProductForContact = (product: Product): void => {
    setSelectedProductsForContact(prev => 
      prev.some(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    );
  };

  const startContactSelection = (): void => {
    setContactSelectionMode(true);
    setSelectedProductsForContact([]);
  };

  const cancelContactSelection = (): void => {
    setContactSelectionMode(false);
    setSelectedProductsForContact([]);
  };

  const contactSelectedSellers = (): void => {
    if (selectedProductsForContact.length === 0) {
      Alert.alert('No Products Selected', 'Please select at least one product to contact sellers.');
      return;
    }

    selectedProductsForContact.length === 1
      ? handleQuickContact(selectedProductsForContact[0])
      : showMultipleContactOptions();
    
    cancelContactSelection();
  };

  const showMultipleContactOptions = (): void => {
    const uniqueSellers = getUniqueSellers(selectedProductsForContact);
    
    if (uniqueSellers.length === 1) {
      const seller = uniqueSellers[0];
      Alert.alert(
        `Contact ${seller.username}`,
        `You've selected ${selectedProductsForContact.length} products from this seller`,
        [
          {
            text: 'Contact Seller',
            onPress: () => contactService.showUserContactOptions(seller, `${selectedProductsForContact.length} products`),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Multiple Sellers',
        `You've selected products from ${uniqueSellers.length} different sellers. You'll need to contact them separately.`,
        [
          {
            text: 'Contact First Seller',
            onPress: () => contactService.showUserContactOptions(uniqueSellers[0], 'selected products'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const getUniqueSellers = (products: Product[]): Seller[] => {
    const sellerIds = new Set();
    return products.reduce<Seller[]>((unique, product) => {
      if (product.owner && !sellerIds.has(product.owner.id)) {
        sellerIds.add(product.owner.id);
        unique.push(product.owner);
      }
      return unique;
    }, []);
  };

  // Contact Functions
  const handleContactMethod = async (method: 'call' | 'whatsapp' | 'email' | 'sms'): Promise<void> => {
    if (!selectedProduct?.owner) return;

    const user = selectedProduct.owner;
    const contactActions = {
      call: () => user.phone ? contactService.makePhoneCall(user.phone) : Promise.reject('Phone not available'),
      whatsapp: () => user.whats ? contactService.sendWhatsApp(user.whats, `Hi ${user.username}! I'm interested in your product "${selectedProduct.name}".`) : Promise.reject('WhatsApp not available'),
      email: () => user.email ? contactService.sendEmail(user.email, `Inquiry about ${selectedProduct.name}`, `Hello ${user.username},\n\nI'm interested in your product "${selectedProduct.name}".`) : Promise.reject('Email not available'),
      sms: () => user.phone ? contactService.sendSMS(user.phone, `Hi ${user.username}! I'm interested in "${selectedProduct.name}".`) : Promise.reject('SMS not available'),
    };

    try {
      await contactActions[method]();
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : `Failed to ${method} seller`;
      Alert.alert('Not Available', errorMessage);
    } finally {
      setContactModalVisible(false);
    }
  };

  const handleQuickContact = (product: Product): void => {
    if (!product.owner) {
      Alert.alert('Contact Unavailable', 'Seller information not available for this product.');
      return;
    }

    if (!userService.canContactUser(product.owner)) {
      Alert.alert('Contact Unavailable', 'This seller has not provided any contact information.');
      return;
    }

    contactService.showUserContactOptions(product.owner, product.name);
  };

  // Product Management
  const handleAdd = (): void => {
    setEditingProduct(null);
    setFormData({ name: '', price: '', description: '', category: 'General', owner_id: null });
    setImage(null);
    setModalVisible(true);
  };

  const handleEdit = (item: Product): void => {
    setEditingProduct(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      description: item.description,
      category: item.category,
      image_url: item.image_url || '',
      owner_id: item.owner_id,
    });
    setImage(null);
    setModalVisible(true);
  };

  const handleDelete = async (product: Product): Promise<void> => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await productApi.deleteProduct(product.id, token);
              await loadProducts();
            } catch (err: any) {
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Image Handling
  const pickImageFromGallery = async (): Promise<void> => {
    try {
      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) {
        Alert.alert('Permission denied', 'Media library permission is required to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setImage(asset);
        setFormData(prev => ({ ...prev, image_url: asset.uri, image: asset }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const takePhotoWithCamera = async (): Promise<void> => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) {
        Alert.alert('Permission denied', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setImage(asset);
        setFormData(prev => ({ ...prev, image_url: asset.uri, image: asset }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (): void => {
    setImage(null);
    setFormData(prev => ({ ...prev, image_url: '', image: undefined }));
  };

   // Updated handleSave function
  const handleSave = async (): Promise<void> => {
    if (!formData.name?.trim() || !formData.price?.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setUploading(true);
      
      const apiData: FormData = {
        name: formData.name.trim(),
        price: formData.price,
        description: formData.description?.trim() || '',
        category: formData.category?.trim() || 'General',
        owner_id: formData.owner_id,
        image: formData.image,
        ...(formData.image_url && { image_url: formData.image_url })
      };

      let result;
      if (editingProduct) {
        result = await productApi.updateProduct(editingProduct.id, apiData, token);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        result = await productApi.createProduct(apiData, token);
        Alert.alert('Success', 'Product created successfully');
        
        // Send notification after successful product creation
        await handleProductCreationNotification(result);
      }

      setModalVisible(false);
      resetForm();
      await loadProducts();
    } catch (err: any) {
      Alert.alert('حساب غير مفعل', err.message || 'Failed to save product');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = (): void => {
    setModalVisible(false);
    setFormData({ name: '', price: '', description: '', category: 'General', owner_id: null });
    setImage(null);
  };

   // Reset form function
  const resetForm = (): void => {
    setFormData({ name: '', price: '', description: '', category: 'General', owner_id: null });
    setImage(null);
    setEditingProduct(null);
  };

  // Send local notification (fallback)
  const sendLocalNotification = async (product: Product): Promise<void> => {
    try {
      await expoNotificationService.notifyNewProduct(product);
      console.log('✅ Local notification sent as fallback');
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
    }
  };

   // Send broadcast notification to all users
  const sendBroadcastNotification = async (product: Product, token: string): Promise<void> => {
    try {
      console.log('🔄 Sending broadcast notification for product:', product.name);
      
      // Show loading state
      Alert.alert('📢 Notifying Users', 'Sending notification to all users...');
      
      const success = await expoNotificationService.broadcastNewProduct(product, token);
      
      if (success) {
        Alert.alert(
          '✅ Notification Sent!',
          `All users have been notified about "${product.name}"`,
          [{ text: 'Great!' }]
        );
        console.log('✅ Broadcast notification sent successfully');
      } else {
        Alert.alert(
          '⚠️ Limited Reach',
          'Notification sent locally. Some users may not receive it.',
          [{ text: 'OK' }]
        );
        console.log('⚠️ Broadcast partially failed, local notification sent');
      }
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      // Fallback to local notification
      sendLocalNotification(product);
      Alert.alert(
        '📱 Notification Sent',
        'Users will see your new product in the app.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle product creation notification based on user type
  const handleProductCreationNotification = async (product: Product): Promise<void> => {
    try {
      // Check if notifications are enabled
      if (!notificationsEnabled) {
        console.log('🔕 Notifications disabled, skipping broadcast');
        return;
      }

      // Check if current user is admin (usertype_id === 1)
      const isAdmin = currentUser === 1;
      
      if (isAdmin) {
        // Admin users - auto-send broadcast notification
        console.log('👑 Admin user detected - auto-sending broadcast');
        await sendBroadcastNotification(product, token);
      } else {
        // Regular users - ask for confirmation
        Alert.alert(
          '🎉 Share with Everyone?',
          'Would you like to notify all users about your new product?',
          [
            {
              text: 'No Thanks',
              style: 'cancel',
              onPress: () => {
                console.log('User declined broadcast notification');
                // Still send a local notification to the creator
                sendLocalNotification(product);
              }
            },
            {
              text: 'Yes, Notify All!',
              style: 'default',
              onPress: async () => {
                await sendBroadcastNotification(product, token);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error in product creation notification:', error);
      // Fallback to local notification
      sendLocalNotification(product);
    }
  };

  // Utility Functions
  const formatPrice = (price: number): string => `$${price.toFixed(2)}`;
  const formatDate = (dateString: string): string => new Date(dateString).toLocaleDateString();
  const getImageSource = (product: Product) => ({ uri: product.image_url || DEFAULT_IMAGE });

// In ProdAdmin.tsx - Update the renderProduct function
const renderProduct = ({ item }: { item: Product }) => {
  const isSelectedForContact = selectedProductsForContact.some(p => p.id === item.id);
  const user = item.owner;

  return (
    <TouchableOpacity 
      style={[
        styles.productItem,
        isSelectedForContact && styles.selectedForContact,
        contactSelectionMode && styles.contactSelectionModeItem
      ]}
      onPress={() => {
          // Navigate to ProductDetail when clicking on product
          navigation.navigate('ProductDetail', { productId: item.id });
      
      }}
      delayLongPress={500}
    >
      {/* Selection indicator - only show in contact selection mode */}
      {contactSelectionMode && (
        <View style={styles.contactSelectionIndicator}>
          <View style={[
            styles.contactCheckbox,
            isSelectedForContact && styles.contactCheckboxSelected
          ]}>
            {isSelectedForContact && <Text style={styles.contactCheckmark}>✓</Text>}
          </View>
        </View>
      )}

      <View style={styles.productImageContainer}>
        <Image 
          source={getImageSource(item)} 
          style={styles.productImage}
          resizeMode="cover"
          defaultSource={{ uri: DEFAULT_IMAGE }}
        />
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.productMeta}>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productDate}>
            {formatDate(item.updated_at)}
          </Text>
        </View>

        {/* Seller Info using actual user data */}
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerText}>
            Sold by: {user?.username || 'Unknown Seller'}
          </Text>
        </View>
      </View>
      
      {/* Actions - hide during contact selection mode */}
      {!contactSelectionMode && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.contactButton]}
            onPress={() => handleQuickContact(item)}
          >
            <Text style={styles.buttonText}>Contact</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {contactSelectionMode 
            ? `Contact Sellers (${selectedProductsForContact.length} selected)`
            : 'Products'
          }
        </Text>
        
        <View style={styles.headerActions}>
          {contactSelectionMode ? (
            <View style={styles.contactModeActions}>
              <TouchableOpacity 
                style={[styles.headerButton, selectedProductsForContact.length === 0 && styles.disabledButton]}
                onPress={contactSelectedSellers}
                disabled={selectedProductsForContact.length === 0}
              >
                <Text style={styles.headerButtonText}>Contact ({selectedProductsForContact.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerButton, styles.cancelHeaderButton]} onPress={cancelContactSelection}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.normalModeActions}>
              <TouchableOpacity 
                style={[styles.notificationButton, !notificationsEnabled && styles.notificationButtonDisabled]}
                onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                <Text style={styles.notificationButtonText}>{notificationsEnabled ? '🔔' : '🔕'}</Text>
              </TouchableOpacity> 
              <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>+ Add Product</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>Activate user</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.searchIcon}>🔍</Text>
          )}
        </View>

        <View style={styles.categoryFilterContainer}>
          <Text style={styles.filterLabel}>Category:</Text>
          <View style={styles.categoryButtons}>
            {categories.slice(0, 4).map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, searchCategory === category && styles.categoryButtonActive]}
                onPress={() => setSearchCategory(category)}
              >
                <Text style={[styles.categoryButtonText, searchCategory === category && styles.categoryButtonTextActive]}>
                  {category === 'all' ? 'All' : category}
                </Text>
              </TouchableOpacity>
            ))}
            {categories.length > 4 && (
              <TouchableOpacity
                style={styles.moreCategoriesButton}
                onPress={() => {
                  Alert.alert(
                    'Select Category',
                    'Choose a category to filter by:',
                    categories.map(category => ({
                      text: category === 'all' ? 'All Categories' : category,
                      onPress: () => setSearchCategory(category)
                    }))
                  );
                }}
              >
                <Text style={styles.moreCategoriesText}>More...</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {(searchQuery || searchCategory !== 'all') && (
          <View style={styles.searchResultsInfo}>
            <Text style={styles.searchResultsText}>
              Showing {filteredProducts.length} of {products.length} products
              {searchQuery && ` for "${searchQuery}"`}
              {searchCategory !== 'all' && ` in ${searchCategory}`}
            </Text>
            <TouchableOpacity style={styles.clearAllButton} onPress={clearSearch}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item: Product) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || searchCategory !== 'all' ? 'No matching products found' : 'No products found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || searchCategory !== 'all' 
                ? 'Try adjusting your search criteria' 
                : 'Add your first product to get started'
              }
            </Text>
            {(searchQuery || searchCategory !== 'all') ? (
              <TouchableOpacity style={styles.emptyButton} onPress={clearSearch}>
                <Text style={styles.emptyButtonText}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              !contactSelectionMode && (
                <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
                  <Text style={styles.emptyButtonText}>Add Product</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
            
            <View style={styles.imageSection}>
              <Text style={styles.sectionLabel}>Product Image</Text>
              
              {formData.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formData.image_url }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No Image Selected</Text>
                </View>
              )}
              
              <View style={styles.imageButtons}>
                <TouchableOpacity style={[styles.imageButton, styles.galleryButton]} onPress={pickImageFromGallery}>
                  <Text style={styles.imageButtonText}>📁 Choose from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imageButton, styles.cameraButton]} onPress={takePhotoWithCamera}>
                  <Text style={styles.imageButtonText}>📷 Take Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Product Name *"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({...prev, name: text}))}
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Price *"
              value={formData.price}
              onChangeText={(text) => setFormData(prev => ({...prev, price: text}))}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({...prev, description: text}))}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Category"
              value={formData.category}
              onChangeText={(text) => setFormData(prev => ({...prev, category: text}))}
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCancel} disabled={uploading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingProduct ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Seller Modal */}
      <Modal animationType="slide" transparent visible={contactModalVisible} onRequestClose={() => setContactModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.contactModalContent}>
            <Text style={styles.modalTitle}>Contact Seller</Text>
            
            {selectedProduct?.owner && (
              <>
                <View style={styles.contactProductInfo}>
                  <Image source={getImageSource(selectedProduct)} style={styles.contactProductImage} resizeMode="cover" />
                  <View style={styles.contactProductDetails}>
                    <Text style={styles.contactProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.contactProductPrice}>{formatPrice(selectedProduct.price)}</Text>
                  </View>
                </View>

                <Text style={styles.contactSellerText}>Contact {selectedProduct.owner.username} about this product</Text>

                <View style={styles.contactMethods}>
                  {(['call', 'whatsapp', 'email', 'sms'] as const).map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.contactMethodButton, styles[`${method}Button`]]}
                      onPress={() => handleContactMethod(method)}
                    >
                      <Text style={styles.contactMethodIcon}>
                        {method === 'call' ? '📞' : method === 'whatsapp' ? '💬' : method === 'email' ? '📧' : '💬'}
                      </Text>
                      <Text style={styles.contactMethodText}>
                        {method === 'call' ? 'Call Seller' : method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : 'SMS'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setContactModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles remain the same as in your original code
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactModeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  normalModeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  headerButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelHeaderButton: {
    backgroundColor: '#6c757d',
  },
  notificationButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  notificationButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  notificationButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  searchSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212529',
  },
  searchIcon: {
    fontSize: 16,
    color: '#6c757d',
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  categoryFilterContainer: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  categoryButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  moreCategoriesButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6c757d',
    borderRadius: 16,
  },
  moreCategoriesText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  searchResultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  searchResultsText: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  selectionHelp: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
  },
  selectionHelpText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectionSubText: {
    color: '#4CAF50',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    margin: 10,
    borderRadius: 6,
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  list: {
    padding: 10,
    paddingBottom: 20,
  },
  productItem: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedForContact: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  contactSelectionModeItem: {
    opacity: 0.9,
  },
  contactSelectionIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  contactCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCheckboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  contactCheckmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCategory: {
    fontSize: 10,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productDate: {
    fontSize: 9,
    color: '#adb5bd',
  },
  sellerInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sellerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButton: {
    backgroundColor: '#007bff',
  },
  editButton: {
    backgroundColor: '#ffc107',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212529',
  },
  imageSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 12,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  removeImageText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: -1,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ced4da',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  imageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButton: {
    backgroundColor: '#6c757d',
  },
  cameraButton: {
    backgroundColor: '#28a745',
  },
  imageButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#212529',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  contactModalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  contactProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contactProductImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  contactProductDetails: {
    flex: 1,
  },
  contactProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  contactProductPrice: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  contactSellerText: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 20,
  },
  contactMethods: {
    gap: 12,
    marginBottom: 20,
  },
  contactMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  callButton: {
    backgroundColor: '#28a745',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  emailButton: {
    backgroundColor: '#007bff',
  },
  smsButton: {
    backgroundColor: '#6c757d',
  },
  contactMethodIcon: {
    fontSize: 20,
  },
  contactMethodText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    flex: 1,
  },
});

export default ProdAdmin;