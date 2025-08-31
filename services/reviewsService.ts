import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

export interface Review {
  id: string;
  facilityId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

export interface CreateReviewData {
  facilityId: string;
  rating: number;
  comment: string;
  userId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ReviewsService {
  // Create a new review
  async createReview(reviewData: CreateReviewData): Promise<ApiResponse<Review>> {
    try {
      console.log('🔍 ReviewsService - Creating review with data:', reviewData);
      console.log('🔍 ReviewsService - API endpoint:', API_ENDPOINTS.REVIEWS.CREATE);
      
      const response = await apiClient.post<Review>(API_ENDPOINTS.REVIEWS.CREATE, reviewData);
      
      console.log('🔍 ReviewsService - Response received:', response);
      return response;
    } catch (error) {
      console.error('❌ ReviewsService - Create review error:', error);
      
      if (error.response) {
        console.error('❌ ReviewsService - Error response:', error.response.data);
        console.error('❌ ReviewsService - Error status:', error.response.status);
      }
      
      return {
        success: false,
        message: 'Failed to create review. Please try again.',
        error: 'Create Review Error',
      };
    }
  }

  // Get reviews for a specific facility
  async getFacilityReviews(facilityId: string, limit: number = 10, offset: number = 0): Promise<ApiResponse<Review[]>> {
    try {
      const response = await apiClient.get<Review[]>(`${API_ENDPOINTS.REVIEWS.FACILITY}/${facilityId}?limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error('Get facility reviews error:', error);
      return {
        success: false,
        message: 'Failed to fetch reviews. Please try again.',
        error: 'Get Reviews Error',
      };
    }
  }

  // Get user's reviews
  async getUserReviews(userId: string, limit: number = 10, offset: number = 0): Promise<ApiResponse<Review[]>> {
    try {
      const response = await apiClient.get<Review[]>(`${API_ENDPOINTS.REVIEWS.USER}/${userId}?limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error('Get user reviews error:', error);
      return {
        success: false,
        message: 'Failed to fetch your reviews. Please try again.',
        error: 'Get User Reviews Error',
      };
    }
  }

  // Update a review
  async updateReview(reviewId: string, reviewData: Partial<CreateReviewData>): Promise<ApiResponse<Review>> {
    try {
      const response = await apiClient.put<Review>(`${API_ENDPOINTS.REVIEWS.UPDATE}/${reviewId}`, reviewData);
      return response;
    } catch (error) {
      console.error('Update review error:', error);
      return {
        success: false,
        message: 'Failed to update review. Please try again.',
        error: 'Update Review Error',
      };
    }
  }

  // Delete a review
  async deleteReview(reviewId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.delete<boolean>(`${API_ENDPOINTS.REVIEWS.DELETE}/${reviewId}`);
      return response;
    } catch (error) {
      console.error('Delete review error:', error);
      return {
        success: false,
        message: 'Failed to delete review. Please try again.',
        error: 'Delete Review Error',
      };
    }
  }

  // Get average rating for a facility
  async getFacilityAverageRating(facilityId: string): Promise<ApiResponse<{ averageRating: number; totalReviews: number }>> {
    try {
      const response = await apiClient.get<{ averageRating: number; totalReviews: number }>(`${API_ENDPOINTS.REVIEWS.AVERAGE}/${facilityId}`);
      return response;
    } catch (error) {
      console.error('Get facility average rating error:', error);
      return {
        success: false,
        message: 'Failed to fetch facility rating. Please try again.',
        error: 'Get Average Rating Error',
      };
    }
  }

  // Check if user has already reviewed a facility
  async hasUserReviewed(facilityId: string, userId: string): Promise<ApiResponse<{ hasReviewed: boolean; review?: Review }>> {
    try {
      const response = await apiClient.get<{ hasReviewed: boolean; review?: Review }>(`${API_ENDPOINTS.REVIEWS.CHECK}/${facilityId}/${userId}`);
      return response;
    } catch (error) {
      console.error('Check user review error:', error);
      return {
        success: false,
        message: 'Failed to check review status. Please try again.',
        error: 'Check Review Error',
      };
    }
  }
}

// Export singleton instance
export const reviewsService = new ReviewsService();
