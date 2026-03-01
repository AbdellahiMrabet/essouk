// types/navigation.ts
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Products: undefined;
  ProductDetail: { productId: number; productName?: string };
  Admin: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Products: undefined;
  ProductDetail: { productId: number; productName?: string };
  Admin: undefined;
};

// types/auth.ts
export interface AuthState {
  authenticated: boolean;
  userType?: number;
  username?: string;
  isLoading?: boolean;
}

export interface UserType {
  id: number;
  name: string;
}