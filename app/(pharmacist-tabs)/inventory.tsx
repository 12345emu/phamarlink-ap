import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { pharmacistInventoryService, InventoryMedicine, InventoryStats } from '../../services/pharmacistInventoryService';
import { medicinesService } from '../../services/medicinesService';
import AddMedicineModal from '../../components/AddMedicineToInventoryModal';
import UpdateStockModal from '../../components/UpdateStockModal';

const { width } = Dimensions.get('window');

export default function InventoryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<InventoryMedicine[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<InventoryMedicine | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadInventory();
    loadStats();
  }, []); // Load once on mount, filters are applied client-side

  // Reload when search query changes (debounced)
  useEffect(() => {
    if (searchQuery === '') {
      // If search is cleared, reload to show all
      loadInventory();
    }
  }, [searchQuery]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      // Load all inventory - we'll filter on the frontend for better UX
      const response = await pharmacistInventoryService.getInventory();

      if (response.success && response.data) {
        setInventory(response.data);
      } else {
        setInventory([]);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await pharmacistInventoryService.getInventoryStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadInventory(), loadStats()]);
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadInventory();
  };

  const getStockStatus = (quantity: number): { status: string; color: string; label: string } => {
    if (quantity === 0) return { status: 'out', color: '#e74c3c', label: 'Out of Stock' };
    if (quantity <= 10) return { status: 'low', color: '#f39c12', label: 'Low Stock' };
    return { status: 'ok', color: '#2ecc71', label: 'In Stock' };
  };

  const categories = stats?.categories || [];
  const allCategories = ['all', ...categories.map(c => c.category)];

  const filteredInventory = inventory.filter(med => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        med.name.toLowerCase().includes(searchLower) ||
        med.generic_name?.toLowerCase().includes(searchLower) ||
        med.manufacturer?.toLowerCase().includes(searchLower);
      if (!matchesSearch) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && med.category !== selectedCategory) {
      return false;
    }

    // Stock status filter
    if (filter === 'low_stock') {
      if (med.stock_quantity > 10 || med.stock_quantity === 0) {
        return false;
      }
    } else if (filter === 'out_of_stock') {
      if (med.stock_quantity > 0) {
        return false;
      }
    }
    // filter === 'all' shows everything, so no filtering needed

    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1f3a', '#2d3561']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Inventory Management</Text>
            <Text style={styles.headerSubtitle}>
              {stats ? `${stats.totalMedicines} medicines` : 'Loading...'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <LinearGradient
              colors={['#d4af37', '#c9a961']}
              style={styles.addButtonGradient}
            >
              <FontAwesome name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#b8941f', '#a0823d']}
                  style={styles.statGradient}
                >
                  <FontAwesome name="medkit" size={18} color="#fff" />
                  <Text style={styles.statNumber}>{stats.totalMedicines}</Text>
                  <Text style={styles.statLabel}>Total Items</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#27ae60', '#229954']}
                  style={styles.statGradient}
                >
                  <FontAwesome name="money" size={18} color="#fff" />
                  <Text style={styles.statNumber}>₵{stats.totalStockValue.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Stock Value</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#d68910', '#b9770e']}
                  style={styles.statGradient}
                >
                  <FontAwesome name="exclamation-triangle" size={18} color="#fff" />
                  <Text style={styles.statNumber}>{stats.lowStockItems}</Text>
                  <Text style={styles.statLabel}>Low Stock</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#c0392b', '#a93226']}
                  style={styles.statGradient}
                >
                  <FontAwesome name="times-circle" size={18} color="#fff" />
                  <Text style={styles.statNumber}>{stats.outOfStockItems}</Text>
                  <Text style={styles.statLabel}>Out of Stock</Text>
                </LinearGradient>
              </View>
            </ScrollView>
          </View>
        )}

      {/* Search and Filters Toggle Button */}
      <View style={styles.filterToggleContainer}>
        <TouchableOpacity
          style={styles.filterToggleButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <LinearGradient
            colors={showFilters ? ['#5a4fcf', '#4a3fbf'] : ['#f8f9fb', '#e8e9eb']}
            style={styles.filterToggleGradient}
          >
            <FontAwesome 
              name={showFilters ? "times" : "filter"} 
              size={18} 
              color={showFilters ? "#fff" : "#1a1f3a"} 
            />
            <Text style={[
              styles.filterToggleText,
              showFilters && styles.filterToggleTextActive
            ]}>
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Text>
            {(searchQuery || filter !== 'all' || selectedCategory !== 'all') && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {[searchQuery ? 1 : 0, filter !== 'all' ? 1 : 0, selectedCategory !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search and Filters - Collapsible */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={18} color="#95a5a6" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines..."
              placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                loadInventory();
              }}>
                <FontAwesome name="times-circle" size={18} color="#95a5a6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'low_stock' && styles.activeFilterTab]}
                onPress={() => setFilter('low_stock')}
              >
                <Text style={[styles.filterTabText, filter === 'low_stock' && styles.activeFilterTabText]}>
                  Low Stock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'out_of_stock' && styles.activeFilterTab]}
                onPress={() => setFilter('out_of_stock')}
              >
                <Text style={[styles.filterTabText, filter === 'out_of_stock' && styles.activeFilterTabText]}>
                  Out of Stock
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Category Filter */}
          {categories.length > 0 && (
            <View style={styles.categoryContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {allCategories.map((category) => (
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
                      {category === 'all' ? 'All Categories' : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Inventory List */}
      <ScrollView
        style={styles.inventoryList}
        contentContainerStyle={styles.inventoryListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d4af37']}
            tintColor="#d4af37"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.loadingText}>Loading inventory...</Text>
          </View>
        ) : filteredInventory.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="archive" size={60} color="#bdc3c7" />
            <Text style={styles.emptyText}>No medicines found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add medicines to your inventory'}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <LinearGradient
                colors={['#d4af37', '#c9a961']}
                style={styles.emptyAddButtonGradient}
              >
                <FontAwesome name="plus" size={16} color="#fff" />
                <Text style={styles.emptyAddButtonText}>Add Medicine</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          filteredInventory.map((medicine) => {
            const stockStatus = getStockStatus(medicine.stock_quantity);
            return (
              <View key={medicine.id} style={styles.medicineCard}>
                <View style={styles.medicineHeader}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    {medicine.generic_name && (
                      <Text style={styles.medicineGeneric}>{medicine.generic_name}</Text>
                    )}
                    <View style={styles.medicineMeta}>
                      <Text style={styles.medicineCategory}>{medicine.category}</Text>
                      {medicine.manufacturer && (
                        <>
                          <Text style={styles.metaSeparator}>•</Text>
                          <Text style={styles.medicineManufacturer}>{medicine.manufacturer}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
                    <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
                    <Text style={[styles.stockText, { color: stockStatus.color }]}>
                      {stockStatus.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.medicineDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <FontAwesome name="cube" size={14} color="#7a7a7a" />
                      <Text style={styles.detailLabel}>Stock:</Text>
                      <Text style={[
                        styles.detailValue,
                        medicine.stock_quantity === 0 && styles.outOfStockValue
                      ]}>
                        {medicine.stock_quantity} units
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <FontAwesome name="money" size={14} color="#7a7a7a" />
                      <Text style={styles.detailLabel}>Price:</Text>
                      <Text style={styles.detailValue}>₵{medicine.price.toFixed(2)}</Text>
                    </View>
                  </View>

                  {medicine.discount_price && (
                    <View style={styles.discountRow}>
                      <Text style={styles.originalPrice}>₵{medicine.price.toFixed(2)}</Text>
                      <Text style={styles.discountPrice}>₵{medicine.discount_price.toFixed(2)}</Text>
                      <Text style={styles.discountPercent}>
                        {Math.round(((medicine.price - medicine.discount_price) / medicine.price) * 100)}% off
                      </Text>
                    </View>
                  )}

                  {medicine.expiry_date && (
                    <View style={styles.expiryRow}>
                      <FontAwesome name="calendar" size={12} color="#7a7a7a" />
                      <Text style={styles.expiryText}>
                        Expires: {new Date(medicine.expiry_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.medicineActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedMedicine(medicine);
                      setShowUpdateStockModal(true);
                    }}
                  >
                    <FontAwesome name="edit" size={14} color="#d4af37" />
                    <Text style={styles.actionButtonText}>Update Stock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                      router.push({
                        pathname: '/(pharmacist-tabs)/medicine-details',
                        params: { medicineId: medicine.medicine_id.toString() },
                      } as any);
                    }}
                  >
                    <FontAwesome name="eye" size={14} color="#5a4fcf" />
                    <Text style={[styles.actionButtonText, styles.viewButtonText]}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Medicine Modal */}
      <AddMedicineModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadInventory();
          loadStats();
          setShowAddModal(false);
        }}
      />

      {/* Update Stock Modal */}
      <UpdateStockModal
        visible={showUpdateStockModal}
        medicine={selectedMedicine}
        onClose={() => {
          setShowUpdateStockModal(false);
          setSelectedMedicine(null);
        }}
        onSuccess={() => {
          loadInventory();
          loadStats();
          setShowUpdateStockModal(false);
          setSelectedMedicine(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    paddingVertical: 12,
    paddingLeft: 20,
  },
  statCard: {
    width: 110,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statGradient: {
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  filterToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterToggleButton: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  filterToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    minWidth: 120,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
  },
  filterToggleTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1a1f3a',
  },
  filterTabs: {
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  activeFilterTab: {
    backgroundColor: '#d4af37',
  },
  filterTabText: {
    fontSize: 14,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryContainer: {
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeCategoryChip: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  activeCategoryChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  inventoryList: {
    flex: 1,
    padding: 16,
  },
  inventoryListContent: {
    paddingBottom: 100, // Extra padding to account for tab bar
  },
  medicineCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 4,
  },
  medicineGeneric: {
    fontSize: 14,
    color: '#7a7a7a',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  medicineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  medicineCategory: {
    fontSize: 12,
    color: '#5a4fcf',
    fontWeight: '500',
    backgroundColor: '#5a4fcf20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaSeparator: {
    marginHorizontal: 8,
    color: '#bdc3c7',
  },
  medicineManufacturer: {
    fontSize: 12,
    color: '#7a7a7a',
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
  medicineDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7a7a7a',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
  },
  outOfStockValue: {
    color: '#e74c3c',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  originalPrice: {
    fontSize: 13,
    color: '#7a7a7a',
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  discountPercent: {
    fontSize: 12,
    color: '#2ecc71',
    backgroundColor: '#2ecc7120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  expiryText: {
    fontSize: 12,
    color: '#7a7a7a',
  },
  medicineActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fb',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  viewButton: {
    borderColor: '#5a4fcf',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4af37',
  },
  viewButtonText: {
    color: '#5a4fcf',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7a7a7a',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7a7a7a',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyAddButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyAddButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

