import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { useOrders } from '../../context/OrdersContext';

const { width } = Dimensions.get('window');

interface Medicine {
  id: number;
  name: string;
  description: string;
  price: number;
  prescription: boolean;
  category: string;
  image: string;
}

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<'browse' | 'cart' | 'orders'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const anim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { cart, addToCart, removeFromCart, updateQuantity } = useCart();
  const { orders } = useOrders();
  const [checkoutAnim] = useState(new Animated.Value(1));

  const medicines: Medicine[] = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      description: "Pain reliever and fever reducer",
      price: 5.99,
      prescription: false,
      category: "pain-relief",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      name: "Ibuprofen 400mg",
      description: "Anti-inflammatory pain reliever",
      price: 7.99,
      prescription: false,
      category: "pain-relief",
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      name: "Amoxicillin 250mg",
      description: "Antibiotic for bacterial infections",
      price: 15.99,
      prescription: true,
      category: "antibiotics",
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 4,
      name: "Vitamin D3 1000IU",
      description: "Supports bone health and immune system",
      price: 12.99,
      prescription: false,
      category: "vitamins",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 5,
      name: "Omeprazole 20mg",
      description: "Reduces stomach acid production",
      price: 18.99,
      prescription: true,
      category: "digestive",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80"
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: 'medkit' },
    { id: 'pain-relief', name: 'Pain Relief', icon: 'heartbeat' },
    { id: 'antibiotics', name: 'Antibiotics', icon: 'shield' },
    { id: 'vitamins', name: 'Vitamins', icon: 'star' },
    { id: 'digestive', name: 'Digestive', icon: 'leaf' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#8B5CF6';
      case 'preparing': return '#A855F7';
      case 'out_for_delivery': return '#FF5722';
      case 'delivered': return '#10B981';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const filteredMedicines = medicines.filter(medicine =>
    (selectedCategory === 'all' || medicine.category === selectedCategory) &&
    medicine.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((total, item) => total + (item.medicine.price * item.quantity), 0);

  // Animate tab transitions
  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: activeTab === 'browse' ? 0 : activeTab === 'cart' ? 1 : 2,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, [activeTab]);

  const handleCheckoutPressIn = () => {
    Animated.spring(checkoutAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };
  const handleCheckoutPressOut = () => {
    Animated.spring(checkoutAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderBrowseTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hero Search Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroGlass}>
          <Text style={styles.heroTitle}>Find Your Medicine</Text>
          <Text style={styles.heroSubtitle}>Browse and order from our extensive collection</Text>
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={20} color="#8B5CF6" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines, vitamins, supplements..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedCategory === category.id ? ['#8B5CF6', '#A855F7'] : ['rgba(139,92,246,0.1)', 'rgba(168,85,247,0.1)']}
                style={styles.categoryIconBg}
              >
                <FontAwesome 
                  name={category.icon as any} 
                  size={24} 
                  color={selectedCategory === category.id ? '#fff' : '#8B5CF6'} 
                />
              </LinearGradient>
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Medicines Grid */}
      <View style={styles.medicinesSection}>
        <Text style={styles.sectionTitle}>Available Medicines</Text>
        <View style={styles.medicinesGrid}>
          {filteredMedicines.map(medicine => (
            <View key={medicine.id} style={styles.medicineCardShadow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({
                  pathname: '/pharmacy-details-modal',
                  params: {
                    pharmacyName: medicine.name,
                    pharmacyImage: medicine.image,
                    pharmacyRating: medicine.price.toString(), // Use price as a placeholder for rating
                    pharmacyDistance: '',
                    pharmacyAddress: '',
                    pharmacyOpen: 'true',
                    // You can add more params if needed
                  }
                })}
              >
                <View style={styles.medicineCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                    style={styles.medicineCardGradient}
                  >
                    <Image source={{ uri: medicine.image }} style={styles.medicineImage} />
                    <View style={styles.medicineHeader}>
                      <View style={styles.medicineIconBg}>
                        <FontAwesome name="medkit" size={24} color="#8B5CF6" />
                      </View>
                      {medicine.prescription && (
                        <View style={styles.prescriptionBadge}>
                          <Text style={styles.prescriptionText}>Rx</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDescription}>{medicine.description}</Text>
                    <View style={styles.medicineFooter}>
                      <Text style={styles.medicinePrice}>${medicine.price}</Text>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => addToCart(medicine)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#8B5CF6', '#A855F7']}
                          style={styles.addButtonGradient}
                        >
                          <FontAwesome name="plus" size={16} color="white" />
                          <Text style={styles.addButtonText}>Add</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderCartTab = () => (
    <View style={styles.content}>
      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <LinearGradient
            colors={['rgba(139,92,246,0.1)', 'rgba(168,85,247,0.1)']}
            style={styles.emptyCartIconBg}
          >
            <FontAwesome name="shopping-cart" size={60} color="#8B5CF6" />
          </LinearGradient>
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartText}>Start browsing medicines to add items to your cart</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
            {cart.map(item => (
              <View key={item.medicine.id} style={styles.cartItem}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.cartItemGradient}
                >
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.medicine.name}</Text>
                    <Text style={styles.cartItemPrice}>${item.medicine.price}</Text>
                  </View>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="minus" size={14} color="#8B5CF6" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="plus" size={14} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
          <View style={styles.cartFooterSticky}>
            <Animated.View style={{ transform: [{ scale: checkoutAnim }] }}>
              <TouchableOpacity
                style={styles.checkoutButtonModern}
                activeOpacity={0.85}
                onPress={() => router.push('/checkout')}
                onPressIn={handleCheckoutPressIn}
                onPressOut={handleCheckoutPressOut}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.checkoutButtonGradientModern}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FontAwesome name="credit-card" size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.checkoutButtonTextModern}>Checkout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </>
      )}
    </View>
  );

  const renderOrdersTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.ordersSection}>
        <Text style={styles.sectionTitle}>Your Orders</Text>
        {orders.map(order => (
          <View key={order.id} style={styles.orderCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
              style={styles.orderCardGradient}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <Text style={styles.orderDate}>{order.date ? order.date.substring(0, 10) : ''}</Text>
                </View>
                {typeof (order as any).status === 'string' && !!(order as any).status && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor((order as any).status) }]}> 
                    <Text style={styles.statusText}>{getStatusText((order as any).status)}</Text>
                  </View>
                )}
              </View>
              {typeof (order as any).pharmacy === 'string' && !!(order as any).pharmacy && <Text style={styles.pharmacyName}>{(order as any).pharmacy}</Text>}
              <Text style={styles.deliveryAddress}>{order.address}</Text>
              <View style={styles.orderMedicines}>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.medicineItem}>
                    {item.medicine.name} x{item.quantity}
                  </Text>
                ))}
              </View>
              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>Total: ${order.total}</Text>
                {typeof (order as any).estimatedDelivery === 'string' && !!(order as any).estimatedDelivery && (
                  <Text style={styles.estimatedDelivery}>
                    Est. Delivery: {(order as any).estimatedDelivery}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#f7fafd', '#f3f4f6']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>PharmaLink</Text>
              <Text style={styles.subtitle}>Premium Pharmacy</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.profileButton} activeOpacity={0.8}>
                <Image 
                  source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                  style={styles.profileImage} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <FontAwesome name="search" size={16} color={activeTab === 'browse' ? '#4CAF50' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        <View style={{ position: 'relative', flex: 1 }}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cart' && styles.activeTab]}
            onPress={() => setActiveTab('cart')}
          >
            <FontAwesome name="shopping-cart" size={16} color={activeTab === 'cart' ? '#4CAF50' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'cart' && styles.activeTabText]}>Cart</Text>
          </TouchableOpacity>
          {cart.length > 0 && (
            <View style={{
              position: 'absolute',
              top: 4,
              right: 32,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#A855F7',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              paddingHorizontal: 3,
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{cart.length}</Text>
            </View>
          )}
        </View>
        <View style={{ position: 'relative', flex: 1 }}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
            onPress={() => setActiveTab('orders')}
          >
            <FontAwesome name="list" size={16} color={activeTab === 'orders' ? '#4CAF50' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Orders</Text>
          </TouchableOpacity>
          {orders.length > 0 && (
            <View style={{
              position: 'absolute',
              top: 4,
              right: 32,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#A855F7',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              paddingHorizontal: 3,
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{orders.length}</Text>
            </View>
          )}
        </View>
      </View>

      {activeTab === 'browse' && renderBrowseTab()}
      {activeTab === 'cart' && renderCartTab()}
      {activeTab === 'orders' && renderOrdersTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8B5CF6',
  },
  headerGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  cartBadge: {
    backgroundColor: '#A855F7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#E8F5E8',
  },
  tabText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  heroGlass: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  categoriesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriesContainer: {
    marginBottom: 10,
  },
  categoryCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardActive: {
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  categoryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  medicinesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  medicinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  medicineCardShadow: {
    width: '48%',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 18,
    borderRadius: 20,
    marginBottom: 16,
  },
  medicineCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  medicineCardGradient: {
    padding: 12,
    height: 240,
  },
  medicineImage: {
    width: '100%',
    height: 60,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 8,
    backgroundColor: '#eee',
    resizeMode: 'cover',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medicineIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
    lineHeight: 18,
  },
  medicineDescription: {
    fontSize: 11,
    color: '#666',
    marginBottom: 16,
    lineHeight: 14,
    flex: 1,
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  medicinePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  prescriptionBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  prescriptionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyCartIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  cartList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItemGradient: {
    padding: 16,
    borderRadius: 16,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cartFooterSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 20,
    paddingBottom: 32,
    zIndex: 100,
    alignItems: 'center',
  },
  checkoutButtonModern: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  checkoutButtonGradientModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
  },
  checkoutButtonTextModern: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ordersSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardGradient: {
    padding: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  pharmacyName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  deliveryAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  orderMedicines: {
    marginBottom: 10,
  },
  medicineItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
}); 