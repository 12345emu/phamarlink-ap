// Utility functions for handling profile images

/**
 * Constructs the full URL for a profile image
 * @param imagePath - The image path from the database (e.g., '/uploads/profile-images/filename.jpg')
 * @returns The full URL for the image
 */
export const constructProfileImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) {
    return null;
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Construct full URL with the server base URL
  return `http://172.20.10.3:3000${imagePath}`;
};

/**
 * Checks if a string is a valid image URL
 * @param url - The URL to check
 * @returns True if it's a valid image URL
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a valid URL
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}; 