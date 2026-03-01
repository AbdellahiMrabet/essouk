// services/expoNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';
import { Product } from '../products/types';
import { userService } from './userService';
import { API_BASE_URL } from '../constants/api';
import Constants from "expo-constants";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  productId?: string | number;
  productName?: string;
  navigateTo?: string;
  type?: string;
  [key: string]: string | number | undefined;
}

class ExpoNotificationService {
  private navigationRef: React.RefObject<any> | null = null;
  private readonly NAVIGATED_KEY = 'navigated_notifications';

  private async getToken(): Promise<string> {
    return await SecureStore.getItemAsync('auth_token') || '';
  }

   async registerPushToken(): Promise<boolean> {
      // Check if running on a physical device
      if (!Device.isDevice) {
        console.log('📱 Push notifications not available on emulators');
        return false;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas.projectId,
      });

      // Register with backend
      const response = await fetch(`${API_BASE_URL}/api/users/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getToken()}`,
        },
        body: JSON.stringify({
          expo_push_token: token
        }),
      });

      if (response.ok) {
        console.log('✅ Push token registered successfully');
        return true;
      } else {
        console.error('❌ Failed to register push token');
        return false;
      }
    }

  // Enhanced local notification with better formatting
  async notifyNewProduct(product: Product): Promise<string | null> {
    try {
      const sellerLevel = product.owner ? userService.getSellerLevel(product.owner) : 'Seller';
      
      const notificationData = {
        productId: product.id.toString(),
        productName: product.name,
        navigateTo: 'ProductDetail',
        type: 'new_product',
        price: product.price,
        category: product.category,
        sellerLevel: sellerLevel,
        timestamp: Date.now(),
      };

      const notificationContent = {
        title: '🛍️ New Product Available!',
        body: `${product.name} - MRO ${product.price.toFixed(2)} • ${sellerLevel}`,
        data: notificationData,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };

      // Add image if available
      if (product.image_url) {
        if (Platform.OS === 'ios') {
          (notificationContent as any).attachments = [{ url: product.image_url }];
        } else if (Platform.OS === 'android') {
          (notificationContent as any).android.imageUrl = product.image_url;
        }
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      console.log('✅ Local product notification sent:', product.name);
      return notificationId;
    } catch (error) {
        console.error('❌ Error sending local product notification:', error);
        return null;
      }
    }

  // Set navigation reference
  setNavigationRef(ref: React.RefObject<any>): void {
    this.navigationRef = ref;
  }

  // Initialize notifications
  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('الإذن مطلوب', 'السماح بالتنبيهات حول المنتجات الجديدة.');
        return;
      }

      // Create notification channels (Android)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default Channel',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      console.log('✅ Notification service initialized');
    } catch (error) {
      console.log('❌ Failed to initialize notifications:', error);
      throw error;
    }
  }

  // Check if we've already navigated for this product
  private async hasNavigatedForProduct(productId: string | number): Promise<boolean> {
    try {
      const navigatedProducts = await SecureStore.getItemAsync(this.NAVIGATED_KEY);
      if (navigatedProducts) {
        const products = JSON.parse(navigatedProducts);
        return products.includes(productId.toString());
      }
      return false;
    } catch (error) {
      console.log('Error checking navigation history:', error);
      return false;
    }
  }

  // Mark product as navigated
  private async markAsNavigated(productId: string | number): Promise<void> {
    try {
      const id = productId.toString();
      const navigatedProducts = await SecureStore.getItemAsync(this.NAVIGATED_KEY);
      let products = navigatedProducts ? JSON.parse(navigatedProducts) : [];
      
      if (!products.includes(id)) {
        products.push(id);
        await SecureStore.setItemAsync(this.NAVIGATED_KEY, JSON.stringify(products));
        console.log(`📍 Marked product ${id} as navigated`);
      }
    } catch (error) {
      console.log('Error marking product as navigated:', error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.log('Error checking notification settings:', error);
      return false;
    }
  }

   // Enhanced broadcast method with user type handling
  async broadcastNewProduct(product: Product, token: string | undefined): Promise<boolean> {
    try {
      console.log('🛍️ Attempting to broadcast new product:', product.name, token);
      
      // Check if user can send broadcast
      const canBroadcast = await userService.canSendBroadcast();
      
      if (!canBroadcast) {
        console.log('🚫 User cannot send broadcast, falling back to local notification');
        // Fallback to local notification
        await this.notifyNewProduct(product);
        return true; // Consider it successful for UX purposes
      }

      const response = await fetch(`${API_BASE_URL}/admin/notifications/new-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id
        }),
      });

      if (!response.ok) {
        console.error('❌ Broadcast request failed with status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Broadcast notification sent successfully:', result);
      return true;
    } catch (error) {
      console.error('❌ Error in broadcast notification:', error);
      
      // Fallback to local notification
      try {
        await this.notifyNewProduct(product);
        console.log('✅ Sent local notification as fallback');
        return true; // Consider it successful with fallback
      } catch (fallbackError) {
        console.error('❌ Fallback notification also failed:', fallbackError);
        return false;
      }
    }
  }

  // Notify about price drop
  async notifyPriceDrop(product: Product, oldPrice: number, newPrice: number): Promise<void> {
    try {
      const notificationData = {
        productId: product.id.toString(),
        productName: product.name,
        navigateTo: 'ProductDetail',
        type: 'price_drop',
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Price Drop! 📉',
          body: `"${product.name}" dropped from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
          data: notificationData,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });

      console.log('✅ Price drop notification sent:', product.name);
    } catch (error) {
      console.error('❌ Error sending price drop notification:', error);
      throw error;
    }
  }

  // Setup notification event listeners
  setupNotificationListeners(): () => void {
    console.log('🔔 Setting up notification listeners...');

    // Handle notification responses (user taps on notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification pressed:', response);
      this.handleNotificationPress(response.notification.request.content.data);
    });

    return () => {
      console.log('🧹 Cleaning up notification listeners');
      responseSubscription.remove();
    };
  }

  // Handle notification press - navigate only once per product
  private async handleNotificationPress(data: any): Promise<void> {
    if (!data) {
      console.log('No notification data available');
      return;
    }

    console.log('📍 Handling notification press with data:', data);

    const productId = data.productId;
    const navigateTo = data.navigateTo;

    // Check if we've already navigated for this product
    const hasNavigated = await this.hasNavigatedForProduct(productId);
    if (hasNavigated) {
      console.log('⏭️  Already navigated for this product, skipping:', productId);
      return;
    }

    // Check if we have navigation reference
    if (!this.navigationRef?.current) {
      console.log('🚫 Navigation ref not available');
      return;
    }

    if (navigateTo === 'ProductDetail' && productId) {
      try {
        // Navigate to product details
        this.navigationRef.current.navigate('ProductDetail', {
          productId: typeof productId === 'string' ? parseInt(productId) : productId,
        });
        console.log(`➡️ Navigating to product details: ${productId}`);
        
        // Mark as navigated so we don't navigate again for this product
        await this.markAsNavigated(productId);
      } catch (error) {
        console.error('❌ Error navigating to product details:', error);
      }
    } else {
      console.log('❌ No valid navigation target found');
    }
  }

  // Get initial notification (when app is opened from notification)
  async getInitialNotification(): Promise<void> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        console.log('📱 App opened from notification:', response);
        const data = response.notification.request.content.data;
        
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          this.handleNotificationPress(data);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error handling initial notification:', error);
    }
  }

  // Reset navigation history for a product (useful for testing)
  async resetNavigationForProduct(productId: string | number): Promise<void> {
    try {
      const id = productId.toString();
      const navigatedProducts = await SecureStore.getItemAsync(this.NAVIGATED_KEY);
      
      if (navigatedProducts) {
        let products = JSON.parse(navigatedProducts);
        products = products.filter((p: string) => p !== id);
        await SecureStore.setItemAsync(this.NAVIGATED_KEY, JSON.stringify(products));
        console.log(`🔄 Reset navigation for product: ${id}`);
      }
    } catch (error) {
      console.error('Error resetting navigation for product:', error);
    }
  }

  // Clear all navigation history
  async clearAllNavigationHistory(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.NAVIGATED_KEY);
      console.log('🧹 Cleared all navigation history');
    } catch (error) {
      console.error('Error clearing navigation history:', error);
    }
  }

  // Get navigation history (for debugging)
  async getNavigationHistory(): Promise<string[]> {
    try {
      const navigatedProducts = await SecureStore.getItemAsync(this.NAVIGATED_KEY);
      return navigatedProducts ? JSON.parse(navigatedProducts) : [];
    } catch (error) {
      console.error('Error getting navigation history:', error);
      return [];
    }
  }

  // Clean up all notifications
  async cleanUpNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ All notifications cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
    }
  }

  // Test notification
  async testNotification(): Promise<void> {
    try {
      const testData = {
        productId: 'test_123',
        productName: 'Test Product',
        navigateTo: 'ProductDetail',
        type: 'test',
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification ✅',
          body: 'Tap this notification to test navigation',
          data: testData,
          sound: true,
        },
        trigger: null,
      });
      console.log('✅ Test notification sent');
    } catch (error) {
      console.log('❌ Error sending test notification:', error);
    }
  }
}

export const expoNotificationService = new ExpoNotificationService();