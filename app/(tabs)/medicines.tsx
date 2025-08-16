import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { medicinesService, Medicine as MedicineType } from '../../services/medicinesService';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';

// Using MedicineType from the service instead of local interface

export default function MedicinesScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating'>('name');
  const [showPrescriptionOnly, setShowPrescriptionOnly] = useState(false);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [medicines, setMedicines] = useState<MedicineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch medicines from API
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await medicinesService.getMedicines({
        search: searchQuery || undefined,
        category: activeCategory === 'all' ? undefined : activeCategory,
        prescription_required: showPrescriptionOnly || undefined,
        sort_by: sortBy === 'price' ? 'price' : sortBy === 'rating' ? 'popularity' : 'name',
        sort_order: 'ASC',
        limit: 50
      });

      if (response.success && response.data) {
        setMedicines(response.data);
        console.log('✅ Medicines fetched successfully:', response.data.length);
      } else {
        setError(response.message || 'Failed to fetch medicines');
        console.error('❌ Failed to fetch medicines:', response.message);
      }
    } catch (error) {
      console.error('❌ Error fetching medicines:', error);
      setError('Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await medicinesService.getCategories();
      if (response.success && response.data) {
        const categoryNames = response.data.map(cat => cat.category);
        setCategories(['all', ...categoryNames]);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchMedicines();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchMedicines();
  }, [searchQuery, activeCategory, sortBy, showPrescriptionOnly, showInStockOnly]);

  // Filter and sort medicines
  const filteredMedicines = medicines
    .filter(medicine => {
      const matchesSearch = (medicine.name && medicine.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (medicine.description && medicine.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || (medicine.category && medicine.category === activeCategory);
      const matchesPrescription = !showPrescriptionOnly || medicine.prescription_required;
      const matchesStock = !showInStockOnly || (medicine.avg_stock && medicine.avg_stock > 0);
      
      return matchesSearch && matchesCategory && matchesPrescription && matchesStock;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (a.min_price || 0) - (b.min_price || 0);
        case 'rating':
          // Since we don't have rating in the API, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleAddToCart = async (medicine: MedicineType) => {
    const isInStock = medicine.avg_stock && medicine.avg_stock > 0;
    if (!isInStock) {
      Alert.alert('Out of Stock', 'This medicine is currently out of stock.');
      return;
    }
    
    try {
      // For medicines page, we'll use the first available pharmacy
      // This allows users to add medicines directly from the medicines page
      const pharmacyId = 1; // Default pharmacy ID
      const pricePerUnit = Number(medicine.min_price) || 0;
      
      const success = await addToCart(medicine, pharmacyId, pricePerUnit, 1);
      
      if (success) {
        Alert.alert('Added to Cart', `${medicine.name} has been added to your cart!`);
      } else {
        Alert.alert('Error', 'Failed to add item to cart. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  const handleMedicinePress = (medicine: MedicineType) => {
    // Navigate to medicine details modal
    router.push({
      pathname: '/medicine-details-modal',
      params: {
        medicineId: medicine.id.toString(),
        medicineName: medicine.name,
        genericName: medicine.generic_name || '',
        category: medicine.category,
        prescriptionRequired: medicine.prescription_required.toString(),
        dosageForm: medicine.dosage_form || '',
        strength: medicine.strength || '',
        description: medicine.description || '',
        manufacturer: medicine.manufacturer || '',
        stockQuantity: (medicine.avg_stock ?? 0).toString(),
        price: (medicine.min_price ?? 0).toString(),
        isAvailable: ((medicine.avg_stock ?? 0) > 0).toString(),
        medicineImage: '' // API doesn't provide images
      }
    });
  };



  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines..."
              placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading medicines...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines..."
              placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <FontAwesome name="exclamation-triangle" size={48} color={DANGER} />
          <Text style={{ marginTop: 16, fontSize: 18, color: DANGER, fontWeight: '600', textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: ACCENT, borderRadius: 8 }}
            onPress={fetchMedicines}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, activeCategory === category && styles.activeCategoryChip]}
                onPress={() => setActiveCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, activeCategory === category && styles.activeCategoryChipText]}>
                  {category === 'all' ? 'All' : category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sort and Filter Options */}
        <View style={styles.filterRow}>
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'name' && styles.activeSortButton]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'name' && styles.activeSortButtonText]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'price' && styles.activeSortButton]}
              onPress={() => setSortBy('price')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'price' && styles.activeSortButtonText]}>Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'rating' && styles.activeSortButton]}
              onPress={() => setSortBy('rating')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.activeSortButtonText]}>Rating</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Medicines List */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {filteredMedicines.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="search" size={60} color="#95a5a6" />
            <Text style={styles.emptyStateTitle}>No medicines found</Text>
            <Text style={styles.emptyStateText}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          filteredMedicines.map(medicine => {
            const isInStock = medicine.avg_stock && medicine.avg_stock > 0;
            const priceText = medicinesService.formatPriceRange(medicine.min_price, medicine.max_price);
            const categoryIcon = medicinesService.getMedicineIcon(medicine.category || 'default');
            const categoryColor = medicinesService.getMedicineColor(medicine.category || 'default');
            
            return (
              <TouchableOpacity
                key={medicine.id}
                style={styles.medicineCard}
                onPress={() => handleMedicinePress(medicine)}
                activeOpacity={0.7}
              >
                <View style={[styles.medicineImage, { backgroundColor: categoryColor + '20' }]}>
                  <FontAwesome name={categoryIcon as any} size={32} color={categoryColor} />
                </View>
                <View style={styles.medicineInfo}>
                  <View style={styles.medicineHeader}>
                    <Text style={styles.medicineName}>{medicine.name || 'Unknown Medicine'}</Text>
                    {medicine.prescription_required && (
                      <View style={styles.prescriptionBadge}>
                        <FontAwesome name="medkit" size={10} color="#fff" />
                        <Text style={styles.prescriptionText}>Rx</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.medicineDescription}>{medicine.description || 'No description available'}</Text>
                  <Text style={styles.medicineCategory}>{medicine.category || 'Uncategorized'}</Text>
                  
                  <View style={styles.medicineFooter}>
                    <Text style={styles.medicinePrice}>{priceText}</Text>
                    <View style={styles.stockStatus}>
                      {isInStock ? (
                        <Text style={styles.inStockText}>In Stock</Text>
                      ) : (
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                      )}
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.addToCartButton,
                    !isInStock && styles.addToCartButtonDisabled
                  ]}
                  onPress={() => handleAddToCart(medicine)}
                  disabled={!isInStock}
                  activeOpacity={0.7}
                >
                  <FontAwesome 
                    name="plus" 
                    size={16} 
                    color={isInStock ? "#fff" : "#95a5a6"} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
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
  searchSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeCategoryChip: {
    backgroundColor: ACCENT,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8,
  },
  sortButton: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeSortButtonText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  medicineCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
  },
  medicineImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  prescriptionBadge: {
    backgroundColor: DANGER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  prescriptionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  medicineDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  medicineCategory: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicinePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
  },
  stockStatus: {
    alignItems: 'flex-end',
  },
  inStockText: {
    fontSize: 12,
    color: SUCCESS,
    fontWeight: '500',
  },
  outOfStockText: {
    fontSize: 12,
    color: DANGER,
    fontWeight: '500',
  },
  addToCartButton: {
    backgroundColor: ACCENT,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ecf0f1',
  },
}); 