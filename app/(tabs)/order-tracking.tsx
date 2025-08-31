import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StatusBar } from 'expo-status-bar';
import { trackingService, OrderTracking, TrackingEntry } from '../../services/trackingService';

const ACCENT = '#3498db';

interface TrackingStep {
  status: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const TRACKING_STEPS: TrackingStep[] = [
  {
    status: 'pending',
    title: 'Order Placed',
    description: 'Your order has been placed and is awaiting confirmation',
    icon: 'shopping-cart',
    color: '#FF9800'
  },
  {
    status: 'confirmed',
    title: 'Order Confirmed',
    description: 'Your order has been confirmed and is being processed',
    icon: 'check-circle',
    color: '#8B5CF6'
  },
  {
    status: 'preparing',
    title: 'Preparing',
    description: 'Your order is being prepared for delivery',
    icon: 'cog',
    color: '#A855F7'
  },
  {
    status: 'ready',
    title: 'Ready',
    description: 'Your order is ready for pickup or delivery',
    icon: 'check-square',
    color: '#10B981'
  },
  {
    status: 'out_for_delivery',
    title: 'Out for Delivery',
    description: 'Your order is on its way to you',
    icon: 'truck',
    color: '#FF5722'
  },
  {
    status: 'delivered',
    title: 'Delivered',
    description: 'Your order has been successfully delivered',
    icon: 'home',
    color: '#10B981'
  }
];

export default function OrderTrackingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.orderId as string;
  const trackingNumber = params.trackingNumber as string;
  const orderNumber = params.orderNumber as string;

  useEffect(() => {
    loadTrackingData();
  }, [orderId]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await trackingService.getTrackingByOrderId(parseInt(orderId));
      
      if (response.success && response.data) {
        console.log('🔍 Tracking data received:', JSON.stringify(response.data, null, 2));
        setTrackingData(response.data);
      } else {
        setError(response.message || 'Failed to load tracking information');
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setError('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = (status: string): number => {
    if (!status) return -1;
    const stepIndex = TRACKING_STEPS.findIndex(step => step.status === status);
    console.log(`🔍 Current status: ${status}, step index: ${stepIndex}`);
    return stepIndex;
  };

  const getStatusColor = (status: string) => {
    if (!status) return '#666';
    const step = TRACKING_STEPS.find(s => s.status === status);
    return step ? step.color : '#666';
  };

  const getStatusIcon = (status: string) => {
    if (!status) return 'question-circle';
    const step = TRACKING_STEPS.find(s => s.status === status);
    return step ? step.icon : 'question-circle';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={60} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error Loading Tracking</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={loadTrackingData}>
          Tap to retry
        </Text>
      </View>
    );
  }

  if (!trackingData) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="question-circle" size={60} color="#95a5a6" />
        <Text style={styles.errorTitle}>No Tracking Information</Text>
        <Text style={styles.errorText}>Tracking information not available for this order.</Text>
      </View>
    );
  }

  const currentStepIndex = getCurrentStepIndex(trackingData.order?.status || '');
  console.log(`🔍 Order status: ${trackingData.order?.status}, Current step index: ${currentStepIndex}`);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Tracking</Text>
                    <Text style={styles.orderNumber}>{orderNumber || 'Unknown'}</Text>
        <Text style={styles.trackingNumber}>Tracking: {trackingData.tracking_number || 'N/A'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Date:</Text>
            <Text style={styles.summaryValue}>
              {formatDate(trackingData.order?.created_at || '')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Address:</Text>
            <Text style={styles.summaryValue}>
              {trackingData.order?.delivery_address || 'No address specified'}
            </Text>
          </View>
          {trackingData.order?.estimated_delivery && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Delivery:</Text>
                             <Text style={styles.summaryValue}>
                 {formatDate(trackingData.order.estimated_delivery || '')}
               </Text>
            </View>
          )}
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.currentStatusHeader}>
            <FontAwesome 
              name={getStatusIcon(trackingData.order.status) as any} 
              size={24} 
              color={getStatusColor(trackingData.order.status)} 
            />
                         <Text style={[styles.currentStatusText, { color: getStatusColor(trackingData.order.status) }]}>
               {trackingData.order.status ? trackingData.order.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
             </Text>
          </View>
                     <Text style={styles.currentStatusDescription}>
             {TRACKING_STEPS.find(step => step.status === trackingData.order?.status)?.description || 
              'Your order is being processed'}
           </Text>
        </View>

        {/* Tracking Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Tracking Timeline</Text>
          
          {TRACKING_STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <View key={step.status} style={styles.timelineStep}>
                <View style={styles.timelineIconContainer}>
                  <View style={[
                    styles.timelineIcon,
                    {
                      backgroundColor: isCompleted ? step.color : '#e0e0e0',
                      borderColor: isCurrent ? step.color : '#e0e0e0'
                    }
                  ]}>
                    <FontAwesome 
                      name={step.icon as any} 
                      size={16} 
                      color={isCompleted ? '#fff' : '#999'} 
                    />
                  </View>
                  {index < TRACKING_STEPS.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      { backgroundColor: isCompleted ? step.color : '#e0e0e0' }
                    ]} />
                  )}
                </View>
                
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineStepTitle,
                    { color: isCompleted ? '#2c3e50' : '#95a5a6' }
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={[
                    styles.timelineStepDescription,
                    { color: isCompleted ? '#7f8c8d' : '#bdc3c7' }
                  ]}>
                    {step.description}
                  </Text>
                  
                                     {/* Show timestamp if this step has been reached */}
                   {isCompleted && trackingData.tracking && trackingData.tracking.find(t => t.status === step.status) && (
                     <Text style={styles.timelineTimestamp}>
                       {formatDate(trackingData.tracking.find(t => t.status === step.status)?.timestamp || '')}
                     </Text>
                   )}
                </View>
              </View>
            );
          })}
        </View>

                 {/* Recent Updates */}
         {trackingData.tracking && trackingData.tracking.length > 0 && (
          <View style={styles.updatesCard}>
            <Text style={styles.updatesTitle}>Recent Updates</Text>
            
                         {(trackingData.tracking || []).slice(0, 5).map((update, index) => (
              <View key={index} style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <FontAwesome 
                    name={getStatusIcon(update.status) as any} 
                    size={16} 
                    color={getStatusColor(update.status)} 
                  />
                                     <Text style={[styles.updateStatus, { color: getStatusColor(update.status) }]}>
                     {update.status ? update.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                   </Text>
                                     <Text style={styles.updateTime}>
                     {formatDate(update.timestamp || '')}
                   </Text>
                </View>
                
                                 <Text style={styles.updateDescription}>
                   {update.description || 'No description available'}
                 </Text>
                
                {update.location && (
                  <Text style={styles.updateLocation}>
                    📍 {update.location}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  trackingNumber: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  currentStatusDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  timelineLine: {
    width: 2,
    height: 40,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineStepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  timelineTimestamp: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
  },
  updatesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updatesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  updateItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  updateTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  updateDescription: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    marginBottom: 4,
  },
  updateLocation: {
    fontSize: 12,
    color: '#7f8c8d',
  },
}); 