// screens/ForgotPassword.tsx - WITH MAILTO INTEGRATION
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from "../constants/api";

// Backend API service
const authService = {
  // Send reset code to backend
  async getResetToken(email: string): Promise<{ success: boolean; message: string; reset_token?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: data.message || 'تم إرسال رمز إعادة التعيين',
          reset_token: data.reset_token
        };
      } else {
        return { 
          success: false, 
          message: data.message || 'لا يمكن إرسال رمز إعادة التعيين' 
        };
      }
    } catch (error) {
      console.log('خطأ في إرسال الرمز:', error);
      return { 
        success: false, 
        message: 'خطأ في الشبكة.تحقق من اتصال جهازك بالإنترنت.' 
      };
    }
  },

  // Get mailto link for manual email sending
  async saveResetCode(email: string, code: string): Promise<{ success: boolean; message: string; mailto_url?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/save-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: data.message || 'Email link generated',
        };
      } else {
        return { 
          success: false, 
          message: data.message || 'Failed to generate email link' 
        };
      }
    } catch (error) {
      console.error('Get email link error:', error);
      return { 
        success: false, 
        message: 'Network error. Please check your connection.' 
      };
    }
  },

  // Reset password with backend
  async resetPassword(
    email: string, 
    code: string, 
    newPassword: string, 
    resetToken: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resetToken}`
        },
        body: JSON.stringify({ 
          email, 
          code,
          new_password: newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: data.message || 'تم تعيين كلمة المرور بنجاح' 
        };
      } else {
        if (response.status === 401) {
          return { 
            success: false, 
            message: 'انتهت صلاحية الجلسة. الرجاء إعادة طلب رمز التحقق من جديد.' 
          };
        } else if (response.status === 400) {
          return { 
            success: false, 
            message: data.message || 'رمز غير صحيح أو منتهي الصلاحية' 
          };
        } else {
          return { 
            success: false, 
            message: data.message || 'لا يمكن إعادة تعيين كلمة المرور' 
          };
        }
      }
    } catch (error) {
      console.log('خطأ في إعادة تعيين كلمة المرور:', error);
      return { 
        success: false, 
        message: 'خطأ في الشبكة. تحقق من اتصال جهازك بالإنترنت.' 
      };
    }
  },
};

const ForgotPassword = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Manual Email, 3: Code + Password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Generate a random 6-digit code for manual email
  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send reset code to backend
  const getResetToken = async (email: string) => {
    return await authService.getResetToken(email);
  };

  // Handle manual email sending
  const handleManualEmail = async () => {
    const manualCode = generateRandomCode();
    setGeneratedCode(manualCode);
    
    const result = await authService.saveResetCode(email, manualCode);
    if (result.success) {
        setStep(3);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  // Reset password with backend
  const resetPassword = async (email: string, code: string, newPassword: string) => {
    if (!resetToken && step !== 3) {
      return { success: false, message: 'معلومات التعريف مطلوبة.حاول مرة أخرى.' };
    }
    return await authService.resetPassword(email, code, newPassword, resetToken);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleStep2 = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await getResetToken(email);
      if (result.success) {
        if (result.reset_token) {
          setResetToken(result.reset_token);
        }
        setStep(2);
        handleManualEmail();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('خطأ', 'رمز التأكيد يجب أن يكون مكونا من 6 أرقام');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email, code, newPassword);
      if (result.success) {
        Alert.alert(
          'Success',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login' as never)
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: '', color: '#6c757d', width: '0%' };
    if (password.length < 6) return { strength: 'Weak', color: '#dc3545', width: '33%' };
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let score = 0;
    if (password.length >= 8) score++;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasNumbers) score++;
    if (hasSpecialChar) score++;

    if (score <= 2) return { strength: 'Weak', color: '#dc3545', width: '33%' };
    if (score <= 4) return { strength: 'Medium', color: '#ffc107', width: '66%' };
    return { strength: 'Strong', color: '#28a745', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>إعادة تعيين كلمة المرور</Text>
            <Text style={styles.subtitle}>
              {step === 1 && 'أدخل الإيميل المرتبط بحسابك لتتحقق من هويتك.'}
              {step === 2 && ''}
              {step === 3 && 'أدخل الرمز المرسل وكلمة المرور الجديدة.'}
            </Text>
          </View>

          {/* Step 1: Email Input */}
          {step === 1 && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="عنوان الإيميل"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
              
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleStep2}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>ok</Text>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  📧 ستتلقى رمزا من 6 أرقام لإعادة تعيين كلمة المرور إذا كان الإيميل صحيحا.
                </Text>
              </View>
            </View>
          )}


          {/* Step 3: Code + New Password */}
          {step === 3 && (
            <View style={styles.form}>
              <Text style={styles.emailDisplay}>Email: {email}</Text>
              
              <TextInput
                style={styles.input}
                placeholder="الرجاء إدخال رمز التأكيد المكون من 6 أرقام"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                editable={!loading}
              />

              {/* Show generated code for manual email */}
              {generatedCode && (
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeDisplayText}>
                    رمز التأكيد: <Text style={styles.codeValue}>{generatedCode}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="كلمة المرور الجديدة"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={toggleShowPassword}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View 
                      style={[
                        styles.passwordStrengthFill,
                        { 
                          
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.strength}
                  </Text>
                </View>
              )}

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={toggleShowConfirmPassword}
                >
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>إعادة تعيين كلمة المرور</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToLogin}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>&larr; الرجوع لصفحة تسجيل الدخول</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// ... (styles remain similar to previous versions with additions for new elements) ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emailDisplay: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 50,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    padding: 4,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 50,
    backgroundColor: '#28a745',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 30,
    padding: 12,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  infoText: {
    color: '#0066cc',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  codeDisplay: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  codeDisplayText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  codeValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ForgotPassword;