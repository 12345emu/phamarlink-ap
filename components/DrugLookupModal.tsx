import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { medicinesService } from '../services/medicinesService';
import { API_CONFIG } from '../constants/API';

const STATIC_BASE_URL = API_CONFIG.BASE_URL.replace('/api', '');

interface Medicine {
  id: number;
  name: string;
  generic_name?: string;
  brand_name?: string;
  description?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  manufacturer?: string;
  prescription_required?: boolean;
  image?: string;
  active_ingredients?: string;
  side_effects?: string;
  contraindications?: string;
  dosage_instructions?: string;
  storage_conditions?: string;
  expiry_information?: string;
  interactions?: string;
}

interface DrugLookupModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DrugLookupModal({ visible, onClose }: DrugLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setMedicines([]);
      setSelectedMedicine(null);
    }
  }, [visible]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchMedicines();
      }, 500);
      setSearchTimeout(timeout);
    } else {
      setMedicines([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const searchMedicines = async () => {
    if (!searchQuery.trim()) {
      setMedicines([]);
      return;
    }

    try {
      setLoading(true);
      const response = await medicinesService.getMedicines({
        search: searchQuery.trim(),
        limit: 20,
        page: 1,
      });

      if (response.success && response.data) {
        setMedicines(Array.isArray(response.data) ? response.data : []);
      } else {
        setMedicines([]);
      }
    } catch (error) {
      console.error('Error searching medicines:', error);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedicine = async (medicine: Medicine) => {
    try {
      setLoading(true);
      // Fetch full medicine details
      const response = await medicinesService.getMedicineById(medicine.id.toString());
      
      if (response.success && response.data) {
        setSelectedMedicine(response.data as Medicine);
      } else {
        setSelectedMedicine(medicine);
      }
    } catch (error) {
      console.error('Error fetching medicine details:', error);
      setSelectedMedicine(medicine);
    } finally {
      setLoading(false);
    }
  };

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${STATIC_BASE_URL}${url}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Drug Lookup</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <FontAwesome name="search" size={18} color="#7f8c8d" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by drug name, generic name, or brand..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#bdc3c7"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <FontAwesome name="times" size={16} color="#7f8c8d" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {selectedMedicine ? (
          /* Medicine Details View */
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedMedicine(null)}
            >
              <FontAwesome name="arrow-left" size={16} color="#d4af37" />
              <Text style={styles.backButtonText}>Back to Search</Text>
            </TouchableOpacity>

            {/* Medicine Image */}
            {selectedMedicine.image && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: normalizeImageUrl(selectedMedicine.image) || '' }}
                  style={styles.medicineImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Medicine Name */}
            <View style={styles.detailSection}>
              <Text style={styles.medicineName}>{selectedMedicine.name}</Text>
              {selectedMedicine.generic_name && (
                <Text style={styles.genericName}>
                  Generic: {selectedMedicine.generic_name}
                </Text>
              )}
              {selectedMedicine.brand_name && (
                <Text style={styles.brandName}>
                  Brand: {selectedMedicine.brand_name}
                </Text>
              )}
            </View>

            {/* Basic Info */}
            <View style={styles.detailSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category:</Text>
                <Text style={styles.infoValue}>
                  {selectedMedicine.category || 'N/A'}
                </Text>
              </View>
              {selectedMedicine.manufacturer && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Manufacturer:</Text>
                  <Text style={styles.infoValue}>
                    {selectedMedicine.manufacturer}
                  </Text>
                </View>
              )}
              {selectedMedicine.dosage_form && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dosage Form:</Text>
                  <Text style={styles.infoValue}>
                    {selectedMedicine.dosage_form}
                  </Text>
                </View>
              )}
              {selectedMedicine.strength && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Strength:</Text>
                  <Text style={styles.infoValue}>
                    {selectedMedicine.strength}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prescription Required:</Text>
                <View style={[
                  styles.prescriptionBadge,
                  { backgroundColor: selectedMedicine.prescription_required ? '#e74c3c' : '#27ae60' }
                ]}>
                  <Text style={styles.prescriptionText}>
                    {selectedMedicine.prescription_required ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            {selectedMedicine.description && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.description}
                </Text>
              </View>
            )}

            {/* Active Ingredients */}
            {selectedMedicine.active_ingredients && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Active Ingredients</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.active_ingredients}
                </Text>
              </View>
            )}

            {/* Dosage Instructions */}
            {selectedMedicine.dosage_instructions && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Dosage Instructions</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.dosage_instructions}
                </Text>
              </View>
            )}

            {/* Side Effects */}
            {selectedMedicine.side_effects && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Side Effects</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.side_effects}
                </Text>
              </View>
            )}

            {/* Contraindications */}
            {selectedMedicine.contraindications && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Contraindications</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.contraindications}
                </Text>
              </View>
            )}

            {/* Drug Interactions */}
            {selectedMedicine.interactions && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Drug Interactions</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.interactions}
                </Text>
              </View>
            )}

            {/* Storage Conditions */}
            {selectedMedicine.storage_conditions && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Storage Conditions</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.storage_conditions}
                </Text>
              </View>
            )}

            {/* Expiry Information */}
            {selectedMedicine.expiry_information && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Expiry Information</Text>
                <Text style={styles.sectionContent}>
                  {selectedMedicine.expiry_information}
                </Text>
              </View>
            )}

            <View style={styles.bottomSpacing} />
          </ScrollView>
        ) : (
          /* Search Results View */
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && medicines.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#d4af37" />
                <Text style={styles.loadingText}>Searching medicines...</Text>
              </View>
            ) : searchQuery.trim().length < 2 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="search" size={60} color="#bdc3c7" />
                <Text style={styles.emptyTitle}>Search for Medicines</Text>
                <Text style={styles.emptySubtitle}>
                  Enter at least 2 characters to search for drugs by name, generic name, or brand
                </Text>
              </View>
            ) : medicines.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="medkit" size={60} color="#bdc3c7" />
                <Text style={styles.emptyTitle}>No medicines found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search terms or check spelling
                </Text>
              </View>
            ) : (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsHeader}>
                  {medicines.length} {medicines.length === 1 ? 'result' : 'results'} found
                </Text>
                {medicines.map((medicine) => (
                  <TouchableOpacity
                    key={medicine.id}
                    style={styles.medicineCard}
                    onPress={() => handleSelectMedicine(medicine)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.medicineCardContent}>
                      {medicine.image && (
                        <Image
                          source={{ uri: normalizeImageUrl(medicine.image) || '' }}
                          style={styles.medicineThumbnail}
                        />
                      )}
                      <View style={styles.medicineInfo}>
                        <Text style={styles.medicineCardName}>{medicine.name}</Text>
                        {medicine.generic_name && (
                          <Text style={styles.medicineCardGeneric}>
                            {medicine.generic_name}
                          </Text>
                        )}
                        <View style={styles.medicineCardMeta}>
                          {medicine.category && (
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipText}>
                                {medicine.category}
                              </Text>
                            </View>
                          )}
                          {medicine.prescription_required && (
                            <View style={[styles.metaChip, styles.prescriptionChip]}>
                              <FontAwesome name="lock" size={10} color="#e74c3c" />
                              <Text style={[styles.metaChipText, { color: '#e74c3c', marginLeft: 4 }]}>
                                Rx Required
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsHeader: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    fontWeight: '500',
  },
  medicineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  medicineCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  medicineThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f8f9fa',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicineCardGeneric: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  medicineCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prescriptionChip: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
  },
  metaChipText: {
    fontSize: 12,
    color: '#5a5a5a',
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: '600',
    marginLeft: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineImage: {
    width: 200,
    height: 200,
  },
  detailSection: {
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
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  genericName: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  prescriptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prescriptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    color: '#5a5a5a',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 20,
  },
});

