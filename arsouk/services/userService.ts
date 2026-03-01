// services/userService.ts - Enhanced version
import { Seller } from '../products/types';
import * as SecureStore from 'expo-secure-store';

class UserService {
  // Get current user from secure storage
  async getCurrentUser(): Promise<Seller["usertype_id"] | null> {
    try {
      const userData = await SecureStore.getItemAsync('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user === 1; // Assuming 1 is admin usertype_id
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Check if user can send broadcast notifications
  async canSendBroadcast(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      // Admin users can always send broadcasts
      // Regular users might need premium features or limits
      console.log('User type ID:', user);
      return user === 1;
    } catch (error) {
      console.error('Error checking broadcast permissions:', error);
      return false;
    }
  }

  // Get user notification preferences
  async getNotificationPreferences(): Promise<{
    enabled: boolean;
    newProducts: boolean;
    priceDrops: boolean;
    promotions: boolean;
  }> {
    try {
      const preferences = await SecureStore.getItemAsync('notification_preferences');
      return preferences ? JSON.parse(preferences) : {
        enabled: true,
        newProducts: true,
        priceDrops: true,
        promotions: true,
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        enabled: true,
        newProducts: true,
        priceDrops: true,
        promotions: true,
      };
    }
  }

  // Save notification preferences
  async saveNotificationPreferences(preferences: any): Promise<void> {
    try {
      await SecureStore.setItemAsync('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  // Existing methods from your file
  getUserAsSeller(user: Seller): any {
    return {
      id: user.id,
      name: user.username,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whats,
      rating: 4.5,
      total_sales: user.products?.length || 0,
      response_rate: 90,
      response_time: 'within 24 hours',
    };
  }

  getSellerLevel(user: Seller): string {
    const productCount = user.products?.length || 0;
    
    if (productCount >= 20) return '🏆 Top Seller';
    if (productCount >= 10) return '⭐ Trusted Seller';
    if (productCount >= 1) return '👍 Active Seller';
    return '🆕 New Seller';
  }

  formatUserContact(user: Seller): {
    phone?: string;
    email?: string;
    whatsapp?: string;
    hasContactInfo: boolean;
  } {
    return {
      phone: user.phone || undefined,
      email: user.email || undefined,
      whatsapp: user.whats || undefined,
      hasContactInfo: !!(user.phone || user.email || user.whats),
    };
  }

  canContactUser(user: Seller): boolean {
    return !!(user.phone || user.email || user.whats);
  }
}

export const userService = new UserService();