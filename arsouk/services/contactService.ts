// services/contactService.ts - Improved WhatsApp detection
import { Linking, Platform, Alert } from 'react-native';
import { Seller } from '../products/types';

export interface ContactOptions {
  phone?: string;
  email?: string;
  whatsapp?: string;
  sellerName?: string;
  productName?: string;
}

class ContactService {
  // WhatsApp URL schemes for different detection methods
  private readonly WHATSAPP_SCHEMES = [
    'whatsapp://send', // Primary scheme
    'whatsapp://app',  // Alternative scheme
    'whatsapp://',     // Basic scheme
  ];

  // Make phone call
  async makePhoneCall(phoneNumber: string): Promise<void> {
    try {
      const url = `tel:${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('غير مدعوم', 'حالة الاتصال غير مدعومة على هذا الجهاز');
      }
    } catch (error) {
      console.log('Error making phone call:', error);
      Alert.alert('خطأ', 'لا يمكن الاتصال بالبائع حاول مرة أخرى.');
    }
  }

  // Send email
  async sendEmail(email: string, subject?: string, body?: string): Promise<void> {
    try {
      let url = `mailto:${email}`;
      const params: string[] = [];
      
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'الإيميل غير مدعوم',
          '.',
          [{ text: 'تم', style: 'cancel' }]
        );
      }
    } catch (error) {
      console.log('Error sending email:', error);
      Alert.alert('خطأ', 'لم يتم الإرسال حاول مرة أخرى.');
    }
  }

  // Improved WhatsApp detection and sending
  async sendWhatsApp(phoneNumber: string, message?: string): Promise<void> {
    try {
      // Remove any non-digit characters from phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Format phone number for WhatsApp (remove leading zeros, add country code if missing)
      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }
      
      // Create WhatsApp URL
      let url = `https://wa.me/${formattedPhone}`;
      if (message) {
        url += `?text=${encodeURIComponent(message)}`;
      }

      // Try multiple methods to open WhatsApp
      const whatsappInstalled = await this.isWhatsAppInstalled();
      
      if (whatsappInstalled) {
        console.log('WhatsApp detected, opening:', url);
        await Linking.openURL(url);
      } else {
        // If WhatsApp is not detected but user insists it's installed, try direct opening
        console.log('WhatsApp not detected, trying direct open');
        try {
          await Linking.openURL(url);
        } catch (openError) {
          console.log('Direct open failed, showing installation options');
          this.showWhatsAppInstallationOptions(cleanPhone, message);
        }
      }
    } catch (error) {
      console.log('Error sending WhatsApp message:', error);
      // Even if detection fails, try to open WhatsApp directly
      try {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        let url = `https://wa.me/${cleanPhone}`;
        if (message) {
          url += `?text=${encodeURIComponent(message)}`;
        }
        await Linking.openURL(url);
      } catch (fallbackError) {
        this.showWhatsAppInstallationOptions(phoneNumber, message);
      }
    }
  }

  // Improved WhatsApp installation check with multiple schemes
  async isWhatsAppInstalled(): Promise<boolean> {
    try {
      // Try multiple WhatsApp URL schemes
      for (const scheme of this.WHATSAPP_SCHEMES) {
        try {
          const supported = await Linking.canOpenURL(scheme);
          if (supported) {
            console.log(`WhatsApp detected with scheme: ${scheme}`);
            return true;
          }
        } catch (schemeError) {
          console.log(`Scheme ${scheme} failed:`, schemeError);
          continue;
        }
      }
      
      // Also try the web version
      try {
        const webSupported = await Linking.canOpenURL('https://wa.me/');
        if (webSupported) {
          console.log('WhatsApp web detected');
          return true;
        }
      } catch (webError) {
        console.log('Web detection failed:', webError);
      }
      
      console.log('WhatsApp not detected with any scheme');
      return false;
    } catch (error) {
      console.log('Error checking WhatsApp installation:', error);
      return false;
    }
  }

