// services/syncService.ts
import { OperationType, storageService, SyncOperation } from './storageService';
import { productApi } from '../products/api/productApi';
import { networkService } from './networkService';
import * as SecureStore from 'expo-secure-store';

class SyncService {
  private isSyncing = false;
  private readonly TOKEN_KEY = 'auth_token';

  /**
   * Get auth token from secure storage
   */
  private async getAuthToken(): Promise<string> {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token found');
      }
      return token;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      throw new Error('Authentication required');
    }
  }

  /**
   * Process all pending operations when back online
   */
  async processSyncQueue(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('🔄 Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    console.log('🔄 Starting secure sync process...');

    try {
      const token = await this.getAuthToken();
      const operations = await storageService.getPendingOperations();
      
      if (operations.length === 0) {
        console.log('✅ No pending operations to sync');
        return { success: 0, failed: 0 };
      }

      console.log(`🔄 Processing ${operations.length} pending operations securely`);

      const results = { success: 0, failed: 0 };
      const successfulOperationIds: string[] = [];

      for (const operation of operations) {
        try {
          await this.executeOperation(operation, token);
          successfulOperationIds.push(operation.id);
          results.success++;
          console.log(`✅ Securely synced operation ${operation.id}`);
        } catch (error) {
          results.failed++;
          
          const newRetryCount = operation.retryCount + 1;
          await storageService.updateOperationRetry(operation.id, newRetryCount);
          
          console.error(`❌ Failed to securely sync operation ${operation.id}:`, error);
          
          if (newRetryCount >= 3) {
            console.log(`🚫 Operation ${operation.id} exceeded max retries`);
            // You might want to notify the user about permanently failed operations
          }
        }
      }

      // Remove successful operations from secure storage
      if (successfulOperationIds.length > 0) {
        await storageService.removeOperationsFromStorage(successfulOperationIds);
        
        // Update last sync timestamp
        await storageService.saveAppData('lastSync', {
          timestamp: Date.now(),
          successfulOperations: successfulOperationIds.length,
        });
      }

      console.log(`📊 Secure sync completed: ${results.success} successful, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error('❌ Secure sync process failed:', error);
      return { success: 0, failed: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a single operation with secure token
   */
  private async executeOperation(operation: SyncOperation, token: string): Promise<void> {
    switch (operation.type) {
      case 'CREATE':
        await productApi.createProduct(operation.data, token);
        break;
      case 'UPDATE':
        if (!operation.productId) {
          throw new Error('Product ID required for update operation');
        }
        await productApi.updateProduct(operation.productId, operation.data, token);
        break;
      case 'DELETE':
        if (!operation.productId) {
          throw new Error('Product ID required for delete operation');
        }
        await productApi.deleteProduct(operation.productId, token);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Create a sync operation for secure offline saving
   */
  createSyncOperation(
    type: OperationType,
    data: any,
    productId?: number
  ): SyncOperation {
    // Sanitize data for secure storage (remove sensitive info if any)
    const sanitizedData = this.sanitizeOperationData(data);
    
    return {
      id: `secure_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: sanitizedData,
      timestamp: Date.now(),
      retryCount: 0,
      productId,
    };
  }

  /**
   * Sanitize operation data for secure storage
   */
  private sanitizeOperationData(data: any): any {
    // Remove any potentially sensitive data that shouldn't be stored
    const { password, creditCard, ssn, ...sanitizedData } = data;
    return sanitizedData;
  }

  /**
   * Check if there are pending operations
   */
  async hasPendingOperations(): Promise<boolean> {
    const operations = await storageService.getPendingOperations();
    return operations.length > 0;
  }

  /**
   * Get sync status from secure storage
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    lastSync: number | null;
    isSyncing: boolean;
    storageAvailable: boolean;
  }> {
    const operations = await storageService.getPendingOperations();
    const appData = await storageService.loadAppData();
    const storageAvailable = await storageService.isSecureStorageAvailable();
    
    return {
      pendingCount: operations.length,
      lastSync: appData.lastSync?.timestamp || null,
      isSyncing: this.isSyncing,
      storageAvailable,
    };
  }

  /**
   * Manual sync trigger with secure authentication
   */
  async manualSync(): Promise<{ success: number; failed: number }> {
    const isOnline = await networkService.checkInternetAccess();
    if (!isOnline) {
      throw new Error('No internet connection available');
    }

    // Verify we have authentication
    await this.getAuthToken();

    return this.processSyncQueue();
  }

  /**
   * Get operations for debugging (be careful with this in production)
   */
  async getOperationsForDebug(): Promise<SyncOperation[]> {
    console.warn('⚠️ Debug method called - be careful with operation data');
    return await storageService.loadOperationsFromStorage();
  }
}

export const syncService = new SyncService();