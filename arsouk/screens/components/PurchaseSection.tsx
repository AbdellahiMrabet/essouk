// screens/components/PurchaseSection.tsx - Fixed PDF Sharing
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  Platform
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Product } from '../../products/types';
import { contactService } from '../../services/contactService';
import { userService } from '../../services/userService';

interface PurchaseSectionProps {
  quantity: number;
  price: number;
  onIncreaseQuantity: () => void;
  onDecreaseQuantity: () => void;
  onBuyProduct: () => Promise<void> | void;
  product: Product;
  sellerLoading?: boolean;
}

const PurchaseSection: React.FC<PurchaseSectionProps> = ({
  quantity,
  price,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onBuyProduct,
  product,
  sellerLoading = false
}) => {
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  
  const totalPrice = price * quantity;
  const vatRate = 0.16;
  const vatAmount = totalPrice * vatRate;
  const finalTotal = totalPrice + vatAmount;

  const handleQuickContact = () => {
    if (!product.owner) return;
    contactService.showUserContactOptions(product.owner, product.name);
  };

  const canContactSeller = product.owner && userService.canContactUser(product.owner);

  // Generate invoice text
  const generateInvoiceText = () => {
    const invoiceDate = new Date().toLocaleDateString('fr-FR');
    const invoiceTime = new Date().toLocaleTimeString('fr-FR');
    const invoiceNumber = `FAC-${Date.now()}`;

    return `
🏪 فاتورة تجارية - الجمهورية الإسلامية الموريتانية
══════════════════════════════════════════════════════════
رقم الفاتورة: ${invoiceNumber}
التاريخ: ${invoiceDate}
الوقت: ${invoiceTime}

معلومات المنتج / الخدمة
───────────────────────────
المنتج / الخدمة: ${product.name}
الفئة: ${product.category}
سعر الفرد: ${price.toFixed(2)} MRO
الكمية: ${quantity}

تفاصيل الدفع
───────────────────
المجموع الجزئي: ${totalPrice.toFixed(2)} MRO
ضريبة القيمة المضافة (16%): ${vatAmount.toFixed(2)} MRO
المبلغ الإجمالي: ${finalTotal.toFixed(2)} MRO

معلومات البائع
───────────────────────
البائع: ${product.owner?.username || 'N/A'}
${product.owner?.email ? `الإيميل: ${product.owner.email}` : ''}
${product.owner?.phone ? `الهاتف: ${product.owner.phone}` : ''}

شكرا على ثقتكم ! 🎉
    `.trim();
  };

  // Generate HTML for printing
  const generateInvoiceHTML = () => {
    const invoiceDate = new Date().toLocaleDateString('fr-FR');
    const invoiceTime = new Date().toLocaleTimeString('fr-FR');
    const invoiceNumber = `FAC-${Date.now()}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة - ${product.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #00843D;
            padding-bottom: 20px;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #00843D 0%, #FFC400 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
        }
        .section {
            margin-bottom: 25px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            background-color: #f9f9f9;
        }
        .section-title {
            background-color: #00843D;
            color: white;
            padding: 10px;
            font-weight: bold;
            border-radius: 5px;
            margin: -15px -15px 15px -15px;
            text-align: center;
        }
        .price-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .price-table th {
            background-color: #FFC400;
            color: #333;
            padding: 10px;
            text-align: right;
            border: 1px solid #ddd;
        }
        .price-table td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: right;
        }
        .price-table .total-row {
            font-weight: bold;
            border-top: 2px solid #00843D;
            background-color: #e8f5e8;
        }
        .total-amount {
            font-size: 1.3em;
            color: #00843D;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #00843D;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        .contact-info {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            border-right: 4px solid #00843D;
        }
        .legal-notice {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            border: 1px solid #ffeaa7;
            font-size: 0.85em;
        }
        .mauritania-flag {
            color: #00843D;
            font-weight: bold;
        }
        .vat-info {
            background-color: #d1ecf1;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            border-right: 4px solid #17a2b8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏪 فاتورة تجارية</h1>
        <p><strong>رقم الفاتورة:</strong> ${invoiceNumber}</p>
        <p><strong>بتاريخ:</strong> ${invoiceDate} ${invoiceTime}</p>
    </div>

    <div class="section">
        <div class="section-title">معلومات المنتج /  الخدمة</div>
        <p><strong>المنتج / الخدمة:</strong> ${product.name}</p>
        <p><strong>الفئة:</strong> ${product.category}</p>
        <p><strong>سعر الفرد:</strong> ${price.toFixed(2)} MRO</p>
        <p><strong>الكمية:</strong> ${quantity}</p>
    </div>
        <table class="price-table">
            <tr>
                <th>التوصيف</th>
                <th>المبلغ (MRO)</th>
            </tr>
            <tr>
                <td>المجموع صافي الضريبة</td>
                <td>${totalPrice.toFixed(2)}</td>
            </tr>
            <tr>
                <td>ضريبة القيمة المضافة (16%)</td>
                <td>${vatAmount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
                <td><strong>المبلغ الإجمالي شامل الضريبة</strong></td>
                <td class="total-amount">${finalTotal.toFixed(2)} MRO</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">معلومات البائع</div>
        <div class="contact-info">
            <p><strong>اسم البائع:</strong> ${product.owner?.username || 'N/A'}</p>
            ${product.owner?.email ? `<p><strong>الإيميل:</strong> ${product.owner.email}</p>` : ''}
            ${product.owner?.phone ? `<p><strong>الهاتف:</strong> ${product.owner.phone}</p>` : ''}
        </div>
    </div>

    <div class="footer">
        <p><strong>شكرا على ثقتكم !</strong> 🎉</p>
        <p><small>تاريخ الطباعة ${invoiceDate} ${invoiceTime}</small></p>
    </div>
</body>
</html>
    `;
  };

  // Share text invoice
  const shareInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      const invoiceText = generateInvoiceText();
      
      await Share.share({
        title: `Facture - ${product.name}`,
        message: invoiceText,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Échec du partage de la facture.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Generate PDF and return URI
  const generatePDF = async (): Promise<string> => {
    try {
      const html = generateInvoiceHTML();
      
      const { uri } = await Print.printToFileAsync({
        html,
      });
      
      return uri;
    } catch (error) {
      return Promise.toString();
    }
  };

  // Share PDF using expo-sharing
  const sharePDF = async (uri: string) => {
    try {
      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (!isSharingAvailable) {
        Alert.alert(
          'Partage non disponible',
          'La fonction de partage n\'est pas disponible sur cet appareil. Vous pouvez sauvegarder le PDF.',
          [
            
          ]
        );
        return;
      }

      // Share the PDF file
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Facture - ${product.name}`,
        UTI: 'com.adobe.pdf'
      });
      
    } catch (error) {
      console.error('PDF sharing error:', error);
      Alert.alert(
        'Erreur de partage',
        'Impossible de partager le PDF. Essayez de sauvegarder ou d\'imprimer.',
        [
          { text: 'Imprimer', onPress: () => printExistingPDF(uri) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  };

  // Print existing PDF
  const printExistingPDF = async (uri: string) => {
    try {
      setPrintingInvoice(true);
      await Print.printAsync({
        uri,
        orientation: 'portrait',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'impression.');
    } finally {
      setPrintingInvoice(false);
    }
  };

  // Print invoice and show PDF popup
  const printInvoice = async () => {
    try {
      setPrintingInvoice(true);
      
      const uri = await generatePDF();
      
      // Print the generated PDF
      await Print.printAsync({
        uri,
        orientation: 'portrait',
      });
      
      // Show PDF popup after printing
      showPDFPopup(uri);
      
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert(
        'Erreur d\'impression', 
        'Échec de l\'impression. Génération du PDF...',
        [
          { 
            text: 'Générer PDF', 
            onPress: async () => {
              try {
                const uri = await generatePDF();
                showPDFPopup(uri);
              } catch (pdfError) {
                Alert.alert('Erreur', 'Échec de la génération du PDF.');
              }
            }
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } finally {
      setPrintingInvoice(false);
    }
  };

  // Show PDF popup with options
  const showPDFPopup = (uri: string) => {
    Alert.alert(
      '📄 فاتورة بصيغة PDF',
      'اختر إجراءً:',
      [
        { 
          text: 'مشاركة ملف PDF', 
          onPress: () => sharePDF(uri)
        },
        { 
          text: 'طباعة ملف PDF', 
          onPress: () => printExistingPDF(uri)
        },
        { 
          text: 'إغلاق', 
          style: 'cancel'
        }
      ]
    );
  };

  // Generate PDF and show popup
  const generateAndShowPDF = async () => {
    try {
      setPrintingInvoice(true);
      const uri = await generatePDF();
      showPDFPopup(uri);
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la génération du PDF. Veuillez réessayer.');
    } finally {
      setPrintingInvoice(false);
    }
  };

  // Show invoice preview with multiple options
  const showInvoicePreview = () => {
    Alert.alert(
      '🎉 Achat Réussi!', 
      generateInvoiceText(), 
      [
        { text: 'OK', style: 'default' },
        { text: 'Partager Facture', onPress: shareInvoice },
        { text: 'Imprimer + PDF', onPress: printInvoice },
        { text: 'Générer PDF', onPress: generateAndShowPDF }
      ]
    );
  };

  // Show invoice options for pre-purchase
  const showInvoiceOptions = () => {
    Alert.alert(
      '📄 خيارات طباعة الفاتورة',
      'اختر طريقة تلقي الفاتورة:',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'معاينة النص', onPress: () => Alert.alert('معاينة الفاتورة', generateInvoiceText()) },
        { text: 'طباعة + PDF', onPress: printInvoice },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>شراء هذا / ه المنتج / الخدمة</Text>
      
      {sellerLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#00843D" />
          <Text style={styles.loadingText}>تحميل معلومات البائع...</Text>
        </View>
      )}
      
      {/* Quantity Section */}
      <View style={[styles.quantitySection, sellerLoading && styles.sectionDisabled]}>
        <Text style={styles.quantityLabel}>الكمية:</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            style={[styles.quantityButton, (sellerLoading || processingPurchase) && styles.buttonDisabled]}
            onPress={onDecreaseQuantity}
            disabled={sellerLoading || processingPurchase}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityDisplay}>{quantity}</Text>
          <TouchableOpacity 
            style={[styles.quantityButton, (sellerLoading || processingPurchase) && styles.buttonDisabled]}
            onPress={onIncreaseQuantity}
            disabled={sellerLoading || processingPurchase}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Price Breakdown */}
      <View style={styles.priceBreakdown}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>سعر الفرد:</Text>
          <Text style={styles.priceValue}>{price.toFixed(2)} MRO</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>المجموع الحزئي صافي الضريبة:</Text>
          <Text style={styles.priceValue}>{totalPrice.toFixed(2)} MRO</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>ضريبة القيمة المضافة (16%):</Text>
          <Text style={styles.priceValue}>{vatAmount.toFixed(2)} MRO</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>المبلغ الكلي شامل الضريبة:</Text>
          <Text style={styles.totalPrice}>{finalTotal.toFixed(2)} MRO</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>

        <View style={styles.invoiceButtonsRow}>
          <TouchableOpacity 
            style={[styles.secondaryButton, styles.invoiceButton, styles.invoiceButtonThird]}
            onPress={showInvoiceOptions}
            disabled={printingInvoice || processingPurchase}
          >
            <Text style={styles.invoiceButtonText}>
              📄 خيارات متقدمة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, styles.printButton, styles.invoiceButtonThird]}
            onPress={printInvoice}
            disabled={printingInvoice || processingPurchase}
          >
            {printingInvoice ? (
              <ActivityIndicator size="small" color="#00843D" />
            ) : (
              <Text style={styles.printButtonText}>🖨️ طباعة</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, styles.pdfButton, styles.invoiceButtonThird]}
            onPress={generateAndShowPDF}
            disabled={printingInvoice || processingPurchase}
          >
            {printingInvoice ? (
              <ActivityIndicator size="small" color="#FFC400" />
            ) : (
              <Text style={styles.pdfButtonText}>📋 PDF</Text>
            )}
          </TouchableOpacity>
        </View>

        {canContactSeller && (
          <TouchableOpacity 
            style={[styles.secondaryButton, styles.contactButton]}
            onPress={handleQuickContact}
            disabled={processingPurchase}
          >
            <Text style={styles.contactButtonText}>💬 تواصل مع البائع</Text>
          </TouchableOpacity>
        )}
      </View>

    </ScrollView>
  );
};

// ... styles remain the same as previous version ...
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00843D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  priceBreakdown: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00843D',
  },
  paymentNotice: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  paymentNoticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  paymentNoticeText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 10,
  },
  invoiceButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  buyButton: {
    backgroundColor: '#00843D',
  },
  invoiceButton: {
    borderColor: '#00843D',
    backgroundColor: '#ffffff',
  },
  invoiceButtonThird: {
    flex: 1,
  },
  printButton: {
    borderColor: '#00843D',
    backgroundColor: '#ffffff',
  },
  pdfButton: {
    borderColor: '#FFC400',
    backgroundColor: '#ffffff',
  },
  contactButton: {
    borderColor: '#17a2b8',
    backgroundColor: '#ffffff',
  },
  buyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  invoiceButtonText: {
    color: '#00843D',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  printButtonText: {
    color: '#00843D',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pdfButtonText: {
    color: '#FFC400',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  contactButtonText: {
    color: '#17a2b8',
    fontSize: 14,
    fontWeight: '600',
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  infoItem: {
    alignItems: 'center',
    gap: 4,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6c757d',
  },
  sectionDisabled: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default PurchaseSection;