  // Show WhatsApp installation options
  private showWhatsAppInstallationOptions(phoneNumber: string, message?: string): void {
    Alert.alert(
      'واتساب غير متوفر',
      'لا يمكن فتح واتساب. جرخيارات أخرى:',
      [
        {
          text: 'حرب على كل حال',
          onPress: () => {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            let url = `https://wa.me/${cleanPhone}`;
            if (message) {
              url += `?text=${encodeURIComponent(message)}`;
            }
            Linking.openURL(url).catch(() => {
              Alert.alert('خطأ', 'لا يمكن فتح واتساب تحقق أنه مثبت على جهازك.');
            });
          }
        },
        {
          text: 'تثبيت واتساب',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('https://apps.apple.com/app/whatsapp-messenger/id310633997');
            } else {
              Linking.openURL('https://play.google.com/store/apps/details?id=com.whatsapp');
            }
          }
        },
        {
          text: 'أرسل SMS بدلاً من ذلك',
          onPress: () => {
            this.sendSMS(phoneNumber, message);
          }
        },
        { text: 'إلغاء', style: 'cancel' }
      ]
    );
  }

  // Send SMS (alternative)
  async sendSMS(phoneNumber: string, message?: string): Promise<void> {
    try {
      let url = `sms:${phoneNumber}`;
      if (message) {
        url += `?body=${encodeURIComponent(message)}`;
      }
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'SMS غير متوفر',
          'SMS غير مدعوم على هذا الجهاز.',
          [{ text: 'تم', style: 'default' }]
        );
      }
    } catch (error) {
      console.log('خطأ في إرسال SMS:', error);
      Alert.alert('خطأ', 'لم يتم إرسال SMS. حاول مرة أخرى.');
    }
  }

  // Show contact options for a user/seller
  showUserContactOptions(user: Seller, productName?: string, p0?: string): void {
    const contactInfo: ContactOptions = {
      phone: user.phone || undefined,
      email: user.email || undefined,
      whatsapp: user.whats || undefined,
      sellerName: user.username,
      productName: productName,
    };

    this.showContactOptions(contactInfo);
  }

  // Show contact options with improved WhatsApp handling
  showContactOptions(options: ContactOptions): void {
    console.log('Contact options:', options);
    
    const actions: any[] = [];

    // Phone call option
    if (options.phone) {
      actions.push({
        text: `📞 الهاتف ${options.phone}`,
        onPress: () => this.makePhoneCall(options.phone!),
      });
    } else {
      actions.push({
        text: '📞 الهاتف (غير متوفر)',
        style: 'destructive',
        onPress: () => Alert.alert('غير متوفر', 'البائع لم يزودنا برقم هاتف'),
      });
    }

    // WhatsApp option - always show if number is available
    if (options.whatsapp) {
      const message = this.generateWhatsAppMessage(options.sellerName, options.productName);
      
      actions.push({
        text: `💬 واتساب ${options.whatsapp}`,
        onPress: () => this.sendWhatsApp(options.whatsapp!, message),
      });
    } else {
      actions.push({
        text: '💬 واتساب (غير متوفر)',
        style: 'destructive',
        onPress: () => Alert.alert('غير متوفر', 'البائع لم يزودنا برقم واتساب'),
      });
    }

    // Email option
    if (options.email) {
      const { subject, body } = this.generateEmailContent(options.sellerName, options.productName);
      
      actions.push({
        text: `📧 الإيميل ${options.email}`,
        onPress: () => this.sendEmail(options.email!, subject, body),
      });
    } else {
      actions.push({
        text: '📧 الإيميل (غير متوفر)',
        style: 'destructive',
        onPress: () => Alert.alert('غير متوفر', 'البائع لم يزودنا بعنوان إيميله'),
      });
    }

    // SMS option (always available if phone exists)
    if (options.phone) {
      const smsMessage = this.generateSMSMessage(options.sellerName, options.productName);
      
      actions.push({
        text: `💬 SMS ${options.phone}`,
        onPress: () => this.sendSMS(options.phone!, smsMessage),
      });
    }

    actions.push({
      text: 'إلغاء',
      style: 'cancel',
    });

    Alert.alert(
      'تواصل مع البائع',
      `اختر طريقة التواصل مع البائع ${options.sellerName || 'the seller'}`,
      actions,
      { cancelable: true }
    );
  }

  // Generate default WhatsApp message
  private generateWhatsAppMessage(sellerName?: string, productName?: string): string {
    let message = `مرحبا${sellerName ? ` ${sellerName}` : ''}!`;
    
    if (productName) {
      message += ` أنا مهتم بالمنتج / الخدمة المعروض على تطبيق السوق "${productName}".`;
    } else {
      message += ` أنا مهتم بمنتجاتكم / خدماتكم المعروضة على تطبيق السوق.`;
    }
    
    message += ` أريد معلومات أكثر عن توفرها وأسعارها. شكرا.`;
    
    return message;
  }

  // Generate default SMS message
  private generateSMSMessage(sellerName?: string, productName?: string): string {
    let message = `مرحبا${sellerName ? ` ${sellerName}` : ''}!`;
    
    if (productName) {
      message += ` أنا مهتم بالمنتج / الخدمة المعروض/ة على تطبيق السوق "${productName}".`;
    } else {
      message += ` أنا مهتم بمنتجاتكم / خدماتكم المعروضة على تطبيق السوق.`;
    }
    
    message += ` شكرا للتواصل معي.`;
    
    return message;
  }

  // Generate default email content
  private generateEmailContent(sellerName?: string, productName?: string): { subject: string; body: string } {
    const subject = productName 
      ? `طلب المنتج / الخدمة ${productName}`
      : 'طلب معلومات عن المنتجات / الخدمات';
    
    const body = `مرحبا${sellerName ? ` ${sellerName}` : ''},

أنا مهتم بالمنتج / الخدمة المعروض/ة على تطبيق السوق${productName ? ` "${productName}"` : ''}.
 أرجو تزويدي بالمزيد من المعلومات حول:

- التوفر
- السعر
- إذا كان هناك أي عروض خاصة أو خصومات متاحة.

شكرا!

أفضل التحيات,
[اسمك هنا]`;

    return { subject, body };
  }

  // Direct method to open WhatsApp without detection (for when detection fails)
  async openWhatsAppDirectly(phoneNumber: string, message?: string): Promise<void> {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      let url = `https://wa.me/${cleanPhone}`;
      if (message) {
        url += `?text=${encodeURIComponent(message)}`;
      }
      
      console.log('Opening WhatsApp directly:', url);
      await Linking.openURL(url);
    } catch (error) {
      console.log('Error opening WhatsApp directly:', error);
      Alert.alert('خطأ', 'لا يمكن فتح واتساب. تأكد أنه مثبت على جهازك وحاول مرة أخرى.');
    }
  }
}

export const contactService = new ContactService();