import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert, Modal, ScrollView, Dimensions } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { reviewsService } from '../services/reviewsService';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';
const BACKGROUND = '#f8f9fa';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  facilityId: string;
  facilityName: string;
  facilityType: 'pharmacy' | 'hospital' | 'clinic';
}

export default function RateFacilityModal({ visible, onClose, facilityId, facilityName, facilityType }: RatingModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmit = async () => {
    console.log('🔍 Rating modal - Submit button pressed');
    console.log('🔍 Current user:', user);
    console.log('🔍 User ID:', user?.id);
    console.log('🔍 Rating:', rating);
    console.log('🔍 Comment length:', comment.trim().length);
    
    if (!user) {
      console.log('❌ No user found - authentication required');
      Alert.alert('Authentication Required', 'Please log in to submit a review.');
      return;
    }

    if (rating === 0) {
      console.log('❌ No rating selected');
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (comment.trim().length < 10) {
      console.log('❌ Comment too short:', comment.trim().length);
      Alert.alert('Comment Required', 'Please provide a comment with at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        facilityId: facilityId,
        rating: rating,
        comment: comment.trim(),
        userId: user.id
      };

      console.log('🔍 Sending review data:', reviewData);
      const response = await reviewsService.createReview(reviewData);

      if (response.success) {
        Alert.alert(
          'Review Submitted!',
          'Thank you for your feedback. Your review has been submitted successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                setRating(0);
                setComment('');
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit review. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (rating > 0 || comment.trim().length > 0) {
      Alert.alert(
        'Discard Review?',
        'Are you sure you want to discard your review?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel'
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setRating(0);
              setComment('');
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          activeOpacity={0.7}
          style={styles.starContainer}
        >
          <FontAwesome
            name={i <= rating ? "star" : "star-o"}
            size={32}
            color={i <= rating ? "#f39c12" : "#ddd"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select Rating';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#3498db', '#2980b9']}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.facilityInfo}>
              <Text style={styles.facilityName}>{facilityName}</Text>
              <Text style={styles.facilityType}>{facilityType.charAt(0).toUpperCase() + facilityType.slice(1)}</Text>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>How would you rate your experience?</Text>
              <View style={styles.starsContainer}>
                {renderStars()}
              </View>
              <Text style={styles.ratingText}>{getRatingText()}</Text>
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>Share your experience (optional but helpful)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Tell us about your visit, service quality, staff friendliness, wait times, etc..."
                placeholderTextColor="#95a5a6"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {comment.length}/500 characters
              </Text>
            </View>

            <View style={styles.ratingGuidelines}>
              <Text style={styles.guidelinesTitle}>Rating Guidelines:</Text>
              <View style={styles.guidelineItem}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.guidelineText}>5 - Excellent service, highly recommended</Text>
              </View>
              <View style={styles.guidelineItem}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.guidelineText}>4 - Very good service, would recommend</Text>
              </View>
              <View style={styles.guidelineItem}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.guidelineText}>3 - Good service, meets expectations</Text>
              </View>
              <View style={styles.guidelineItem}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.guidelineText}>2 - Fair service, room for improvement</Text>
              </View>
              <View style={styles.guidelineItem}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.guidelineText}>1 - Poor service, not recommended</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (rating === 0 || comment.trim().length < 10) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || comment.trim().length < 10 || isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  facilityInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  facilityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  facilityType: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starContainer: {
    padding: 5,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f39c12',
  },
  commentSection: {
    marginBottom: 25,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2c3e50',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'right',
    marginTop: 5,
  },
  ratingGuidelines: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  guidelineText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
