// services/networkService.ts
import NetInfo from '@react-native-community/netinfo';

type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  details: any;
};

class NetworkService {
  private subscribers: ((state: NetworkState) => void)[] = [];
  private currentState: NetworkState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    details: null,
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Initial state
    NetInfo.fetch().then(state => {
      this.updateState(state);
    });

    // Subscribe to changes
    NetInfo.addEventListener(state => {
      this.updateState(state);
    });
  }

  private updateState(state: any) {
    this.currentState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type || 'unknown',
      details: state.details,
    };

    // Notify subscribers
    this.subscribers.forEach(callback => callback(this.currentState));
  }

  subscribe(callback: (state: NetworkState) => void): () => void {
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this.currentState);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.updateState(state);
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Error checking connectivity:', error);
      return false;
    }
  }

  async checkInternetAccess(): Promise<boolean> {
    try {
      // Try multiple endpoints for better reliability
      const endpoints = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
        'https://connectivitycheck.gstatic.com/generate_204',
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const signal = controller.signal;
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch(endpoint, {
              method: 'HEAD',
              signal,
            });
            if (response.ok || response.status === 204) {
              return true;
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (error) {
          // Try next endpoint on error (including abort due to timeout)
          continue; // Try next endpoint
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  getCurrentState(): NetworkState {
    return { ...this.currentState };
  }
}

export const networkService = new NetworkService();