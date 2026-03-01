// App.tsx - Fixed version
import React, { useEffect } from 'react';
import { createNativeStackNavigator, NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavigationContainer } from "@react-navigation/native";
import Home from "./screens/Home";
import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import ProductList from "./products/Products";
import ProductDetail from "./screens/ProductDetail";
import ProdAdmin from './products/ProAdmin';
import { useProductionIdleTimer } from './hooks/useProductionIdleTimer';
import registerNNPushToken from 'native-notify';

// Define navigation types for better TypeScript support
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Products: undefined;
  ProductDetail: { productId: number; productName?: string };
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  registerNNPushToken(32864, 'hmq9BTrpWGueFspuzDmNvr');
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  );
}

export const Layout = () => {
  const { authState, userType } = useAuth();

  // Common header options for authenticated screens with proper typing
  const authenticatedScreenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: '#007bff',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: '600',
    },
    headerRight: () => <HeaderRight />,
  };

  // Common header options for unauthenticated screens
  const unauthenticatedScreenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: '#28a745',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: '600',
    },
  };

  // Global screen options
  const globalScreenOptions: NativeStackNavigationOptions = {
    animation: 'slide_from_right' as const,
    headerBackTitle: 'Back',
  };

  // Safe ProductDetail options function
  const getProductDetailOptions = ({ route }: any) => {
    const productName = route.params?.productName || 'تفاصيل المنتج / الخدمة';
    return {
      title: productName,
      ...authenticatedScreenOptions,
    };
  };

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={authState?.authenticated ? "Home" : "Login"}
        screenOptions={globalScreenOptions}
      >
        {authState?.authenticated ? (
          // AUTHENTICATED USER SCREENS
          <>
            {authState?.authenticated && userType === 1 ? (
              // ADMIN USER SCREENS
              <>
                <Stack.Screen
                  name="Home"
                  component={ProdAdmin}
                  options={{
                    title: 'لوحة التحكم - المنتجات',
                    ...authenticatedScreenOptions,
                  }}
                />
                <Stack.Screen
                  name="ProductDetail"
                  component={ProductDetail}
                  options={getProductDetailOptions}
                />
              </>
            ) : (
              // REGULAR USER SCREENS
              <>
                <Stack.Screen
                  name="Home"
                  component={Home}
                  options={{
                    title: 'الرئيسية',
                    ...authenticatedScreenOptions,
                  }}
                />
                <Stack.Screen
                  name="Products"
                  component={ProductList}
                  options={{
                    title: 'كل المنتجات',
                    ...authenticatedScreenOptions,
                  }}
                />
                <Stack.Screen
                  name="ProductDetail"
                  component={ProductDetail}
                  options={getProductDetailOptions}
                />
              </>
            )}
          </>
        ) : (
          // UNAUTHENTICATED USER SCREENS
          <>
            <Stack.Screen 
              name="Login" 
              component={Login} 
              options={{
                title: 'مرحبا بكم',
                headerTitleAlign: 'center',
                ...unauthenticatedScreenOptions,
                headerShown: true,
                headerRight: () => null,
              }} 
            />
            
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPassword}
              options={{
                title: 'تغيير كلمة المرور',
                headerTitleAlign: 'center',
                ...unauthenticatedScreenOptions,
                headerRight: () => null,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Separate component for the header right that uses the hook
const HeaderRight = () => {
  const { resetTimer } = useProductionIdleTimer();
  const { onLogout } = useAuth();

  return (
    <View onTouchStart={resetTimer} style={styles.headerRightContainer}>
      <TouchableOpacity 
        style={styles.signOutButton}
        onPress={onLogout}
      >
        <Text style={styles.signOutText}>خروج</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usernameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  signOutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
