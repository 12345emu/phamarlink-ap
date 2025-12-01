import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { medicinesService } from '../../services/medicinesService';

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');

  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera permissions in your device settings to scan barcodes.',
        [
          { text: 'Cancel', onPress: () => router.back(), style: 'cancel' },
          { text: 'OK', onPress: () => router.back() },
        ]
      );
    }
  }, [permission]);

  // Reset scanned state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      setLoading(false);
    }, [])
  );

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      console.log('📷 Barcode scanned:', { type, data });

      // Search for medicine by barcode
      const searchResult = await medicinesService.getMedicines({
        search: data,
        limit: 10,
      });

      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        const medicine = searchResult.data[0];
        
        const medicineInfo = [
          `Name: ${medicine.name}`,
          medicine.generic_name ? `Generic: ${medicine.generic_name}` : '',
          medicine.category ? `Category: ${medicine.category}` : '',
          medicine.manufacturer ? `Manufacturer: ${medicine.manufacturer}` : '',
          medicine.dosage_form ? `Form: ${medicine.dosage_form}` : '',
          medicine.strength ? `Strength: ${medicine.strength}` : '',
        ].filter(Boolean).join('\n');
        
        Alert.alert(
          'Medicine Found ✓',
          medicineInfo,
          [
            {
              text: 'Add to Inventory',
              onPress: () => {
                router.push({
                  pathname: '/(pharmacist-tabs)/prescriptions',
                  params: { 
                    action: 'add-medicine',
                    medicineId: medicine.id.toString(),
                    barcode: data,
                  },
                } as any);
              },
            },
            {
              text: 'Scan Another',
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert(
          'Medicine Not Found',
          `No medicine found with barcode: ${data}\n\nYou can manually add this medicine to your inventory.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error searching medicine:', error);
      Alert.alert(
        'Error',
        'Failed to search for medicine. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to scan barcodes.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1f3a', '#2d3561']}
          style={styles.permissionContainer}
        >
          <FontAwesome name="camera" size={64} color="#d4af37" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan medicine barcodes.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <LinearGradient
              colors={['#d4af37', '#c9a961']}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={cameraType}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'code93',
            'codabar',
            'itf14',
            'datamatrix',
            'qr',
          ],
        }}
        enableTorch={flashOn}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Barcode</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setFlashOn(!flashOn)}
              >
                <FontAwesome
                  name={flashOn ? 'flash' : 'flash'}
                  size={24}
                  color={flashOn ? '#d4af37' : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')}
              >
                <FontAwesome name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scanning Area */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructionText}>
              Position the barcode within the frame
            </Text>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#d4af37" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            )}
            {!loading && scanned && (
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={() => {
                  setScanned(false);
                  setLoading(false);
                }}
              >
                <LinearGradient
                  colors={['#d4af37', '#c9a961']}
                  style={styles.scanAgainGradient}
                >
                  <FontAwesome name="refresh" size={20} color="#fff" />
                  <Text style={styles.scanAgainText}>Scan Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    borderRadius: 20,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#d4af37',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  instructionText: {
    marginTop: 30,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bottomControls: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  scanAgainButton: {
    width: '100%',
    maxWidth: 300,
  },
  scanAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 10,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 20,
  },
  permissionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
});

