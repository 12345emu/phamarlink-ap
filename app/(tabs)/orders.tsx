import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface Medicine {
  id: number;
  name: string;
  description: string;
  price: number;
  prescription: boolean;
  category: string;
  image: string;
}

interface Order {
  id: number;
  medicines: { medicine: Medicine; quantity: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered';
  pharmacy: string;
  orderDate: string;
  estimatedDelivery: string;
  deliveryAddress: string;
}

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<'browse' | 'cart' | 'orders'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ medicine: Medicine; quantity: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const medicines: Medicine[] = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      description: "Pain reliever and fever reducer",
      price: 5.99,
      prescription: false,
      category: "pain-relief",
      image: "pill"
    },
    {
      id: 2,
      name: "Ibuprofen 400mg",
      description: "Anti-inflammatory pain reliever",
      price: 7.99,
      prescription: false,
      category: "pain-relief",
      image: "pill"
    },
    {
      id: 3,
      name: "Amoxicillin 250mg",
      description: "Antibiotic for bacterial infections",
      price: 15.99,
      prescription: true,
      category: "antibiotics",
      image: "pill"
    },
    {
      id: 4,
      name: "Vitamin D3 1000IU",
      description: "Supports bone health and immune system",
      price: 12.99,
      prescription: false,
      category: "vitamins",
      image: "pill"
    },
    {
      id: 5,
      name: "Omeprazole 20mg",
      description: "Reduces stomach acid production",
      price: 18.99,
      prescription: true,
      category: "digestive",
      image: "pill"
    }
  ];

  const orders: Order[] = [
    {
      id: 1,
      medicines: [{ medicine: medicines[0], quantity: 2 }],
      total: 11.98,
      status: 'out_for_delivery',
      pharmacy: 'CVS Pharmacy',
      orderDate: '2024-01-15',
      estimatedDelivery: '2024-01-15 14:30',
      deliveryAddress: '123 Main St, Apt 4B'
    },
    {
      id: 2,
      medicines: [{ medicine: medicines[3], quantity: 1 }],
      total: 12.99,
      status: 'delivered',
      pharmacy: 'Walgreens',
      orderDate: '2024-01-14',
      estimatedDelivery: '2024-01-14 16:00',
      deliveryAddress: '123 Main St, Apt 4B'
    }
  ];

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'pain-relief', name: 'Pain Relief' },
    { id: 'antibiotics', name: 'Antibiotics' },
    { id: 'vitamins', name: 'Vitamins' },
    { id: 'digestive', name: 'Digestive' }
  ];

  const addToCart = (medicine: Medicine) => {
    const existingItem = cart.find(item => item.medicine.id === medicine.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.medicine.id === medicine.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { medicine, quantity: 1 }]);
    }
    Alert.alert('Added to Cart', `${medicine.name} added to cart`);
  };

  const removeFromCart = (medicineId: number) => {
    setCart(cart.filter(item => item.medicine.id !== medicineId));
  };

  const updateQuantity = (medicineId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(medicineId);
    } else {
      setCart(cart.map(item => 
        item.medicine.id === medicineId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#2196F3';
      case 'preparing': return '#9C27B0';
      case 'out_for_delivery': return '#FF5722';
      case 'delivered': return '#4CAF50';
      default: return '#666';
    }
  };

  const getStatusText = (status: Order['status']) => {
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

  const renderBrowseTab = () => (
    <ScrollView style={styles.content}>
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.medicineGrid}>
        {filteredMedicines.map(medicine => (
          <View key={medicine.id} style={styles.medicineCard}>
            <View style={styles.medicineImage}>
              <FontAwesome name="medkit" size={30} color="#4CAF50" />
            </View>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <Text style={styles.medicineDescription}>{medicine.description}</Text>
            <View style={styles.medicineFooter}>
              <Text style={styles.medicinePrice}>${medicine.price}</Text>
              {medicine.prescription && (
                <View style={styles.prescriptionBadge}>
                  <Text style={styles.prescriptionText}>Rx</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(medicine)}
            >
              <FontAwesome name="plus" size={16} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderCartTab = () => (
    <View style={styles.content}>
      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <FontAwesome name="shopping-cart" size={60} color="#ccc" />
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.cartList}>
            {cart.map(item => (
              <View key={item.medicine.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.medicine.name}</Text>
                  <Text style={styles.cartItemPrice}>${item.medicine.price}</Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                  >
                    <FontAwesome name="minus" size={12} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                  >
                    <FontAwesome name="plus" size={12} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.cartFooter}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>${cartTotal.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton}>
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderOrdersTab = () => (
    <ScrollView style={styles.content}>
      {orders.map(order => (
        <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
            </View>
          </View>
          <Text style={styles.pharmacyName}>{order.pharmacy}</Text>
          <Text style={styles.orderDate}>{order.orderDate}</Text>
          <Text style={styles.deliveryAddress}>{order.deliveryAddress}</Text>
          <View style={styles.orderMedicines}>
            {order.medicines.map((item, index) => (
              <Text key={index} style={styles.medicineItem}>
                {item.medicine.name} x{item.quantity}
              </Text>
            ))}
          </View>
          <View style={styles.orderFooter}>
            <Text style={styles.orderTotal}>Total: ${order.total}</Text>
            <Text style={styles.estimatedDelivery}>
              Est. Delivery: {order.estimatedDelivery}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        {activeTab === 'cart' && cart.length > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cart.length}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <FontAwesome name="search" size={16} color={activeTab === 'browse' ? '#4CAF50' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cart' && styles.activeTab]}
          onPress={() => setActiveTab('cart')}
        >
          <FontAwesome name="shopping-cart" size={16} color={activeTab === 'cart' ? '#4CAF50' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'cart' && styles.activeTabText]}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <FontAwesome name="list" size={16} color={activeTab === 'orders' ? '#4CAF50' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Orders</Text>
        </TouchableOpacity>
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
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cartBadge: {
    backgroundColor: '#FF5722',
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
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  medicineGrid: {
    paddingHorizontal: 20,
  },
  medicineCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  medicineDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicinePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    backgroundColor: '#4CAF50',
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
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
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
    color: '#4CAF50',
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
  cartFooter: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  orderDate: {
    fontSize: 12,
    color: '#999',
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
    color: '#4CAF50',
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#666',
  },
}); 