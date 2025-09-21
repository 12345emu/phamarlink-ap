import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, Dimensions, Alert, Platform, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCart } from '../context/CartContext';
import { medicinesService, Medicine } from '../services/medicinesService';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const WARNING = '#f39c12';
const DANGER = '#e74c3c';
const BACKGROUND = '#f8f9fa';

interface MedicineDetails {
  id: number;
  name: string;
  generic_name?: string;
  category: string;
  prescription_required: boolean;
  dosage_form?: string;
  strength?: string;
  description?: string;
  manufacturer?: string;
  stock_quantity: number;
  price: number;
  discount_price?: number;
  is_available: boolean;
  image?: string;
  side_effects?: string[];
  interactions?: string[];
  dosage_instructions?: string;
  storage_instructions?: string;
  expiry_date?: string;
  active_ingredients?: string[];
  contraindications?: string[];
  pregnancy_category?: string;
  breastfeeding_safe?: boolean;
}

export default function MedicineDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [medicine, setMedicine] = useState<MedicineDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicineDetails = async () => {
      try {
        setLoading(true);
        const medicineId = params.medicineId as string;
        
        if (medicineId) {
          const response = await medicinesService.getMedicineById(medicineId);
          
          if (response.success && response.data) {
            // Convert API Medicine to MedicineDetails format
                         const medicineData: MedicineDetails = {
               id: parseInt(response.data.id),
              name: response.data.name,
              generic_name: response.data.generic_name,
              category: response.data.category,
              prescription_required: Boolean(response.data.prescription_required),
              dosage_form: response.data.dosage_form,
              strength: response.data.strength,
              description: response.data.description || 'No description available',
              manufacturer: response.data.manufacturer,
                             stock_quantity: response.data.avg_stock || 0,
               price: Number(response.data.min_price) || 0,
              is_available: (response.data.avg_stock || 0) > 0,
              image: '', // API doesn't provide images
              // Use default values for fields not in API
              side_effects: [
                'Nausea and vomiting',
                'Headache',
                'Dizziness',
                'Drowsiness',
                'Stomach upset',
                'Allergic reactions (rare)'
              ],
              interactions: [
                'Avoid alcohol while taking this medication',
                'May interact with blood thinners',
                'Consult doctor before taking with other medications'
              ],
              dosage_instructions: 'Take 1 tablet every 6-8 hours as needed. Do not exceed 4 tablets in 24 hours.',
              storage_instructions: 'Store at room temperature (20-25°C). Keep away from heat, moisture, and direct sunlight.',
              expiry_date: '2025-12-31',
              active_ingredients: ['Active ingredient'],
              contraindications: [
                'Allergy to any ingredient',
                'Severe liver disease',
                'Pregnancy (first trimester)',
                'Children under 12 years'
              ],
              pregnancy_category: 'C',
              breastfeeding_safe: false
            };
            
            setMedicine(medicineData);
                     } else {
             console.error('Failed to fetch medicine details:', response.message);
             // Fallback to params data
             const fallbackData: MedicineDetails = {
               id: parseInt(params.medicineId as string) || 1,
               name: params.medicineName as string || 'Medicine Name',
               generic_name: params.genericName as string,
               category: params.category as string || 'General',
               prescription_required: params.prescriptionRequired === 'true',
               dosage_form: params.dosageForm as string || 'Tablet',
               strength: params.strength as string || '500mg',
               description: params.description as string || 'This medicine is used to treat various conditions.',
               manufacturer: params.manufacturer as string || 'Pharmaceutical Company',
               stock_quantity: parseInt(params.stockQuantity as string) || 100,
               price: Number(params.price) || 25.00,
              is_available: params.isAvailable !== 'false',
              image: params.medicineImage as string,
              side_effects: ['Nausea and vomiting', 'Headache', 'Dizziness'],
              interactions: ['Avoid alcohol while taking this medication'],
              dosage_instructions: 'Take as directed by your doctor.',
              storage_instructions: 'Store at room temperature.',
              expiry_date: '2025-12-31',
              active_ingredients: ['Active ingredient'],
              contraindications: ['Allergy to any ingredient'],
              pregnancy_category: 'C',
              breastfeeding_safe: false
            };
            setMedicine(fallbackData);
          }
        }
      } catch (error) {
        console.error('Error fetching medicine details:', error);
        // Fallback to params data on error
        const fallbackData: MedicineDetails = {
          id: parseInt(params.medicineId as string) || 1,
          name: params.medicineName as string || 'Medicine Name',
          generic_name: params.genericName as string,
          category: params.category as string || 'General',
          prescription_required: params.prescriptionRequired === 'true',
          dosage_form: params.dosageForm as string || 'Tablet',
          strength: params.strength as string || '500mg',
          description: params.description as string || 'This medicine is used to treat various conditions.',
          manufacturer: params.manufacturer as string || 'Pharmaceutical Company',
          stock_quantity: parseInt(params.stockQuantity as string) || 100,
          price: parseFloat(params.price as string) || 25.00,
          is_available: params.isAvailable !== 'false',
          image: params.medicineImage as string,
          side_effects: ['Nausea and vomiting', 'Headache', 'Dizziness'],
          interactions: ['Avoid alcohol while taking this medication'],
          dosage_instructions: 'Take as directed by your doctor.',
          storage_instructions: 'Store at room temperature.',
          expiry_date: '2025-12-31',
          active_ingredients: ['Active ingredient'],
          contraindications: ['Allergy to any ingredient'],
          pregnancy_category: 'C',
          breastfeeding_safe: false
        };
        setMedicine(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicineDetails();
  }, [params.medicineId]);

  const handleAddToCart = async () => {
    if (!medicine) return;
    
    try {
      // For medicine details, we'll use the first available pharmacy
      const pharmacyId = 5; // CityMed Pharmacy ID (valid pharmacy with medicines)
      const pricePerUnit = medicine.price;
      
      const success = await addToCart(medicine, pharmacyId, pricePerUnit, 1);
      
      if (success) {
        Alert.alert(
          'Added to Cart',
          `${medicine.name} has been added to your cart!`,
          [
            {
              text: 'Continue Shopping',
              style: 'default',
            },
            {
              text: 'View Cart',
              style: 'default',
              onPress: () => router.push('/(tabs)/cart'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add item to cart. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  const handleBuyNow = async () => {
    if (!medicine) return;
    
    try {
      // For medicine details, we'll use the first available pharmacy
      const pharmacyId = 5; // CityMed Pharmacy ID (valid pharmacy with medicines)
      const pricePerUnit = medicine.price;
      
      const success = await addToCart(medicine, pharmacyId, pricePerUnit, 1);
      
      if (success) {
        Alert.alert(
          'Buy Now',
          `${medicine.name} has been added to your cart and you're being redirected to checkout.`,
          [
            { 
              text: 'Proceed to Checkout', 
              onPress: () => {
                router.push('/(tabs)/checkout');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add item to cart. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'Pain Relief': 'bandage',
      'Antibiotics': 'shield',
      'Vitamins': 'leaf',
      'Cardiovascular': 'heartbeat',
      'Diabetes': 'tint',
      'Respiratory': 'wind',
      'Mental Health': 'brain',
      'General': 'pills'
    };
    return icons[category] || 'pills';
  };

  const getPregnancyCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'A': SUCCESS,
      'B': SUCCESS,
      'C': WARNING,
      'D': DANGER,
      'X': DANGER
    };
    return colors[category] || WARNING;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <FontAwesome name="spinner" size={24} color={ACCENT} />
        <Text style={styles.loadingText}>Loading medicine details...</Text>
      </View>
    );
  }

  if (!medicine) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={48} color={DANGER} />
        <Text style={styles.errorText}>Medicine not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ color: ACCENT, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[ACCENT, '#2980b9']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.medicineIcon}>
            <FontAwesome name={getCategoryIcon(medicine.category) as any} size={32} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <Text style={styles.medicineCategory}>{medicine.category}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.shareButton}>
          <FontAwesome name="share" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Medicine Image */}
        {medicine.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: medicine.image }} style={styles.medicineImage} />
          </View>
        )}

        {/* Price and Availability */}
        <View style={styles.priceSection}>
          <View style={styles.priceInfo}>
                            <Text style={styles.price}>GHS {Number(medicine.price).toFixed(2)}</Text>
            {medicine.discount_price && (
                              <Text style={styles.originalPrice}>GHS {Number(medicine.discount_price).toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.availabilityContainer}>
            <View style={[styles.availabilityIndicator, { backgroundColor: medicine.is_available ? SUCCESS : DANGER }]} />
            <Text style={styles.availabilityText}>
              {medicine.is_available ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.addToCartButton]}
            onPress={handleAddToCart}
            disabled={!medicine.is_available}
          >
            <FontAwesome name="shopping-cart" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Add to Cart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.buyNowButton]}
            onPress={handleBuyNow}
            disabled={!medicine.is_available}
          >
            <FontAwesome name="credit-card" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Buy Now</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Generic Name</Text>
              <Text style={styles.infoValue}>{medicine.generic_name || 'Not specified'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dosage Form</Text>
              <Text style={styles.infoValue}>{medicine.dosage_form}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Strength</Text>
              <Text style={styles.infoValue}>{medicine.strength}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Manufacturer</Text>
              <Text style={styles.infoValue}>{medicine.manufacturer}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{medicine.description}</Text>
        </View>

        {/* Active Ingredients */}
        {medicine.active_ingredients && medicine.active_ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Ingredients</Text>
            {medicine.active_ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <FontAwesome name="circle" size={8} color={ACCENT} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dosage Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosage Instructions</Text>
          <View style={styles.instructionCard}>
            <FontAwesome name="info-circle" size={20} color={ACCENT} />
            <Text style={styles.instructionText}>{medicine.dosage_instructions}</Text>
          </View>
        </View>

        {/* Side Effects */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Side Effects</Text>
          {medicine.side_effects?.map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <FontAwesome name="exclamation-triangle" size={14} color={WARNING} />
              <Text style={styles.effectText}>{effect}</Text>
            </View>
          ))}
        </View>

        {/* Drug Interactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drug Interactions</Text>
          {medicine.interactions?.map((interaction, index) => (
            <View key={index} style={styles.interactionItem}>
              <FontAwesome name="link" size={14} color={DANGER} />
              <Text style={styles.interactionText}>{interaction}</Text>
            </View>
          ))}
        </View>

        {/* Contraindications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contraindications</Text>
          {medicine.contraindications?.map((contraindication, index) => (
            <View key={index} style={styles.contraindicationItem}>
              <FontAwesome name="times-circle" size={14} color={DANGER} />
              <Text style={styles.contraindicationText}>{contraindication}</Text>
            </View>
          ))}
        </View>

        {/* Pregnancy & Breastfeeding */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pregnancy & Breastfeeding</Text>
          <View style={styles.pregnancyInfo}>
            <View style={styles.pregnancyItem}>
              <Text style={styles.pregnancyLabel}>Pregnancy Category</Text>
              <View style={[styles.categoryBadge, { backgroundColor: getPregnancyCategoryColor(medicine.pregnancy_category || 'Unknown') }]}>
                <Text style={styles.categoryText}>{medicine.pregnancy_category}</Text>
              </View>
            </View>
            <View style={styles.pregnancyItem}>
              <Text style={styles.pregnancyLabel}>Breastfeeding Safe</Text>
              <View style={[styles.safetyBadge, { backgroundColor: medicine.breastfeeding_safe ? SUCCESS : DANGER }]}>
                <Text style={styles.safetyText}>
                  {medicine.breastfeeding_safe ? 'Safe' : 'Not Safe'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Storage Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Instructions</Text>
          <View style={styles.storageCard}>
            <FontAwesome name="thermometer-half" size={20} color={ACCENT} />
            <Text style={styles.storageText}>{medicine.storage_instructions}</Text>
          </View>
        </View>

        {/* Prescription Required Badge */}
        {medicine.prescription_required && (
          <View style={styles.prescriptionSection}>
            <View style={styles.prescriptionBadge}>
              <FontAwesome name="shield" size={20} color="#fff" />
              <Text style={styles.prescriptionText}>Prescription Required</Text>
            </View>
            <Text style={styles.prescriptionNote}>
              This medication requires a valid prescription from a healthcare provider.
            </Text>
          </View>
        )}

        {/* Expiry Date */}
        {medicine.expiry_date && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expiry Date</Text>
            <View style={styles.expiryCard}>
              <FontAwesome name="calendar" size={20} color={WARNING} />
              <Text style={styles.expiryText}>{medicine.expiry_date}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: DANGER,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  medicineIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  medicineName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  medicineCategory: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  medicineImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ACCENT,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartButton: {
    backgroundColor: ACCENT,
  },
  buyNowButton: {
    backgroundColor: SUCCESS,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  effectText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  interactionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  contraindicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contraindicationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  pregnancyInfo: {
    gap: 12,
  },
  pregnancyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pregnancyLabel: {
    fontSize: 14,
    color: '#333',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  safetyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  safetyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  storageCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  storageText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  prescriptionSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DANGER,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  prescriptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  prescriptionNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  expiryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 12,
    fontWeight: '500',
  },
}); 