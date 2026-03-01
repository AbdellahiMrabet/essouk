import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from "../constants/api";
import { Alert } from "react-native";

interface AuthProps {
    authState?: {token: string | null; authenticated: boolean | null};
    onRegister?: (username: string, password: string,
        email: string, phone: string, whats: string, type: number) => Promise<any>;
    onLogin?: (username: string, password: string) => Promise<any>;
    onLogout?: () => Promise<any>;
    userType?: number | null;
}

const TOKEN_KEY = 'auth_token'; // Fixed: Added proper token key name
const AuthContext = createContext<AuthProps>({});

export const useAuth = () => {
    return useContext(AuthContext);
}

export const AuthProvider = ({children}: any) => {
    const [authState, setAuthState] = useState<{
        token: string | null;
        authenticated: boolean | null;
    }>({
        token: null,
        authenticated: null
    });

    const [userType, setUserType] = useState<number | null>(null);

    useEffect(() => {
        const loadToken = async () => {
            try {
                const res = await SecureStore.getItemAsync(TOKEN_KEY);
                
                if (res) {
                    console.log('Token received');
                    setAuthState({
                        token: res,
                        authenticated: true
                    });
                } else {
                    console.log('No token found');
                    setAuthState({
                        token: null,
                        authenticated: false
                    });
                }
            } catch (err) {
                console.log('Error loading token:', err);
                setAuthState({
                    token: null,
                    authenticated: false
                });
            }
        };

        loadToken();
    }, []);

    const register = async (username: string, password: string,
         email: string, phone: string, whats: string, type: number) => {
        try {
            return await axios.post(`${API_BASE_URL}/register`, {
                username, password, email, phone, whats, type
            });
        } catch (e) {
            return { 
                error: true, 
                msg: (e as any).response?.data?.['message'] || 'Registration failed' 
            };
        }
    }

    const login = async (username: string, password: string) => {
    try {
        const result = await axios.post(`${API_BASE_URL}/login`, { username, password });
        if (result) {
            setUserType(result.data['usertype']);
            SecureStore.setItemAsync('user_data', result.data['usertype'].toString());
        }
        // Check if result exists and has the expected data
        if (result && result.data && result.data['access_token']) {
            Alert.alert(result.data['message']);
            
            setAuthState({
                token: result.data['access_token'],
                authenticated: true
            });

            // Save token with expo-secure-store
            await SecureStore.setItemAsync(TOKEN_KEY, result.data['access_token'], {
                keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
            });
            console.log('Token saved successfully');

            return result;
        } else {
            return { msg: 'الخادم لا يستجيب' };
        }
    } catch (e: any) {
            console.log('فشل تسجيل الدخول:', e);
            Alert.alert('فشل تسجيل الدخول', e.response?.data?.message || 'خطأ غير معروف');
            
            // Handle different types of errors
            if (e.response?.data?.message) {
                return { msg: e.response.data.message };
            } else if (e.request) {
                return { msg: 'خطأ في الشبكة - لايمكن الوصول للخادم' };
            } else {
                return { msg: 'خطأ غير معروف' };
            }
        }
    }

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            console.log('Token removed successfully');
            
            setAuthState({
                token: null,
                authenticated: false
            });
            
            return { success: true };
        } catch (e: any) {
            console.log('Logout error:', e);
            return { 
                error: true, 
                msg: e.message || 'Failed to logout properly' 
            };
        }
    }

    const value = {
        onRegister: register,
        onLogin: login,
        onLogout: logout,
        authState,
        userType
    };
    
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}