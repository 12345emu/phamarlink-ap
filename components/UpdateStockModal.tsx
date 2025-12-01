import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { pharmacistInventoryService } from '../services/pharmacistInventoryService';

interface UpdateStockModalProps {
  visible: boolean;
  medicine: {
    id?: number;
    medicine_id?: number;
    name: string;
    pharmacy_medicine_id: number;
    stock_quantity: number;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateStockModal({
  visible,
  medicine,
  onClose,
  onSuccess,
}: UpdateStockModalProps) {
  const [operation, setOperation] = useState<'set' | 'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && medicine) {
      setQuantity('');
      setOperation('add');
    }
  }, [visible, medicine]);

  const handleUpdate = async () => {
    if (!medicine) return;

    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);

      let finalQuantity: number;
      if (operation === 'set') {
        finalQuantity = parseInt(quantity);
      } else if (operation === 'add') {
        finalQuantity = medicine.stock_quantity + parseInt(quantity);
      } else {
        // subtract
        finalQuantity = medicine.stock_quantity - parseInt(quantity);
        if (finalQuantity < 0) {
          Alert.alert('Error', 'Cannot subtract more than current stock');
          setLoading(false);
          return;
        }
      }

      const response = await pharmacistInventoryService.updateStock(
        medicine.pharmacy_medicine_id,
        finalQuantity,
        'set'
      );

      if (response.success) {
        Alert.alert('Success', 'Stock updated successfully!', [
          { text: 'OK', onPress: () => {
            onSuccess();
            onClose();
          }},
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !medicine) return null;

  const getNewQuantity = () => {
    if (!quantity || isNaN(parseInt(quantity))) return medicine.stock_quantity;
    const qty = parseInt(quantity);
    if (operation === 'set') return qty;
    if (operation === 'add') return medicine.stock_quantity + qty;
    return Math.max(0, medicine.stock_quantity - qty);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Update Stock</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.updateButton, loading && styles.updateButtonDisabled]}
                onPress={handleUpdate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="check" size={14} color="#fff" />
                    <Text style={styles.updateButtonText}>Update</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <FontAwesome name="times" size={24} color="#1a1f3a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Medicine Info */}
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <View style={styles.currentStockContainer}>
              <Text style={styles.currentStockLabel}>Current Stock:</Text>
              <Text style={styles.currentStockValue}>{medicine.stock_quantity} units</Text>
            </View>
          </View>

          {/* Operation Selection */}
          <View style={styles.operationContainer}>
            <Text style={styles.sectionTitle}>Operation</Text>
            <View style={styles.operationButtons}>
              <TouchableOpacity
                style={[styles.operationButton, operation === 'set' && styles.operationButtonActive]}
                onPress={() => {
                  setOperation('set');
                  setQuantity('');
                }}
              >
                <FontAwesome 
                  name="edit" 
                  size={16} 
                  color={operation === 'set' ? '#fff' : '#7a7a7a'} 
                />
                <Text style={[
                  styles.operationButtonText,
                  operation === 'set' && styles.operationButtonTextActive
                ]}>
                  Set Quantity
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.operationButton, operation === 'add' && styles.operationButtonActive]}
                onPress={() => {
                  setOperation('add');
                  setQuantity('');
                }}
              >
                <FontAwesome 
                  name="plus" 
                  size={16} 
                  color={operation === 'add' ? '#fff' : '#7a7a7a'} 
                />
                <Text style={[
                  styles.operationButtonText,
                  operation === 'add' && styles.operationButtonTextActive
                ]}>
                  Add Stock
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.operationButton, operation === 'subtract' && styles.operationButtonActive]}
                onPress={() => {
                  setOperation('subtract');
                  setQuantity('');
                }}
              >
                <FontAwesome 
                  name="minus" 
                  size={16} 
                  color={operation === 'subtract' ? '#fff' : '#7a7a7a'} 
                />
                <Text style={[
                  styles.operationButtonText,
                  operation === 'subtract' && styles.operationButtonTextActive
                ]}>
                  Remove Stock
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quantity Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {operation === 'set' ? 'New Quantity' : operation === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter ${operation === 'set' ? 'new' : operation === 'add' ? 'amount to add' : 'amount to remove'}`}
              placeholderTextColor="#95a5a6"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>

          {/* Preview */}
          {quantity && !isNaN(parseInt(quantity)) && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>New Stock Will Be:</Text>
              <Text style={styles.previewValue}>{getNewQuantity()} units</Text>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1f3a',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineInfo: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 12,
  },
  currentStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentStockLabel: {
    fontSize: 14,
    color: '#7a7a7a',
  },
  currentStockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  operationContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f3a',
    marginBottom: 12,
  },
  operationButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  operationButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  operationButtonActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  operationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  operationButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewContainer: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  previewLabel: {
    fontSize: 14,
    color: '#7a7a7a',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#d4af37',
    gap: 6,
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

