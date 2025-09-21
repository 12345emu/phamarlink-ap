// Image validation and processing utilities

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImageInfo {
  width?: number;
  height?: number;
  fileSize?: number;
  type?: string;
  uri: string;
}

/**
 * Validates an image asset for profile upload
 * @param asset - The image asset from ImagePicker
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 */
export const validateProfileImage = (asset: any, options: {
  maxFileSize?: number;
  maxDimensions?: number;
  strictDimensions?: boolean;
  strictFormat?: boolean;
} = {}): ImageValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if asset exists
  if (!asset) {
    errors.push('No image selected');
    return { isValid: false, errors, warnings };
  }

  // Set default options
  const maxFileSize = options.maxFileSize || 5 * 1024 * 1024; // 5MB default
  const maxDimensions = options.maxDimensions || 4096; // 4096px default
  const strictDimensions = options.strictDimensions !== false; // true by default
  const strictFormat = options.strictFormat !== false; // true by default

  // Check file size
  if (asset.fileSize && asset.fileSize > maxFileSize) {
    errors.push(`Image file is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
  } else if (asset.fileSize && asset.fileSize > maxFileSize * 0.4) {
    warnings.push('Image file is large. Consider using a smaller image for faster upload.');
  }

  // Check dimensions (only if strict validation is enabled)
  if (strictDimensions && asset.width && asset.height) {
    if (asset.width > maxDimensions || asset.height > maxDimensions) {
      errors.push(`Image dimensions are too large. Maximum size is ${maxDimensions}x${maxDimensions} pixels.`);
    } else if (asset.width > maxDimensions * 0.5 || asset.height > maxDimensions * 0.5) {
      warnings.push('Image dimensions are large. Consider using a smaller image for better performance.');
    }
  }

  // Check aspect ratio (should be close to 1:1 for profile images)
  if (asset.width && asset.height) {
    const aspectRatio = asset.width / asset.height;
    if (aspectRatio < 0.8 || aspectRatio > 1.25) {
      warnings.push('Image aspect ratio is not square. It will be cropped to fit.');
    }
  }

  // Check file type - be more lenient with format validation
  if (strictFormat && asset.type) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif','image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'];
    const normalizedType = asset.type.toLowerCase().trim();
    
    // Also check for common variations
    const isImageType = normalizedType.startsWith('image/') && (
      normalizedType.includes('jpeg') || 
      normalizedType.includes('jpg') || 
      normalizedType.includes('png') || 
      normalizedType.includes('webp') ||
      normalizedType.includes('heic') ||
      normalizedType.includes('heif')
    );
    
    if (!allowedTypes.includes(normalizedType) && !isImageType) {
      errors.push(`Invalid image format: ${asset.type}. Please use JPEG, PNG, WebP, or HEIC format.`);
    }
  } else if (!strictFormat && asset.type) {
    // If format validation is disabled, just log a warning for unknown types
    const normalizedType = asset.type.toLowerCase().trim();
    if (!normalizedType.startsWith('image/')) {
      warnings.push(`Unknown file type: ${asset.type}. Proceeding with upload.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Gets optimal image picker options based on device capabilities
 * @param source - Camera or library source
 * @returns ImagePicker options
 */
export const getOptimalImagePickerOptions = (source: 'camera' | 'library') => {
  const baseOptions = {
    mediaTypes: 'Images' as const,
    allowsEditing: true,
    aspect: [1, 1] as [number, number],
    quality: 0.8, // Higher quality for better image results
    exif: false, // Remove EXIF data for privacy
  };

  if (source === 'camera') {
    return {
      ...baseOptions,
      // Camera-specific options
      cameraType: 'front' as const, // Default to front camera for selfies
    };
  }

  return baseOptions;
};

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets image compression recommendations
 * @param asset - The image asset
 * @returns Compression recommendations
 */
export const getCompressionRecommendations = (asset: any): string[] => {
  const recommendations: string[] = [];

  if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
    recommendations.push('Consider reducing image quality to 0.6-0.8 for faster upload');
  }

  if (asset.width && asset.height && (asset.width > 2048 || asset.height > 2048)) {
    recommendations.push('Consider resizing image to 2048x2048 or smaller');
  }

  if (asset.type && !['image/jpeg', 'image/jpg','image/png','image/webp','image/heic','image/heif'].includes(asset.type.toLowerCase())) {
    recommendations.push('Consider converting to JPEG format for better compression');
  }

  return recommendations;
};
