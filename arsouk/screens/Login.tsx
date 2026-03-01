// Login.tsx - Corrected and enhanced version
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Alert, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';

// Separate TermsModal component
const TermsModal = ({ visible, onClose, onAgree, terms, title }: any) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalText}>
              {terms || 'جاري تحميل المحتوى...'}
            </Text>
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>إغلاق</Text>
            </TouchableOpacity>
            {onAgree && (
              <TouchableOpacity 
                style={[styles.modalButton, styles.agreeButton]} 
                onPress={onAgree}
              >
                <Text style={styles.modalButtonText}>موافق</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whats, setWhats] = useState('');
  const [signup, setSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [terms, setTerms] = useState<string>('جاري تحميل الشروط والأحكام...');
  const [privacy, setPrivacy] = useState<string>('جاري تحميل سياسة الخصوصية...');

  const { onLogin, onRegister } = useAuth();

  // Password strength calculator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: '', color: '#6c757d', width: '0%' };
    if (password.length < 6) return { strength: 'ضعيفة', color: '#dc3545', width: '33%' };
    
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

    if (score <= 2) return { strength: 'ضعيفة', color: '#dc3545', width: '33%' };
    if (score <= 4) return { strength: 'قوية', color: '#ffc107', width: '66%' };
    return { strength: 'قوية جدا', color: '#28a745', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('خطأ', 'يرجى ملء كل الحقول الإجبارية');
      return false;
    }

    if (signup) {
      if (password.length < 6) {
        Alert.alert('خطأ', 'كلمة المرور يجب أن لا تقل عن 6 أحرف');
        return false;
      }
      if (!agreeToTerms) {
        Alert.alert('خطأ', 'يجب الموافقة على الشروط والسياسات');
        return false;
      }
    }

    return true;
  };

  const login = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await onLogin!(username.trim(), password);
      if (result && result.error) {
        Alert.alert('فشل تسجيل الدخول', result.msg);
      }
    } catch (error) {
      Alert.alert('خطأ', 'خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    console.log('Registering user with:', { username, password, email, phone, whats });
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await onRegister!(username.trim(), password, email, phone, whats, 2);
      if (result && result.error) {
        Alert.alert('خطأ', result.msg);
      } else {
        // Auto-login after successful registration
        await login();
      }
    } catch (error) {
      Alert.alert('خطأ', 'خطأ غير متوقع أثناء إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');
    setWhats('');
    setShowPassword(false);
    setAgreeToTerms(false);
  };

  const toggleSignup = () => {
    setSignup(!signup);
    resetForm();
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleTermsPress = async () => {
    try {
      setShowTermsModal(true);
      const response = await fetch(`${API_BASE_URL}/terms`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setTerms(result.terms_of_service || result.message || 'شروط الاستخدام غير متوفرة حالياً.');
    } catch (error) {
      console.error('Error fetching terms:', error);
      setTerms('عذراً، لا يمكن تحميل الشروط والأحكام حالياً. يرجى المحاولة لاحقاً.');
    }
  };

  const handlePrivacyPress = async () => {
    try {
      setShowPrivacyModal(true);
      const response = await fetch(`${API_BASE_URL}/terms`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setPrivacy(result.privacy_policy || result.message || 'سياسة الخصوصية غير متوفرة حالياً.');
    } catch (error) {
      console.error('Error fetching privacy policy:', error);
      setPrivacy('عذراً، لا يمكن تحميل سياسة الخصوصية حالياً. يرجى المحاولة لاحقاً.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer,
            signup && styles.scrollContainerCompact
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section - More compact for signup */}
          <View style={[styles.header, signup && styles.headerCompact]}>
            <Image 
              source={require('./../constants/souk.jpg')}
              style={[styles.image, signup && styles.imageCompact]} 
            />
            <Text style={[styles.title, signup && styles.titleCompact]}>
              {signup ? 'إنشاء حساب' : 'تفضل بـ:'}
            </Text>
            <Text style={[styles.subtitle, signup && styles.subtitleCompact]}>
              {signup ? 'انضم لنا الآن' : 'تسجيل الدخول إلى حسابك'}
            </Text>
          </View>

          {/* Form Section - More compact for signup */}
          <View style={[styles.form, signup && styles.formCompact]}>
            <TextInput 
              style={[styles.input, signup && styles.inputCompact]} 
              placeholder="اسم المستخدم" 
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setUsername}
              value={username}
              editable={!loading}
            />
            
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.passwordInput, signup && styles.inputCompact]} 
                placeholder="كلمة المرور" 
                placeholderTextColor="#999"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                value={password}
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

            {/* Password Strength Indicator - Only show for signup */}
            {signup && password.length > 0 && (
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

            {signup && (
              <>
                <TextInput 
                  style={[styles.input, styles.inputCompact]} 
                  placeholder="الإيميل" 
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  value={email}
                  editable={!loading}
                />
                
                <TextInput 
                  style={[styles.input, styles.inputCompact]} 
                  placeholder="رقم الهاتف" 
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  onChangeText={setPhone}
                  value={phone}
                  editable={!loading}
                />
                
                <TextInput 
                  style={[styles.input, styles.inputCompact]} 
                  placeholder="رقم الواتساب (للتواصل مع الزبناء)" 
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  onChangeText={setWhats}
                  value={whats}
                  editable={!loading}
                />

                {/* Terms Agreement Section */}
                <View style={styles.termsAgreementContainer}>
                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setAgreeToTerms(!agreeToTerms)}
                  >
                    <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                      {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      أوافق على الشروط والسياسات
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.termsLinksContainer}>
                    <TouchableOpacity onPress={handleTermsPress}>
                      <Text style={styles.termsLink}>شروط الاستخدام</Text>
                    </TouchableOpacity>
                    <Text style={styles.termsSeparator}> و </Text>
                    <TouchableOpacity onPress={handlePrivacyPress}>
                      <Text style={styles.termsLink}>سياسة الخصوصية</Text>
                    </TouchableOpacity>
                  </View>

                  {!agreeToTerms && signup && (
                    <Text style={styles.termsError}>
                      يجب الموافقة على الشروط والسياسات للمتابعة
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Action Buttons */}
            <TouchableOpacity 
              style={[
                styles.primaryButton,
                signup && styles.primaryButtonCompact,
                loading && styles.buttonDisabled,
                (signup && !agreeToTerms) && styles.buttonDisabled
              ]}
              onPress={signup ? register : login}
              disabled={loading || (signup && !agreeToTerms)}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {signup ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Section - More compact */}
            <View style={[styles.toggleSection, signup && styles.toggleSectionCompact]}>
              <Text style={styles.toggleText}>
                {signup ? 'عندك حساب؟' : "ليس لديك حساب؟"}
              </Text>
              <TouchableOpacity onPress={toggleSignup} disabled={loading}>
                <Text style={styles.toggleLink}>
                  {signup ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms Modals */}
          <TermsModal
            visible={showTermsModal}
            onClose={() => setShowTermsModal(false)}
            terms={terms}
            title="شروط الاستخدام"
          />

          <TermsModal
            visible={showPrivacyModal}
            onClose={() => setShowPrivacyModal(false)}
            terms={privacy}
            title="سياسة الخصوصية"
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Login;

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
  scrollContainerCompact: {
    paddingVertical: 20,
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerCompact: {
    marginBottom: 20,
  },
  image: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
    borderRadius: 60,
  },
  imageCompact: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  formCompact: {
    gap: 12,
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
  inputCompact: {
    height: 44,
    fontSize: 15,
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
    top: 13,
    padding: 4,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
    marginBottom: 4,
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
  termsAgreementContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  termsLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  termsLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  termsSeparator: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 4,
  },
  termsError: {
    color: '#dc3545',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
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
  primaryButtonCompact: {
    height: 44,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  toggleSectionCompact: {
    marginTop: 16,
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
  },
  toggleLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6c757d',
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  agreeButton: {
    backgroundColor: '#007bff',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});