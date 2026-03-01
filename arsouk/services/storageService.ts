// services/storageService.ts
import * as SecureStore from 'expo-secure-store';

// Storage keys
const STORAGE_KEYS = {
  SYNC_QUEUE: 'sync_queue',
  OFFLINE_PRODUCTS: 'offline_products',
  PENDING_OPERATIONS: 'pending_operations',
  APP_DATA: 'app_data',
} as const;

// Operation types
export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncOperation {
  id: string;
  type: OperationType;
  data: any;
  timestamp: number;
  retryCount: number;
  productId?: number;
}

export interface OfflineProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUri?: string;
  createdAt: number;
  isSynced: boolean;
}

class StorageService {
  /**
   * Save item to secure storage
   */
  private async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`❌ Error saving to secure store (key: ${key}):`, error);
      throw new Error(`Failed to save data securely: ${error}`);
    }
  }

  /**
   * Get item from secure storage
   */
  private async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`❌ Error reading from secure store (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * Remove item from secure storage
   */
  private async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`❌ Error removing from secure store (key: ${key}):`, error);
    }
  }

  /**
   * Save operations to secure storage
   */
  async saveOperationsToStorage(operations: SyncOperation[]): Promise<void> {
    try {
      console.log(`💾 Saving ${operations.length} operations to secure storage`);
      await this.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(operations));
      console.log('✅ Operations saved securely');
    } catch (error) {
      console.error('❌ Error saving operations to secure storage:', error);
      throw new Error('Failed to save operations securely');
    }
  }

  /**
   * Load operations from secure storage
   */
  async loadOperationsFromStorage(): Promise<SyncOperation[]> {
    try {
      const stored = await this.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!stored) return [];
      
      const operations = JSON.parse(stored);
      console.log(`📂 Loaded ${operations.length} operations from secure storage`);
      return operations;
    } catch (error) {
      console.error('❌ Error loading operations from secure storage:', error);
      return [];
    }
  }

  /**
   * Clear all operations from secure storage
   */
  async clearOperationsFromStorage(): Promise<void> {
    try {
      await this.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      console.log('🧹 Operations cleared from secure storage');
    } catch (error) {
      console.error('❌ Error clearing operations from secure storage:', error);
    }
  }

  /**
   * Remove specific operations by IDs
   */
  async removeOperationsFromStorage(operationIds: string[]): Promise<void> {
    try {
      const operations = await this.loadOperationsFromStorage();
      const filteredOperations = operations.filter(op => !operationIds.includes(op.id));
      
      await this.saveOperationsToStorage(filteredOperations);
      console.log(`🗑️ Removed ${operationIds.length} operations from secure storage`);
    } catch (error) {
      console.error('❌ Error removing operations from secure storage:', error);
    }
  }

  /**
   * Save offline products to secure storage
   */
  async saveOfflineProducts(products: OfflineProduct[]): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.OFFLINE_PRODUCTS, JSON.stringify(products));
      console.log(`💾 Saved ${products.length} offline products securely`);
    } catch (error) {
      console.error('❌ Error saving offline products to secure storage:', error);
      throw new Error('Failed to save products securely');
    }
  }

  /**
   * Load offline products from secure storage
   */
  async loadOfflineProducts(): Promise<OfflineProduct[]> {
    try {
      const stored = await this.getItem(STORAGE_KEYS.OFFLINE_PRODUCTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error loading offline products from secure storage:', error);
      return [];
    }
  }

  /**
   * Add a single operation to the secure queue
   */
  async addOperationToQueue(operation: SyncOperation): Promise<void> {
    try {
      const existingOperations = await this.loadOperationsFromStorage();
      const updatedOperations = [...existingOperations, operation];
      await this.saveOperationsToStorage(updatedOperations);
      console.log(`➕ Added operation ${operation.id} to secure queue`);
    } catch (error) {
      console.error('❌ Error adding operation to secure queue:', error);
      throw error;
    }
  }

  /**
   * Update operation retry count in secure storage
   */
  async updateOperationRetry(operationId: string, retryCount: number): Promise<void> {
    try {
      const operations = await this.loadOperationsFromStorage();
      const updatedOperations = operations.map(op =>
        op.id === operationId ? { ...op, retryCount } : op
      );
      await this.saveOperationsToStorage(updatedOperations);
    } catch (error) {
      console.error('❌ Error updating operation retry count in secure storage:', error);
    }
  }

  /**
   * Get operations that need to be synced
   */
  async getPendingOperations(): Promise<SyncOperation[]> {
    try {
      const operations = await this.loadOperationsFromStorage();
      return operations.filter(op => op.retryCount < 3);
    } catch (error) {
      console.error('❌ Error getting pending operations from secure storage:', error);
      return [];
    }
  }

  /**
   * Save app data with timestamp to secure storage
   */
  async saveAppData(key: string, data: any): Promise<void> {
    try {
      const appData = await this.loadAppData();
      const updatedData = {
        ...appData,
        [key]: {
          data,
          timestamp: Date.now(),
        },
      };
      await this.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(updatedData));
    } catch (error) {
      console.error(`❌ Error saving app data to secure storage for key ${key}:`, error);
    }
  }

  /**
   * Load app data from secure storage
   */
  async loadAppData(): Promise<Record<string, { data: any; timestamp: number }>> {
    try {
      const stored = await this.getItem(STORAGE_KEYS.APP_DATA);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error loading app data from secure storage:', error);
      return {};
    }
  }

  /**
   * Clear all secure storage data
   */
  async clearAllStorage(): Promise<void> {
    try {
      await Promise.all([
        this.removeItem(STORAGE_KEYS.SYNC_QUEUE),
        this.removeItem(STORAGE_KEYS.OFFLINE_PRODUCTS),
        this.removeItem(STORAGE_KEYS.PENDING_OPERATIONS),
        this.removeItem(STORAGE_KEYS.APP_DATA),
      ]);
      console.log('🗑️ All secure storage data cleared');
    } catch (error) {
      console.error('❌ Error clearing all secure storage:', error);
    }
  }

  /**
   * Get secure storage info
   */
  async getStorageInfo(): Promise<{
    operationCount: number;
    offlineProductCount: number;
    totalKeys: number;
  }> {
    try {
      const [operations, offlineProducts, appData] = await Promise.all([
        this.getItem(STORAGE_KEYS.SYNC_QUEUE),
        this.getItem(STORAGE_KEYS.OFFLINE_PRODUCTS),
        this.getItem(STORAGE_KEYS.APP_DATA),
      ]);

      return {
        operationCount: operations ? JSON.parse(operations).length : 0,
        offlineProductCount: offlineProducts ? JSON.parse(offlineProducts).length : 0,
        totalKeys: [operations, offlineProducts, appData].filter(Boolean).length,
      };
    } catch (error) {
      console.error('❌ Error getting secure storage info:', error);
      return { operationCount: 0, offlineProductCount: 0, totalKeys: 0 };
    }
  }

  /**
   * Check if secure storage is available
   */
  async isSecureStorageAvailable(): Promise<boolean> {
    try {
      const testKey = 'secure_storage_test';
      const testValue = 'test_value';
      
      await this.setItem(testKey, testValue);
      const retrievedValue = await this.getItem(testKey);
      await this.removeItem(testKey);
      
      return retrievedValue === testValue;
    } catch (error) {
      console.error('❌ Secure storage not available:', error);
      return false;
    }
  }
}

export const storageService = new StorageService();