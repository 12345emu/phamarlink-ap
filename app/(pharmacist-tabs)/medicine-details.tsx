import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { medicinesService, Medicine } from '../../services/medicinesService';
import { pharmacistInventoryService, InventoryMedicine } from '../../services/pharmacistInventoryService';
import { API_CONFIG } from '../../constants/API';

const { width } = Dimensions.get('window');

export default function MedicineDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [medicine, setMedicine] = useState<InventoryMedicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseMedicine, setBaseMedicine] = useState<Medicine | null>(null);

  useEffect(() => {
    loadMedicineDetails();
  }, [params.medicineId]);

  const loadMedicineDetails = async () => {
    try {
      setLoading(true);
      const medicineId = params.medicineId as string;

      if (!medicineId) {
        Alert.alert('Error', 'Medicine ID is required');
        router.push('/(pharmacist-tabs)/inventory');
        return;
      }

      // Load inventory to get facility-specific data
      const inventoryResponse = await pharmacistInventoryService.getInventory();
      
      if (inventoryResponse.success && inventoryResponse.data) {
        const inventoryMedicine = inventoryResponse.data.find(
          (m) => m.medicine_id.toString() === medicineId
        );

        if (inventoryMedicine) {
          setMedicine(inventoryMedicine);
        }
      }

      // Load base medicine details
      const medicineResponse = await medicinesService.getMedicineById(medicineId);
      if (medicineResponse.success && medicineResponse.data) {
        setBaseMedicine(medicineResponse.data);
      }
    } catch (error) {
      console.error('Error loading medicine details:', error);
      Alert.alert('Error', 'Failed to load medicine details');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert relative image path to full URL
  const getMedicineImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return '';
    
    // If it's already a full URL (starts with http), return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Convert relative path to full URL
    if (imagePath.startsWith('/uploads/')) {
      // Remove /api from BASE_URL for static file serving
      const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
      return `${baseUrl}${imagePath}`;
    }
    
    // If it doesn't start with /uploads/, return as is (might be a different format)
    return imagePath;
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return { label: 'Out of Stock', color: '#e74c3c' };
    } else if (quantity < 10) {
      return { label: 'Low Stock', color: '#f39c12' };
    } else {
      return { label: 'In Stock', color: '#2ecc71' };
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) {
      return { label: 'Not Set', color: '#95a5a6', isExpiring: false };
    }
    
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) {
        return { label: 'Invalid Date', color: '#95a5a6', isExpiring: false };
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDateOnly = new Date(expiry);
      expiryDateOnly.setHours(0, 0, 0, 0);
      
      const daysUntilExpiry = Math.ceil((expiryDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        return { label: 'Expired', color: '#e74c3c', isExpiring: true };
      } else if (daysUntilExpiry <= 30) {
        return { label: `Expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`, color: '#f39c12', isExpiring: true };
      } else {
        return { label: 'Valid', color: '#2ecc71', isExpiring: false };
      }
    } catch (error) {
      return { label: 'Unknown', color: '#95a5a6', isExpiring: false };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading medicine details...</Text>
      </View>
    );
  }

  if (!medicine && !baseMedicine) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>Medicine not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(pharmacist-tabs)/inventory')}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayMedicine = medicine || baseMedicine;
  const stockStatus = medicine ? getStockStatus(medicine.stock_quantity) : null;
  
  // Get image URL from baseMedicine
  const imageUrl = getMedicineImageUrl(baseMedicine?.image);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1f3a', '#2d3561']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButtonHeader}
            onPress={() => router.push('/(pharmacist-tabs)/inventory')}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medicine Details</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Medicine Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.medicineImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('❌ Failed to load medicine image:', error);
                console.error('❌ Image URL:', imageUrl);
              }}
            />
          ) : (
            <View style={styles.placeholderImageContainer}>
              <FontAwesome name="medkit" size={64} color="#d4af37" />
              <Text style={styles.placeholderImageText}>No Image Available</Text>
            </View>
          )}
        </View>

        {/* Medicine Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.nameRow}>
            <Text style={styles.medicineName}>{displayMedicine?.name}</Text>
            {stockStatus && (
              <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
                <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
                <Text style={[styles.stockText, { color: stockStatus.color }]}>
                  {stockStatus.label}
                </Text>
              </View>
            )}
          </View>

          {displayMedicine?.generic_name && (
            <Text style={styles.genericName}>{displayMedicine.generic_name}</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <FontAwesome name="tag" size={14} color="#7a7a7a" />
              <Text style={styles.metaText}>{displayMedicine?.category}</Text>
            </View>
            {displayMedicine?.manufacturer && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <View style={styles.metaItem}>
                  <FontAwesome name="building" size={14} color="#7a7a7a" />
                  <Text style={styles.metaText}>{displayMedicine.manufacturer}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Inventory Details Card */}
        {medicine && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Inventory Information</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <FontAwesome name="cube" size={16} color="#d4af37" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Stock Quantity</Text>
                  <Text style={styles.detailValue}>{medicine.stock_quantity} units</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <FontAwesome name="money" size={16} color="#d4af37" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>₵{medicine.price.toFixed(2)}</Text>
                </View>
              </View>
              {medicine.discount_price && (
                <View style={styles.detailItem}>
                  <FontAwesome name="tag" size={16} color="#d4af37" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Discount Price</Text>
                    <Text style={styles.detailValue}>₵{medicine.discount_price.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <FontAwesome name="calendar" size={16} color="#d4af37" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Expiry Date</Text>
                  {medicine.expiry_date ? (
                    <View style={styles.expiryDateContainer}>
                      <Text style={styles.detailValue}>
                        {(() => {
                          try {
                            const date = new Date(medicine.expiry_date);
                            if (isNaN(date.getTime())) {
                              return medicine.expiry_date;
                            }
                            return date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            });
                          } catch (error) {
                            return medicine.expiry_date;
                          }
                        })()}
                      </Text>
                      {(() => {
                        const expiryStatus = getExpiryStatus(medicine.expiry_date);
                        return (
                          <View style={[styles.expiryStatusBadge, { backgroundColor: expiryStatus.color + '20' }]}>
                            <View style={[styles.expiryStatusDot, { backgroundColor: expiryStatus.color }]} />
                            <Text style={[styles.expiryStatusText, { color: expiryStatus.color }]}>
                              {expiryStatus.label}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  ) : (
                    <Text style={[styles.detailValue, styles.notSetText]}>Not Set</Text>
                  )}
                </View>
              </View>
            </View>

            {medicine.batch_number && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <FontAwesome name="barcode" size={16} color="#d4af37" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Batch Number</Text>
                    <Text style={styles.detailValue}>{medicine.batch_number}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Medicine Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Medicine Information</Text>

          {displayMedicine?.dosage_form && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <FontAwesome name="flask" size={16} color="#d4af37" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Dosage Form</Text>
                  <Text style={styles.detailValue}>{displayMedicine.dosage_form}</Text>
                </View>
              </View>
            </View>
          )}

          {displayMedicine?.strength && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <FontAwesome name="tachometer" size={16} color="#d4af37" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Strength</Text>
                  <Text style={styles.detailValue}>{displayMedicine.strength}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <FontAwesome 
                name={displayMedicine?.prescription_required ? "lock" : "unlock"} 
                size={16} 
                color="#d4af37" 
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Prescription Required</Text>
                <Text style={styles.detailValue}>
                  {displayMedicine?.prescription_required ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          </View>

          {baseMedicine?.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{baseMedicine.description}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => {
              router.push('/(pharmacist-tabs)/inventory');
            }}
          >
            <FontAwesome name="edit" size={16} color="#fff" />
            <Text style={styles.updateButtonText}>Update Stock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7a7a7a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1f3a',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Extra padding to account for tab bar
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#fff',
  },
  medicineImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImageText: {
    marginTop: 12,
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1f3a',
    flex: 1,
    marginRight: 12,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  genericName: {
    fontSize: 16,
    color: '#7a7a7a',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaSeparator: {
    fontSize: 14,
    color: '#7a7a7a',
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#7a7a7a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7a7a7a',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f3a',
  },
  expiryDateContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  expiryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  expiryStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expiryStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notSetText: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#5a5a5a',
    lineHeight: 22,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4af37',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacing: {
    height: 20,
  },
});

