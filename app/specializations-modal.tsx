import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface Specialization {
  id: string;
  name: string;
  category: string;
  description: string;
  yearsOfExperience: number;
  isCertified: boolean;
  certificationDate?: string;
  certificationBody?: string;
}

interface SpecializationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSpecializationsUpdated: () => void;
}

const MEDICAL_SPECIALIZATIONS = [
  // Internal Medicine
  { name: 'Cardiology', category: 'Internal Medicine', description: 'Heart and cardiovascular system' },
  { name: 'Endocrinology', category: 'Internal Medicine', description: 'Hormones and metabolism' },
  { name: 'Gastroenterology', category: 'Internal Medicine', description: 'Digestive system' },
  { name: 'Nephrology', category: 'Internal Medicine', description: 'Kidney diseases' },
  { name: 'Pulmonology', category: 'Internal Medicine', description: 'Lung and respiratory system' },
  { name: 'Rheumatology', category: 'Internal Medicine', description: 'Joint and autoimmune diseases' },
  
  // Surgery
  { name: 'General Surgery', category: 'Surgery', description: 'General surgical procedures' },
  { name: 'Cardiothoracic Surgery', category: 'Surgery', description: 'Heart and chest surgery' },
  { name: 'Neurosurgery', category: 'Surgery', description: 'Brain and nervous system surgery' },
  { name: 'Orthopedic Surgery', category: 'Surgery', description: 'Bone and joint surgery' },
  { name: 'Plastic Surgery', category: 'Surgery', description: 'Reconstructive and cosmetic surgery' },
  { name: 'Urology', category: 'Surgery', description: 'Urinary system surgery' },
  
  // Pediatrics
  { name: 'Pediatric Cardiology', category: 'Pediatrics', description: 'Children\'s heart conditions' },
  { name: 'Pediatric Neurology', category: 'Pediatrics', description: 'Children\'s nervous system' },
  { name: 'Neonatology', category: 'Pediatrics', description: 'Newborn care' },
  { name: 'Pediatric Surgery', category: 'Pediatrics', description: 'Children\'s surgery' },
  
  // Mental Health
  { name: 'Psychiatry', category: 'Mental Health', description: 'Mental health disorders' },
  { name: 'Child Psychiatry', category: 'Mental Health', description: 'Children\'s mental health' },
  { name: 'Addiction Medicine', category: 'Mental Health', description: 'Substance abuse treatment' },
  
  // Emergency Medicine
  { name: 'Emergency Medicine', category: 'Emergency', description: 'Emergency care' },
  { name: 'Critical Care', category: 'Emergency', description: 'Intensive care medicine' },
  { name: 'Trauma Surgery', category: 'Emergency', description: 'Trauma and injury surgery' },
  
  // Other Specializations
  { name: 'Dermatology', category: 'Other', description: 'Skin, hair, and nail conditions' },
  { name: 'Ophthalmology', category: 'Other', description: 'Eye and vision care' },
  { name: 'ENT (Otolaryngology)', category: 'Other', description: 'Ear, nose, and throat' },
  { name: 'Radiology', category: 'Other', description: 'Medical imaging' },
  { name: 'Pathology', category: 'Other', description: 'Disease diagnosis' },
  { name: 'Anesthesiology', category: 'Other', description: 'Pain management and anesthesia' },
  { name: 'Family Medicine', category: 'Other', description: 'Comprehensive family care' },
  { name: 'Geriatrics', category: 'Other', description: 'Elderly care' },
  { name: 'Sports Medicine', category: 'Other', description: 'Sports-related injuries' },
  { name: 'Occupational Medicine', category: 'Other', description: 'Workplace health' },
];

