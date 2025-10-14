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

interface HospitalAffiliation {
  id: string;
  hospitalName: string;
  hospitalType: string;
  location: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface HospitalAffiliationsModalProps {
  visible: boolean;
  onClose: () => void;
  onAffiliationsUpdated: () => void;
}

const HOSPITAL_TYPES = [
  'General Hospital',
  'Specialty Hospital',
  'Teaching Hospital',
  'Research Hospital',
  'Private Hospital',
  'Public Hospital',
  'Community Hospital',
  'Rehabilitation Hospital',
  'Mental Health Hospital',
  'Children\'s Hospital',
  'Women\'s Hospital',
  'Trauma Center',
  'Cancer Center',
  'Cardiac Center',
  'Neurological Center',
];

const SAMPLE_HOSPITALS = [
  { name: 'Mayo Clinic', type: 'Research Hospital', location: 'Rochester, MN' },
  { name: 'Johns Hopkins Hospital', type: 'Teaching Hospital', location: 'Baltimore, MD' },
  { name: 'Cleveland Clinic', type: 'Specialty Hospital', location: 'Cleveland, OH' },
  { name: 'Massachusetts General Hospital', type: 'Teaching Hospital', location: 'Boston, MA' },
  { name: 'UCLA Medical Center', type: 'Teaching Hospital', location: 'Los Angeles, CA' },
  { name: 'Mount Sinai Hospital', type: 'Teaching Hospital', location: 'New York, NY' },
  { name: 'Stanford Health Care', type: 'Teaching Hospital', location: 'Stanford, CA' },
  { name: 'Northwestern Memorial Hospital', type: 'Teaching Hospital', location: 'Chicago, IL' },
  { name: 'Cedars-Sinai Medical Center', type: 'Private Hospital', location: 'Los Angeles, CA' },
  { name: 'NewYork-Presbyterian Hospital', type: 'Teaching Hospital', location: 'New York, NY' },
  { name: 'Brigham and Women\'s Hospital', type: 'Teaching Hospital', location: 'Boston, MA' },
  { name: 'Duke University Hospital', type: 'Teaching Hospital', location: 'Durham, NC' },
  { name: 'University of Michigan Hospitals', type: 'Teaching Hospital', location: 'Ann Arbor, MI' },
  { name: 'Barnes-Jewish Hospital', type: 'Teaching Hospital', location: 'St. Louis, MO' },
  { name: 'UCSF Medical Center', type: 'Teaching Hospital', location: 'San Francisco, CA' },
];

export default function HospitalAffiliationsModal({ 
  visible, 
  onClose, 
  onAffiliationsUpdated 
}: HospitalAffiliationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [affiliations, setAffiliations] = useState<HospitalAffiliation[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState<HospitalAffiliation | null>(null);
  
  const [formData, setFormData] = useState({
    hospitalName: '',
    hospitalType: '',
    location: '',
    position: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  });

  const types = ['All', ...HOSPITAL_TYPES];

  // Load affiliations when modal opens
  useEffect(() => {
    if (visible) {
      loadAffiliations();
    }
  }, [visible]);

  const loadAffiliations = async () => {
    setLoading(true);
    try {
      // TODO: Load from backend/AsyncStorage
      console.log('🔍 HospitalAffiliationsModal - Loading affiliations...');
      // For now, using sample data
      setAffiliations([
        {
          id: '1',
          hospitalName: 'Mayo Clinic',
          hospitalType: 'Research Hospital',
          location: 'Rochester, MN',
          position: 'Senior Cardiologist',
          startDate: '2020-01-15',
          isCurrent: true,
          description: 'Leading cardiology department with focus on interventional procedures',
          contactPerson: 'Dr. Sarah Johnson',
          contactPhone: '+1-507-266-2000',
          contactEmail: 'sarah.johnson@mayo.edu',
        },
        {
          id: '2',
          hospitalName: 'Johns Hopkins Hospital',
          hospitalType: 'Teaching Hospital',
          location: 'Baltimore, MD',
          position: 'Attending Physician',
          startDate: '2018-06-01',
          endDate: '2019-12-31',
          isCurrent: false,
          description: 'Teaching and clinical practice in internal medicine',
          contactPerson: 'Dr. Michael Chen',
          contactPhone: '+1-410-955-5000',
          contactEmail: 'mchen@jhmi.edu',
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('❌ HospitalAffiliationsModal - Error loading affiliations:', error);
      setLoading(false);
    }
  };

  const filteredHospitals = SAMPLE_HOSPITALS.filter(hospital => {
    const matchesSearch = hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hospital.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || hospital.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleAddHospital = (hospital: typeof SAMPLE_HOSPITALS[0]) => {
    setFormData({
      hospitalName: hospital.name,
      hospitalType: hospital.type,
      location: hospital.location,
      position: '',
      startDate: '',
      endDate: '',
      isCurrent: true,
      description: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
    });
    setEditingAffiliation(null);
    setShowAddForm(true);
  };

  const handleEditAffiliation = (affiliation: HospitalAffiliation) => {
    setFormData({
      hospitalName: affiliation.hospitalName,
      hospitalType: affiliation.hospitalType,
      location: affiliation.location,
      position: affiliation.position,
      startDate: affiliation.startDate,
      endDate: affiliation.endDate || '',
      isCurrent: affiliation.isCurrent,
      description: affiliation.description,
      contactPerson: affiliation.contactPerson || '',
      contactPhone: affiliation.contactPhone || '',
      contactEmail: affiliation.contactEmail || '',
    });
    setEditingAffiliation(affiliation);
    setShowAddForm(true);
  };

  const handleSaveAffiliation = async () => {
    if (!formData.hospitalName.trim()) {
      Alert.alert('Error', 'Please enter a hospital name');
      return;
    }

    if (!formData.position.trim()) {
      Alert.alert('Error', 'Please enter your position');
      return;
    }

    if (!formData.startDate.trim()) {
      Alert.alert('Error', 'Please enter start date');
      return;
    }

    setSaving(true);
    try {
      const newAffiliation: HospitalAffiliation = {
        id: editingAffiliation?.id || Date.now().toString(),
        hospitalName: formData.hospitalName,
        hospitalType: formData.hospitalType,
        location: formData.location,
        position: formData.position,
        startDate: formData.startDate,
        endDate: formData.isCurrent ? undefined : formData.endDate,
        isCurrent: formData.isCurrent,
        description: formData.description,
        contactPerson: formData.contactPerson || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactEmail: formData.contactEmail || undefined,
      };

      if (editingAffiliation) {
        // Update existing
        setAffiliations(prev => 
          prev.map(aff => aff.id === editingAffiliation.id ? newAffiliation : aff)
        );
      } else {
        // Add new
        setAffiliations(prev => [...prev, newAffiliation]);
      }

      setShowAddForm(false);
      setFormData({
        hospitalName: '',
        hospitalType: '',
        location: '',
        position: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
      });
      setEditingAffiliation(null);
    } catch (error) {
      console.error('❌ HospitalAffiliationsModal - Error saving affiliation:', error);
      Alert.alert('Error', 'Failed to save affiliation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAffiliation = (id: string) => {
    Alert.alert(
      'Delete Affiliation',
      'Are you sure you want to delete this hospital affiliation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAffiliations(prev => prev.filter(aff => aff.id !== id));
          }
        }
      ]
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      console.log('🔍 HospitalAffiliationsModal - Saving all affiliations:', affiliations);
      
      // TODO: Save to backend
      // await saveAffiliations(affiliations);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Hospital affiliations updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            onAffiliationsUpdated();
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('❌ HospitalAffiliationsModal - Error saving affiliations:', error);
      Alert.alert('Error', 'Failed to save affiliations. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderHospitalItem = ({ item }: { item: typeof SAMPLE_HOSPITALS[0] }) => (
    <TouchableOpacity
      style={styles.hospitalItem}
      onPress={() => handleAddHospital(item)}
    >
      <View style={styles.hospitalInfo}>
        <Text style={styles.hospitalName}>{item.name}</Text>
        <Text style={styles.hospitalType}>{item.type}</Text>
        <Text style={styles.hospitalLocation}>{item.location}</Text>
      </View>
      <View style={styles.addButton}>
        <FontAwesome name="plus" size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  const renderMyAffiliation = (affiliation: HospitalAffiliation) => (
    <View key={affiliation.id} style={styles.myAffiliationItem}>
      <View style={styles.myAffiliationInfo}>
        <Text style={styles.myAffiliationName}>{affiliation.hospitalName}</Text>
        <Text style={styles.myAffiliationType}>{affiliation.hospitalType}</Text>
        <Text style={styles.myAffiliationLocation}>{affiliation.location}</Text>
        <View style={styles.myAffiliationDetails}>
          <Text style={styles.myAffiliationPosition}>{affiliation.position}</Text>
          <Text style={styles.myAffiliationDates}>
            {affiliation.startDate} - {affiliation.isCurrent ? 'Present' : affiliation.endDate}
          </Text>
        </View>
        {affiliation.isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>
      <View style={styles.myAffiliationActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditAffiliation(affiliation)}
        >
          <FontAwesome name="edit" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteAffiliation(affiliation.id)}
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
          <Text style={styles.loadingText}>Loading hospital affiliations...</Text>
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
            <Text style={styles.headerTitle}>Hospital Affiliations</Text>
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
              {editingAffiliation ? 'Edit Hospital Affiliation' : 'Add Hospital Affiliation'}
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hospital Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.hospitalName}
                onChangeText={(value) => setFormData(prev => ({ ...prev, hospitalName: value }))}
                placeholder="Enter hospital name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hospital Type *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.hospitalType}
                onChangeText={(value) => setFormData(prev => ({ ...prev, hospitalType: value }))}
                placeholder="Enter hospital type"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.location}
                onChangeText={(value) => setFormData(prev => ({ ...prev, location: value }))}
                placeholder="Enter hospital location"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Your Position *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.position}
                onChangeText={(value) => setFormData(prev => ({ ...prev, position: value }))}
                placeholder="Enter your position/title"
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Start Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.startDate}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>End Date</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.endDate}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
                  placeholder="YYYY-MM-DD"
                  editable={!formData.isCurrent}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Describe your role and responsibilities"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Information</Text>
              <TextInput
                style={styles.formInput}
                value={formData.contactPerson}
                onChangeText={(value) => setFormData(prev => ({ ...prev, contactPerson: value }))}
                placeholder="Contact person name"
              />
              <TextInput
                style={styles.formInput}
                value={formData.contactPhone}
                onChangeText={(value) => setFormData(prev => ({ ...prev, contactPhone: value }))}
                placeholder="Contact phone number"
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.formInput}
                value={formData.contactEmail}
                onChangeText={(value) => setFormData(prev => ({ ...prev, contactEmail: value }))}
                placeholder="Contact email"
                keyboardType="email-address"
                autoCapitalize="none"
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
                onPress={handleSaveAffiliation}
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
            {/* My Affiliations */}
            <Text style={styles.sectionTitle}>My Hospital Affiliations ({affiliations.length})</Text>
            <View style={styles.myAffiliationsContainer}>
              {affiliations.map(renderMyAffiliation)}
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <FontAwesome name="search" size={16} color="#95a5a6" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search hospitals..."
                  placeholderTextColor="#95a5a6"
                />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
              {types.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    selectedType === type && styles.activeTypeChip
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[
                    styles.typeChipText,
                    selectedType === type && styles.activeTypeChipText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Available Hospitals */}
            <Text style={styles.sectionTitle}>Available Hospitals</Text>
            <View style={styles.hospitalsList}>
              {filteredHospitals.map((item, index) => (
                <View key={item.name}>
                  {renderHospitalItem({ item })}
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
  myAffiliationsContainer: {
    marginBottom: 8,
  },
  myAffiliationItem: {
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
    minHeight: 100,
  },
  myAffiliationInfo: {
    flex: 1,
  },
  myAffiliationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  myAffiliationType: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myAffiliationLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  myAffiliationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  myAffiliationPosition: {
    fontSize: 12,
    color: '#95a5a6',
    marginRight: 12,
    fontWeight: '500',
  },
  myAffiliationDates: {
    fontSize: 12,
    color: '#95a5a6',
  },
  currentBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  myAffiliationActions: {
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
  typeContainer: {
    marginBottom: 8,
    paddingVertical: 0,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 6,
    alignItems: 'center',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    height: 36,
    justifyContent: 'center',
  },
  activeTypeChip: {
    backgroundColor: '#3498db',
  },
  typeChipText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTypeChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  hospitalsList: {
    marginBottom: 20,
  },
  hospitalItem: {
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
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
  },
  hospitalType: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hospitalLocation: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
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
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
    marginRight: 10,
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
});
