// Utility functions for handling profile images
import { API_CONFIG } from '../constants/API';

/**
 * Constructs the full URL for a profile image
 * @param imagePath - The image path from the database (e.g., '/uploads/profile-images/filename.jpg')
 * @returns The full URL for the image or null if invalid
 */
export const constructProfileImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath || typeof imagePath !== 'string') {
    return null;
  }
  
  // Trim whitespace
  const trimmedPath = imagePath.trim();
  if (!trimmedPath) {
    return null;
  }
  
  // Check for local file URIs - these should not be processed
  if (trimmedPath.startsWith('file://')) {
    console.warn('Local file URI detected (should not be processed):', trimmedPath);
    return null;
  }
  
  // If it's already a full URL, validate and return
  if (trimmedPath.startsWith('http')) {
    // Check for malformed URLs that combine network and local paths
    if (trimmedPath.includes('file://')) {
      console.warn('Malformed URL detected (contains both http and file://):', trimmedPath);
      return null;
    }
    
    try {
      new URL(trimmedPath);
      return trimmedPath;
    } catch {
      console.warn('Invalid image URL:', trimmedPath);
      return null;
    }
  }
  
  // Extract the base URL from API_CONFIG (remove /api suffix)
  const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
  
  // Ensure the path starts with /
  const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  console.log('🔍 constructProfileImageUrl - normalizedPath:', normalizedPath);
  
  // Construct full URL with the server base URL
  const fullUrl = `${baseUrl}${normalizedPath}`;
  console.log('🔍 constructProfileImageUrl - final fullUrl:', fullUrl);
  
  // Validate the constructed URL
  try {
    new URL(fullUrl);
    return fullUrl;
  } catch {
    console.warn('Invalid constructed image URL:', fullUrl);
    return null;
  }
};

/**
 * Checks if a string is a valid image URL
 * @param url - The URL to check
 * @returns True if it's a valid image URL
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a valid URL
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Safely constructs a profile image URL with fallback
 * @param imagePath - The image path from the database
 * @returns A valid image URL or null
 */
export const getSafeProfileImageUrl = (imagePath: string | null | undefined): string | null => {
  console.log('🔍 getSafeProfileImageUrl - Input imagePath:', imagePath);
  
  const url = constructProfileImageUrl(imagePath);
  console.log('🔍 getSafeProfileImageUrl - Constructed URL:', url);
  
  if (!url || !isValidImageUrl(url)) {
    console.warn('❌ getSafeProfileImageUrl - Invalid profile image URL:', imagePath);
    return null;
  }
  
  console.log('✅ getSafeProfileImageUrl - Valid URL:', url);
  return url;
};

/**
 * Test if an image URL is accessible (for debugging)
 * @param url - The image URL to test
 * @returns Promise<boolean> - True if accessible, false otherwise
 */
export const testImageUrlAccess = async (url: string): Promise<boolean> => {
  try {
    console.log('🔍 testImageUrlAccess - Testing URL:', url);
    const response = await fetch(url, { method: 'HEAD' });
    const isAccessible = response.ok;
    console.log(`🔍 testImageUrlAccess - URL ${url} is ${isAccessible ? 'accessible' : 'not accessible'} (status: ${response.status})`);
    return isAccessible;
  } catch (error) {
    console.warn('❌ testImageUrlAccess - Error testing URL:', url, error);
    return false;
  }
}; 