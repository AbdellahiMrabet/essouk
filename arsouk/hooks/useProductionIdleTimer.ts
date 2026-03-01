// hooks/useProductionIdleTimer.ts - SIMPLE BUT WORKS
import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, BackHandler } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export const useProductionIdleTimer = () => {
    const { onLogout, authState } = useAuth();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        if (!authState?.authenticated) return;
        
        clearTimer();
        
        timerRef.current = setTimeout(() => {
            if (authState?.authenticated) {
                Alert.alert(
                    'انتهت الجلسة',
                    'لقد تم تسجيل خروجك لأسباب أمنية بسبب عدم النشاط.',
                    [
                        {
                            text: 'تسجيل الدخول مرة أخرى',
                            onPress: onLogout
                        }
                    ],
                    { cancelable: false }
                );
            }
        }, IDLE_TIMEOUT);
    }, [authState?.authenticated, onLogout, IDLE_TIMEOUT, clearTimer]);

    // Reset on any screen focus
    useFocusEffect(
        useCallback(() => {
            startTimer();
            return () => clearTimer();
        }, [startTimer, clearTimer])
    );

    // Reset on app state change
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                startTimer();
            } else {
                clearTimer();
            }
        });

        return () => {
            subscription.remove();
            clearTimer();
        };
    }, [startTimer, clearTimer]);

    // Manual reset function
    const resetTimer = useCallback(() => {
        startTimer();
    }, [startTimer]);

    return { resetTimer };
};