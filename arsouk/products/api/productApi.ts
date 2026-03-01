// api/productApi.ts
import { Product, Seller, FormData as myForm } from '../types';
import { API_BASE_URL } from '../../constants/api';
import { Alert } from 'react-native';

export const productApi = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product by ID with user/seller data
  async getProductById(id: number): Promise<Product> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.product || data;
    } catch (error) {
      console.log('Error fetching product:', error);
      throw new Error('Failed to fetch product');
    }
  },

  // Get users/sellers
  async getUsers(): Promise<Seller[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sellers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.users || data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  },

  async getSeller(owner: number | null | undefined): Promise<Seller> {
    try {
      if (!owner) throw new Error('Owner ID is required');
      const response = await fetch(`${API_BASE_URL}/sellers/${owner}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching sellers:', error);
      throw error;
    }
  },

  async createProduct(productData: myForm, token: string): Promise<Product> {
    try {
      const formData = new FormData();
      
      // Append basic fields
      formData.append('name', productData.name);
      formData.append('price', productData.price);
      formData.append('description', productData.description);
      formData.append('category', productData.category);
      
      // Append image if exists
      if (productData.image && productData.image.uri) {
        // Create file object for the image
        const imageUri = productData.image.uri;
        const imageName = imageUri.split('/').pop() || 'image.jpg';
        const imageType = 'image/jpeg'; // You might want to detect this dynamically
        
        formData.append('file', {
          uri: imageUri,
          type: imageType,
          name: imageName,
        } as any);
      } else if (productData.image_url) {
        // If we have image_url but no file, just append the URL
        formData.append('image_url', productData.image_url);
      }

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Let the browser set the Content-Type with boundary for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        console.log('Server error response:', response.status);
        const errorData = await response.json();
        if (errorData.user_inactive)
        Alert.alert('حساب غير مفعل', errorData.user_inactive ||
       'حدث خطأ أثناء إضافة المنتج. حاول مرة أخرى.');
        
        throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }
      else

      return await response.json();
    } catch (error) {
      console.log('Error creating product:', error || error);
      throw error;
    }
  },

  async updateProduct(id: number, productData: myForm, token: string): Promise<Product> {
    try {
      // Check if we need to use FormData (if there's an image)
      if (productData.image && productData.image.uri) {
        const formData = new FormData();
        
        formData.append('name', productData.name);
        formData.append('price', productData.price);
        formData.append('description', productData.description);
        formData.append('category', productData.category);
        
        const imageUri = productData.image.uri;
        const imageName = imageUri.split('/').pop() || 'image.jpg';
        const imageType = 'image/jpeg';
        
        formData.append('file', {
          uri: imageUri,
          type: imageType,
          name: imageName,
        } as any);

        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } else {
        // No image, use JSON
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: productData.category,
            image_url: productData.image_url,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          console.log(errorData)
          Alert.alert('غير مصرح لك بالتعديل', errorData.error)
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      console.log('خطأ في تعديل المنتج / الخدمة:', error);
      throw error;
    }
  },

  async deleteProduct(id: number, token: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        
      }
      Alert.alert('تم الحذف', 'تم حذف المنتج بنجاح.');
    } catch (error) {
      console.log('خطأ في حذف المنتج:', error);
      const message = (error as any)?.message || String(error) || 'لا يمكن حذف المنتج حالياً.';
      Alert.alert('خطأ', message);
    }
  },
};