export default function SpecializationsModal({ 
  visible, 
  onClose, 
  onSpecializationsUpdated 
}: SpecializationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSpecialization, setEditingSpecialization] = useState<Specialization | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    yearsOfExperience: 0,
    isCertified: false,
    certificationDate: '',
    certificationBody: '',
  });

  const categories = ['All', 'Internal Medicine', 'Surgery', 'Pediatrics', 'Mental Health', 'Emergency', 'Other'];

  // Load specializations when modal opens
  useEffect(() => {
    if (visible) {
      loadSpecializations();
    }
  }, [visible]);

  const loadSpecializations = async () => {
    setLoading(true);
    try {
      // TODO: Load from backend/AsyncStorage
      console.log('🔍 SpecializationsModal - Loading specializations...');
      // For now, using sample data
      setSpecializations([
        {
          id: '1',
          name: 'Cardiology',
          category: 'Internal Medicine',
          description: 'Heart and cardiovascular system',
          yearsOfExperience: 5,
          isCertified: true,
          certificationDate: '2020-01-15',
          certificationBody: 'American Board of Internal Medicine',
        },
        {
          id: '2',
          name: 'General Surgery',
          category: 'Surgery',
          description: 'General surgical procedures',
          yearsOfExperience: 8,
          isCertified: true,
          certificationDate: '2018-06-20',
          certificationBody: 'American Board of Surgery',
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('❌ SpecializationsModal - Error loading specializations:', error);
      setLoading(false);
    }
  };

  const filteredSpecializations = MEDICAL_SPECIALIZATIONS.filter(spec => {
    const matchesSearch = spec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         spec.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || spec.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddSpecialization = (spec: typeof MEDICAL_SPECIALIZATIONS[0]) => {
    setFormData({
      name: spec.name,
      category: spec.category,
      description: spec.description,
      yearsOfExperience: 0,
      isCertified: false,
      certificationDate: '',
      certificationBody: '',
    });
    setEditingSpecialization(null);
    setShowAddForm(true);
  };

  const handleEditSpecialization = (specialization: Specialization) => {
    setFormData({
      name: specialization.name,
      category: specialization.category,
      description: specialization.description,
      yearsOfExperience: specialization.yearsOfExperience,
      isCertified: specialization.isCertified,
      certificationDate: specialization.certificationDate || '',
      certificationBody: specialization.certificationBody || '',
    });
    setEditingSpecialization(specialization);
    setShowAddForm(true);
  };

  const handleSaveSpecialization = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a specialization name');
      return;
    }

    setSaving(true);
    try {
      const newSpecialization: Specialization = {
        id: editingSpecialization?.id || Date.now().toString(),
        name: formData.name,
        category: formData.category,
        description: formData.description,
        yearsOfExperience: formData.yearsOfExperience,
        isCertified: formData.isCertified,
        certificationDate: formData.certificationDate || undefined,
        certificationBody: formData.certificationBody || undefined,
      };

      if (editingSpecialization) {
        // Update existing
        setSpecializations(prev => 
          prev.map(spec => spec.id === editingSpecialization.id ? newSpecialization : spec)
        );
      } else {
        // Add new
        setSpecializations(prev => [...prev, newSpecialization]);
      }

      setShowAddForm(false);
      setFormData({
        name: '',
        category: '',
        description: '',
        yearsOfExperience: 0,
        isCertified: false,
        certificationDate: '',
        certificationBody: '',
      });
      setEditingSpecialization(null);
    } catch (error) {
      console.error('❌ SpecializationsModal - Error saving specialization:', error);
      Alert.alert('Error', 'Failed to save specialization. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpecialization = (id: string) => {
    Alert.alert(
      'Delete Specialization',
      'Are you sure you want to delete this specialization?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSpecializations(prev => prev.filter(spec => spec.id !== id));
          }
        }
      ]
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      console.log('🔍 SpecializationsModal - Saving all specializations:', specializations);
      
      // TODO: Save to backend
      // await saveSpecializations(specializations);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Specializations updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            onSpecializationsUpdated();
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('❌ SpecializationsModal - Error saving specializations:', error);
      Alert.alert('Error', 'Failed to save specializations. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderSpecializationItem = ({ item }: { item: typeof MEDICAL_SPECIALIZATIONS[0] }) => (
    <TouchableOpacity
      style={styles.specializationItem}
      onPress={() => handleAddSpecialization(item)}
    >
      <View style={styles.specializationInfo}>
        <Text style={styles.specializationName}>{item.name}</Text>
        <Text style={styles.specializationCategory}>{item.category}</Text>
        <Text style={styles.specializationDescription}>{item.description}</Text>
      </View>
      <View style={styles.addButton}>
        <FontAwesome name="plus" size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  const renderMySpecialization = (specialization: Specialization) => (
    <View key={specialization.id} style={styles.mySpecializationItem}>
      <View style={styles.mySpecializationInfo}>
        <Text style={styles.mySpecializationName}>{specialization.name}</Text>
        <Text style={styles.mySpecializationCategory}>{specialization.category}</Text>
        <View style={styles.mySpecializationDetails}>
          <Text style={styles.mySpecializationDetail}>
            {specialization.yearsOfExperience} years experience
          </Text>
          {specialization.isCertified && (
            <Text style={styles.certificationText}>
              ✓ Certified {specialization.certificationBody}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.mySpecializationActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditSpecialization(specialization)}
        >
          <FontAwesome name="edit" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteSpecialization(specialization.id)}
        >
          <FontAwesome name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading specializations...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#3498db', '#2980b9']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Medical Specializations</Text>
            <TouchableOpacity 
              onPress={handleSaveAll} 
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {showAddForm ? (
          <ScrollView style={styles.content}>
            <Text style={styles.formTitle}>
              {editingSpecialization ? 'Edit Specialization' : 'Add Specialization'}
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Specialization Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="Enter specialization name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.category}
                onChangeText={(value) => setFormData(prev => ({ ...prev, category: value }))}
                placeholder="Enter category"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Enter description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Years of Experience</Text>
              <TextInput
                style={styles.formInput}
                value={formData.yearsOfExperience.toString()}
                onChangeText={(value) => setFormData(prev => ({ ...prev, yearsOfExperience: parseInt(value) || 0 }))}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Certification Details</Text>
              <TextInput
                style={styles.formInput}
                value={formData.certificationBody}
                onChangeText={(value) => setFormData(prev => ({ ...prev, certificationBody: value }))}
                placeholder="Certification body (e.g., American Board of Medicine)"
              />
              <TextInput
                style={styles.formInput}
                value={formData.certificationDate}
                onChangeText={(value) => setFormData(prev => ({ ...prev, certificationDate: value }))}
                placeholder="Certification date (YYYY-MM-DD)"
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveFormButton}
                onPress={handleSaveSpecialization}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveFormButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* My Specializations */}
            <Text style={styles.sectionTitle}>My Specializations ({specializations.length})</Text>
            <View style={styles.mySpecializationsContainer}>
              {specializations.map(renderMySpecialization)}
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <FontAwesome name="search" size={16} color="#95a5a6" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search specializations..."
                  placeholderTextColor="#95a5a6"
                />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.activeCategoryChip
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.activeCategoryChipText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Available Specializations */}
            <Text style={styles.sectionTitle}>Available Specializations</Text>
            <View style={styles.specializationsList}>
              {filteredSpecializations.map((item, index) => (
                <View key={item.name}>
                  {renderSpecializationItem({ item })}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  mySpecializationsContainer: {
    marginBottom: 8,
  },
  mySpecializationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
  },
  mySpecializationInfo: {
    flex: 1,
  },
  mySpecializationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  mySpecializationCategory: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  mySpecializationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mySpecializationDetail: {
    fontSize: 12,
    color: '#95a5a6',
    marginRight: 12,
  },
  certificationText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  mySpecializationActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginLeft: 12,
    paddingTop: 1,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: 20,
    paddingVertical: 15,
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
    marginBottom: 30,
    paddingVertical: 0,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    height: 36,
    justifyContent: 'center',
  },
  activeCategoryChip: {
    backgroundColor: '#3498db',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeCategoryChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  specializationsList: {
    marginBottom: 20,
  },
  specializationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  specializationInfo: {
    flex: 1,
  },
  specializationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
  },
  specializationCategory: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specializationDescription: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
    backgroundColor: '#fff',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  saveFormButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3498db',
    marginLeft: 8,
    alignItems: 'center',
  },
  saveFormButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
