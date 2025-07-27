import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';

interface Medicine {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  dosage: string;
  manufacturer: string;
  prescription: boolean;
  inStock: boolean;
  rating: number;
  reviews: number;
}

export default function MedicinesScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating'>('name');
  const [showPrescriptionOnly, setShowPrescriptionOnly] = useState(false);
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Sample medicines data
  const medicines: Medicine[] = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      description: "Pain reliever and fever reducer",
      price: 10.99,
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      category: "Pain Relief",
      dosage: "1-2 tablets every 4-6 hours",
      manufacturer: "PharmaCorp",
      prescription: false,
      inStock: true,
      rating: 4.5,
      reviews: 128
    },
    {
      id: 2,
      name: "Amoxicillin 250mg",
      description: "Antibiotic for bacterial infections",
      price: 25.00,
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80",
      category: "Antibiotics",
      dosage: "1 capsule 3 times daily",
      manufacturer: "MediPharm",
      prescription: true,
      inStock: true,
      rating: 4.2,
      reviews: 89
    },
    {
      id: 3,
      name: "Vitamin C 500mg",
      description: "Immune system support and antioxidant",
      price: 12.00,
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80",
      category: "Vitamins",
      dosage: "1 tablet daily",
      manufacturer: "HealthPlus",
      prescription: false,
      inStock: true,
      rating: 4.7,
      reviews: 156
    },
    {
      id: 4,
      name: "Ibuprofen 400mg",
      description: "Anti-inflammatory pain reliever",
      price: 13.00,
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
      category: "Pain Relief",
      dosage: "1-2 tablets every 6-8 hours",
      manufacturer: "PainFree Inc",
      prescription: false,
      inStock: true,
      rating: 4.3,
      reviews: 94
    },
    {
      id: 5,
      name: "Omeprazole 20mg",
      description: "Acid reflux and stomach ulcer treatment",
      price: 18.50,
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80",
      category: "Digestive Health",
      dosage: "1 capsule daily before breakfast",
      manufacturer: "DigestCare",
      prescription: true,
      inStock: false,
      rating: 4.1,
      reviews: 67
    },
    {
      id: 6,
      name: "Vitamin D3 1000IU",
      description: "Bone health and immune support",
      price: 20.00,
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      category: "Vitamins",
      dosage: "1 tablet daily",
      manufacturer: "SunHealth",
      prescription: false,
      inStock: true,
      rating: 4.6,
      reviews: 112
    },
    {
      id: 7,
      name: "Cetirizine 10mg",
      description: "Allergy relief and antihistamine",
      price: 8.99,
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80",
      category: "Allergy",
      dosage: "1 tablet daily",
      manufacturer: "AllerCare",
      prescription: false,
      inStock: true,
      rating: 4.4,
      reviews: 78
    },
    {
      id: 8,
      name: "Metformin 500mg",
      description: "Diabetes management medication",
      price: 15.75,
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
      category: "Diabetes",
      dosage: "1 tablet twice daily with meals",
      manufacturer: "DiabeCare",
      prescription: true,
      inStock: true,
      rating: 4.0,
      reviews: 45
    }
  ];

  const categories = ['all', 'Pain Relief', 'Antibiotics', 'Vitamins', 'Digestive Health', 'Allergy', 'Diabetes'];

  // Filter and sort medicines
  const filteredMedicines = medicines
    .filter(medicine => {
      const matchesSearch = medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           medicine.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || medicine.category === activeCategory;
      const matchesPrescription = !showPrescriptionOnly || medicine.prescription;
      const matchesStock = !showInStockOnly || medicine.inStock;
      
      return matchesSearch && matchesCategory && matchesPrescription && matchesStock;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleAddToCart = (medicine: Medicine) => {
    if (!medicine.inStock) {
      Alert.alert('Out of Stock', 'This medicine is currently out of stock.');
      return;
    }
    
    addToCart(medicine);
    Alert.alert('Added to Cart', `${medicine.name} has been added to your cart!`);
  };

  const handleMedicinePress = (medicine: Medicine) => {
    Alert.alert(
      medicine.name,
      `${medicine.description}\n\nDosage: ${medicine.dosage}\nManufacturer: ${medicine.manufacturer}\nPrice: GHS ${medicine.price.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add to Cart', 
          onPress: () => handleAddToCart(medicine),
          style: medicine.inStock ? 'default' : 'disabled'
        }
      ]
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? 'star' : 'star-o'}
          size={12}
          color={i <= rating ? '#f39c12' : '#bdc3c7'}
        />
      );
    }
    return stars;
  };

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
          filteredMedicines.map(medicine => (
            <TouchableOpacity
              key={medicine.id}
              style={styles.medicineCard}
              onPress={() => handleMedicinePress(medicine)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: medicine.image }} style={styles.medicineImage} />
              <View style={styles.medicineInfo}>
                <View style={styles.medicineHeader}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  {medicine.prescription && (
                    <View style={styles.prescriptionBadge}>
                      <FontAwesome name="prescription" size={10} color="#fff" />
                      <Text style={styles.prescriptionText}>Rx</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.medicineDescription}>{medicine.description}</Text>
                <Text style={styles.medicineCategory}>{medicine.category}</Text>
                
                <View style={styles.ratingContainer}>
                  <View style={styles.stars}>
                    {renderStars(medicine.rating)}
                  </View>
                  <Text style={styles.reviewCount}>({medicine.reviews})</Text>
                </View>

                <View style={styles.medicineFooter}>
                  <Text style={styles.medicinePrice}>GHS {medicine.price.toFixed(2)}</Text>
                  <View style={styles.stockStatus}>
                    {medicine.inStock ? (
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
                  !medicine.inStock && styles.addToCartButtonDisabled
                ]}
                onPress={() => handleAddToCart(medicine)}
                disabled={!medicine.inStock}
                activeOpacity={0.7}
              >
                <FontAwesome 
                  name="plus" 
                  size={16} 
                  color={medicine.inStock ? "#fff" : "#95a5a6"} 
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
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