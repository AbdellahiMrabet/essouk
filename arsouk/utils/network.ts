// utils/network.ts
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * Check current network connectivity status
 */
export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return false;
  }
};

/**
 * Subscribe to network state changes
 */
export const subscribeToNetworkChanges = (
  callback: (isConnected: boolean) => void
): (() => void) => {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
};

/**
 * Check if we have internet access (not just connection to router)
 */
export const checkInternetAccess = async (): Promise<boolean> => {
  try {
    // Simple fetch to a reliable endpoint
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Comprehensive connectivity check
 */
export const checkComprehensiveConnectivity = async (): Promise<{
  isConnected: boolean;
  hasInternet: boolean;
  connectionType: string;
}> => {
  try {
    const state = await NetInfo.fetch();
    const hasInternet = await checkInternetAccess();
    
    return {
      isConnected: state.isConnected ?? false,
      hasInternet,
      connectionType: state.type || 'unknown',
    };
  } catch (error) {
    return {
      isConnected: false,
      hasInternet: false,
      connectionType: 'unknown',
    };
  }
};