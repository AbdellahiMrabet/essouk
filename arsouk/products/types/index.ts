// types/index.ts
import { ImagePickerResult, ImagePickerAsset, ImagePickerOptions } from 'expo-image-picker';

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  verified?: number;
  owner_id: number | null;
  owner?: Seller | null;
}

export interface Seller {
  id: number;
  username: string;
  email: string;
  phone?: string;
  whats?: string;
  usertype_id: number;
  products?: Product[];
}

export interface FormData {
  name: string;
  price: string;
  description: string;
  category: string;
  image_url?: string;
  image?: ImagePickerAsset; // Updated to Expo type
  owner_id: number | null;
}

// Alias Expo types to your original interface names for compatibility
export type Asset = ImagePickerAsset;
export type ImagePickerResponse = ImagePickerResult;
export type CustomImagePickerOptions = ImagePickerOptions;