import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { pharmacistInventoryService } from '../services/pharmacistInventoryService';
import { pharmacistPrescriptionService } from '../services/pharmacistPrescriptionService';
import { orderService } from '../services/orderService';

const { width } = Dimensions.get('window');

interface ReportsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ReportStats {
  totalSales: number;
  todaySales: number;
  thisMonthSales: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalPrescriptions: number;
  todayPrescriptions: number;
  totalInventoryValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalMedicines: number;
}

export default function PharmacistReportsModal({ visible, onClose }: ReportsModalProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    todaySales: 0,
    thisMonthSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalPrescriptions: 0,
    todayPrescriptions: 0,
    totalInventoryValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalMedicines: 0,
  });

  // Swipe gesture handling
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only start gesture from the left edge (first 30px) to allow normal scrolling elsewhere
        return evt.nativeEvent.pageX < 30;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond if:
        // 1. Started from left edge (first 30px)
        // 2. Swiping right (positive dx)
        // 3. More horizontal than vertical (1.5x ratio)
        const startedFromLeft = evt.nativeEvent.pageX < 30;
        const isRightSwipe = gestureState.dx > 10;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        return startedFromLeft && isRightSwipe && isHorizontal;
      },
      onPanResponderGrant: () => {
        // Reset animation value when gesture starts
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swiping right (positive dx) to go back
        if (gestureState.dx > 0) {
          // Clamp the value to prevent over-swiping
          const clampedValue = Math.min(gestureState.dx, width);
          translateX.setValue(clampedValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = width * 0.2; // 20% of screen width (more sensitive)
        const velocityThreshold = 200; // Lower velocity threshold
        
        // Close if swiped far enough OR with sufficient velocity
        if (gestureState.dx > swipeThreshold || gestureState.velocityX > velocityThreshold) {
          // Swipe right with enough distance/velocity - close modal
          Animated.timing(translateX, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            onClose();
          });
        } else {
          // Snap back to original position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => true, // Allow ScrollView to take over if needed
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadReports();
    }
  }, [visible, selectedPeriod]);

  const getPeriodDateRange = (period: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'week':
        const dayOfWeek = now.getDay();
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      default:
        return { start: new Date(0), end: now };
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const { start: periodStart, end: periodEnd } = getPeriodDateRange(selectedPeriod);
      
      // Load inventory stats (not period-dependent)
      const inventoryStats = await pharmacistInventoryService.getInventoryStats();
      if (inventoryStats.success && inventoryStats.data) {
        const data = inventoryStats.data;
        setStats(prev => ({
          ...prev,
          totalInventoryValue: data.totalStockValue || data.total_value || 0,
          lowStockItems: data.lowStockItems || data.low_stock_count || 0,
          outOfStockItems: data.outOfStockItems || data.out_of_stock_count || 0,
          totalMedicines: data.totalMedicines || data.total_items || 0,
        }));
      }

      // Load orders and sales data
      try {
        // Fetch all orders (with high limit to get all for calculations)
        const ordersResponse = await orderService.getOrders(1, 1000);
        if (ordersResponse.success && ordersResponse.data) {
          const allOrders = ordersResponse.data.orders || [];
          
          // Filter orders by selected period
          const periodOrders = allOrders.filter((o: any) => {
            const orderDate = new Date(o.created_at || o.updated_at);
            return orderDate >= periodStart && orderDate <= periodEnd;
          });
          
          // Calculate stats for the selected period
          const pending = periodOrders.filter((o: any) => 
            ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status?.toLowerCase())
          ).length;
          const completed = periodOrders.filter((o: any) => 
            o.status?.toLowerCase() === 'delivered'
          ).length;
          
          // Calculate sales for different periods
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayOrders = allOrders.filter((o: any) => {
            const orderDate = new Date(o.created_at || o.updated_at);
            return orderDate >= today;
          });
          
          const todaySales = todayOrders.reduce((sum: number, o: any) => {
            return sum + (parseFloat(o.total_amount || o.final_amount || 0));
          }, 0);
          
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0, 0, 0, 0);
          
          const monthOrders = allOrders.filter((o: any) => {
            const orderDate = new Date(o.created_at || o.updated_at);
            return orderDate >= thisMonth;
          });
          
          const monthSales = monthOrders.reduce((sum: number, o: any) => {
            return sum + (parseFloat(o.total_amount || o.final_amount || 0));
          }, 0);
          
          // Calculate sales for selected period
          const periodSales = periodOrders.reduce((sum: number, o: any) => {
            return sum + (parseFloat(o.total_amount || o.final_amount || 0));
          }, 0);
          
          // Total sales (all time)
          const totalSales = allOrders.reduce((sum: number, o: any) => {
            return sum + (parseFloat(o.total_amount || o.final_amount || 0));
          }, 0);
          
          setStats(prev => ({
            ...prev,
            totalSales: selectedPeriod === 'year' ? totalSales : periodSales,
            todaySales,
            thisMonthSales: monthSales,
            totalOrders: selectedPeriod === 'year' ? allOrders.length : periodOrders.length,
            pendingOrders: pending,
            completedOrders: completed,
          }));
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      }

      // Load prescriptions data
      try {
        const prescriptionsResponse = await pharmacistPrescriptionService.getPrescriptionsToProcess('all', 1000, 1);
        if (prescriptionsResponse.success && prescriptionsResponse.data) {
          const allPrescriptions = Array.isArray(prescriptionsResponse.data)
            ? prescriptionsResponse.data
            : [];
          
          // Filter prescriptions by selected period
          const periodPrescriptions = allPrescriptions.filter((p: any) => {
            const prescDate = new Date(p.created_at || p.prescription_date || p.date);
            return prescDate >= periodStart && prescDate <= periodEnd;
          });
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayPrescriptions = allPrescriptions.filter((p: any) => {
            const prescDate = new Date(p.created_at || p.prescription_date || p.date);
            return prescDate >= today;
          }).length;
          
          setStats(prev => ({
            ...prev,
            totalPrescriptions: selectedPeriod === 'year' ? allPrescriptions.length : periodPrescriptions.length,
            todayPrescriptions,
          }));
        }
      } catch (error) {
        console.error('Error loading prescriptions:', error);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'Period';
    }
  };

  const generateReportHTML = (): string => {
    const periodLabel = getPeriodLabel();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calculate percentages for charts
    const completionRate = stats.totalOrders > 0 
      ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
      : 0;
    const pendingRate = stats.totalOrders > 0 
      ? Math.round((stats.pendingOrders / stats.totalOrders) * 100) 
      : 0;
    const lowStockPercentage = stats.totalMedicines > 0
      ? Math.round((stats.lowStockItems / stats.totalMedicines) * 100)
      : 0;
    const outOfStockPercentage = stats.totalMedicines > 0
      ? Math.round((stats.outOfStockItems / stats.totalMedicines) * 100)
      : 0;
    const inStockPercentage = 100 - lowStockPercentage - outOfStockPercentage;
    const daysInPeriod = selectedPeriod === 'today' ? 1 : selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pharmacy Report - ${periodLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: #f8f9fa;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d4a7c 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .section {
      background: white;
      padding: 25px;
      margin-bottom: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1f3a;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #d4af37;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #d4af37;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1a1f3a;
    }
    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .chart-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1a1f3a;
    }
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      height: 200px;
    }
    .bar {
      flex: 1;
      background: linear-gradient(to top, #d4af37, #c9a961);
      border-radius: 4px 4px 0 0;
      position: relative;
      min-height: 20px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 5px;
    }
    .bar-label {
      position: absolute;
      bottom: -25px;
      font-size: 11px;
      color: #666;
      text-align: center;
      width: 100%;
    }
    .bar-value {
      color: white;
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .pie-chart {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 20px 0;
    }
    .pie-segment {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: conic-gradient(
        #d4af37 0% ${completionRate}%,
        #8b2635 ${completionRate}% ${completionRate + pendingRate}%,
        #95a5a6 ${completionRate + pendingRate}% 100%
      );
    }
    .pie-center {
      width: 120px;
      height: 120px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .pie-value {
      font-size: 24px;
      font-weight: 700;
      color: #1a1f3a;
    }
    .pie-label {
      font-size: 12px;
      color: #666;
    }
    .insights {
      list-style: none;
    }
    .insight-item {
      padding: 15px;
      margin-bottom: 10px;
      background: #f8f9fa;
      border-left: 4px solid #d4af37;
      border-radius: 4px;
    }
    .insight-title {
      font-weight: 600;
      margin-bottom: 5px;
      color: #1a1f3a;
    }
    .insight-text {
      color: #666;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
    }
    @media print {
      body { background: white; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Pharmacy Performance Report</h1>
    <p>Period: ${periodLabel} | Generated: ${currentDate}</p>
  </div>

  <div class="section">
    <h2 class="section-title">Sales Overview</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Sales (${periodLabel})</div>
        <div class="stat-value">${formatCurrency(stats.totalSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Today's Sales</div>
        <div class="stat-value">${formatCurrency(stats.todaySales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Month Sales</div>
        <div class="stat-value">${formatCurrency(stats.thisMonthSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Average Daily Sales</div>
        <div class="stat-value">${formatCurrency(stats.totalSales / daysInPeriod)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Orders Analysis</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${stats.totalOrders}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending Orders</div>
        <div class="stat-value">${stats.pendingOrders}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed Orders</div>
        <div class="stat-value">${stats.completedOrders}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completion Rate</div>
        <div class="stat-value">${completionRate}%</div>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-title">Order Status Distribution</div>
      <div class="pie-chart">
        <div class="pie-segment">
          <div class="pie-center">
            <div class="pie-value">${completionRate}%</div>
            <div class="pie-label">Completed</div>
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: center; gap: 30px; margin-top: 20px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 20px; background: #d4af37; border-radius: 4px;"></div>
          <span>Completed (${stats.completedOrders})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 20px; background: #8b2635; border-radius: 4px;"></div>
          <span>Pending (${stats.pendingOrders})</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Prescriptions</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Prescriptions</div>
        <div class="stat-value">${stats.totalPrescriptions}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Today's Prescriptions</div>
        <div class="stat-value">${stats.todayPrescriptions}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Inventory Status</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Items</div>
        <div class="stat-value">${stats.totalMedicines}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Inventory Value</div>
        <div class="stat-value">${formatCurrency(stats.totalInventoryValue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Low Stock Items</div>
        <div class="stat-value">${stats.lowStockItems}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Out of Stock</div>
        <div class="stat-value">${stats.outOfStockItems}</div>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-title">Stock Status Distribution</div>
      <div class="bar-chart">
        <div class="bar" style="height: ${Math.max(inStockPercentage, 10)}%">
          <div class="bar-value">${stats.totalMedicines - stats.lowStockItems - stats.outOfStockItems}</div>
          <div class="bar-label">In Stock</div>
        </div>
        <div class="bar" style="height: ${Math.max(lowStockPercentage, 10)}%">
          <div class="bar-value">${stats.lowStockItems}</div>
          <div class="bar-label">Low Stock</div>
        </div>
        <div class="bar" style="height: ${Math.max(outOfStockPercentage, 10)}%">
          <div class="bar-value">${stats.outOfStockItems}</div>
          <div class="bar-label">Out of Stock</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Key Insights</h2>
    <ul class="insights">
      <li class="insight-item">
        <div class="insight-title">Sales Performance</div>
        <div class="insight-text">
          ${stats.totalSales > 0 
            ? `Strong sales performance with ${formatCurrency(stats.totalSales)} in ${periodLabel.toLowerCase()}. Today's sales of ${formatCurrency(stats.todaySales)} indicate ${stats.todaySales > stats.totalSales / daysInPeriod ? 'above' : 'below'} average performance.`
            : 'No sales recorded for this period.'}
        </div>
      </li>
      <li class="insight-item">
        <div class="insight-title">Order Management</div>
        <div class="insight-text">
          ${stats.totalOrders > 0
            ? `Processing ${stats.totalOrders} orders with ${completionRate}% completion rate. ${stats.pendingOrders} orders require attention.`
            : 'No orders recorded for this period.'}
        </div>
      </li>
      <li class="insight-item">
        <div class="insight-title">Inventory Health</div>
        <div class="insight-text">
          ${stats.lowStockItems > 0 || stats.outOfStockItems > 0
            ? `⚠️ Alert: ${stats.lowStockItems + stats.outOfStockItems} items need immediate attention (${stats.lowStockItems} low stock, ${stats.outOfStockItems} out of stock).`
            : '✅ All inventory levels are healthy and well-stocked.'}
        </div>
      </li>
      <li class="insight-item">
        <div class="insight-title">Prescription Activity</div>
        <div class="insight-text">
          ${stats.totalPrescriptions > 0
            ? `Handled ${stats.totalPrescriptions} prescriptions in ${periodLabel.toLowerCase()}, with ${stats.todayPrescriptions} processed today.`
            : 'No prescriptions recorded for this period.'}
        </div>
      </li>
    </ul>
  </div>

  <div class="footer">
    <p>Generated by PharmaLink Pharmacy Management System</p>
    <p>Report Period: ${periodLabel} | Date: ${currentDate}</p>
  </div>
</body>
</html>
    `;
  };

  const handleExportReport = async () => {
    try {
      const htmlContent = generateReportHTML();
      const fileName = `Pharmacy_Report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write HTML file - encoding is optional and defaults to UTF8
      await FileSystem.writeAsStringAsync(fileUri, htmlContent);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Export Pharmacy Report',
        });
        Alert.alert('Success', 'Report exported successfully!');
      } else {
        Alert.alert(
          'Export Complete',
          `Report saved to: ${fileUri}\n\nYou can find it in your device's file manager.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error exporting report:', error);
      Alert.alert(
        'Error', 
        `Failed to export report: ${error?.message || 'Unknown error'}\n\nPlease try again.`
      );
    }
  };

  const reportCards = [
    {
      id: 'sales',
      title: 'Sales',
      icon: 'money',
      color: '#d4af37',
      gradient: ['#d4af37', '#c9a961'],
      stats: [
        { label: 'Today', value: formatCurrency(stats.todaySales) },
        { label: getPeriodLabel(), value: formatCurrency(stats.totalSales) },
        { label: 'This Month', value: formatCurrency(stats.thisMonthSales) },
      ],
    },
    {
      id: 'orders',
      title: 'Orders',
      icon: 'shopping-cart',
      color: '#8b2635',
      gradient: ['#8b2635', '#6d1d28'],
      stats: [
        { label: getPeriodLabel(), value: stats.totalOrders.toString() },
        { label: 'Pending', value: stats.pendingOrders.toString() },
        { label: 'Completed', value: stats.completedOrders.toString() },
      ],
    },
    {
      id: 'prescriptions',
      title: 'Prescriptions',
      icon: 'file-text-o',
      color: '#5a4fcf',
      gradient: ['#5a4fcf', '#4a3fbf'],
      stats: [
        { label: 'Today', value: stats.todayPrescriptions.toString() },
        { label: getPeriodLabel(), value: stats.totalPrescriptions.toString() },
        { label: 'Completion Rate', value: stats.totalOrders > 0 
          ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%` 
          : '0%' },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: 'archive',
      color: '#2d3561',
      gradient: ['#2d3561', '#1a1f3a'],
      stats: [
        { label: 'Total Items', value: stats.totalMedicines.toString() },
        { label: 'Low Stock', value: stats.lowStockItems.toString() },
        { label: 'Out of Stock', value: stats.outOfStockItems.toString() },
      ],
    },
    {
      id: 'value',
      title: 'Inventory Value',
      icon: 'dollar',
      color: '#c9a961',
      gradient: ['#c9a961', '#b8941d'],
      stats: [
        { label: 'Total Value', value: formatCurrency(stats.totalInventoryValue) },
        { label: 'Avg per Item', value: stats.totalMedicines > 0 
          ? formatCurrency(stats.totalInventoryValue / stats.totalMedicines) 
          : formatCurrency(0) },
        { label: 'Status', value: stats.lowStockItems > 0 ? '⚠️ Alert' : '✅ Good' },
      ],
    },
  ];

  const periodOptions = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <SafeAreaView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#1a1f3a', '#2d3561', '#3d4a7c']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <FontAwesome name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Reports & Analytics</Text>
              <Text style={styles.headerSubtitle}>Performance Overview</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Period Selector */}
          <View style={styles.periodContainer}>
            {periodOptions.map((period) => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.id as any)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period.id && styles.periodButtonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Summary Cards */}
            <View style={styles.summarySection}>
              {reportCards.map((card) => (
                <View key={card.id} style={styles.reportCard}>
                  <LinearGradient
                    colors={card.gradient}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconContainer}>
                        <FontAwesome name={card.icon as any} size={24} color="#fff" />
                      </View>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                    </View>
                    <View style={styles.cardStats}>
                      {card.stats.map((stat, index) => (
                        <View key={index} style={styles.statRow}>
                          <Text style={styles.statLabel}>{stat.label}</Text>
                          <Text style={styles.statValue}>{stat.value}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>

            {/* Quick Insights */}
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Quick Insights</Text>
              <View style={styles.insightsList}>
                <View style={styles.insightItem}>
                  <View style={[styles.insightIcon, { backgroundColor: '#d4af3720' }]}>
                    <FontAwesome name="trending-up" size={20} color="#d4af37" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Sales Performance</Text>
                    <Text style={styles.insightText}>
                      {stats.thisMonthSales > 0 
                        ? `Strong sales this month with ${formatCurrency(stats.thisMonthSales)} in revenue`
                        : 'No sales data available for this period'}
                    </Text>
                  </View>
                </View>

                <View style={styles.insightItem}>
                  <View style={[styles.insightIcon, { backgroundColor: '#8b263520' }]}>
                    <FontAwesome name="shopping-cart" size={20} color="#8b2635" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Order Status</Text>
                    <Text style={styles.insightText}>
                      {stats.pendingOrders > 0
                        ? `${stats.pendingOrders} orders pending processing`
                        : 'All orders are processed'}
                    </Text>
                  </View>
                </View>

                <View style={styles.insightItem}>
                  <View style={[styles.insightIcon, { backgroundColor: '#c9a96120' }]}>
                    <FontAwesome name="exclamation-triangle" size={20} color="#c9a961" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Inventory Alert</Text>
                    <Text style={styles.insightText}>
                      {stats.lowStockItems > 0 || stats.outOfStockItems > 0
                        ? `${stats.lowStockItems + stats.outOfStockItems} items need attention`
                        : 'All inventory levels are healthy'}
                    </Text>
                  </View>
                </View>

                <View style={styles.insightItem}>
                  <View style={[styles.insightIcon, { backgroundColor: '#5a4fcf20' }]}>
                    <FontAwesome name="file-text-o" size={20} color="#5a4fcf" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Prescription Activity</Text>
                    <Text style={styles.insightText}>
                      {stats.todayPrescriptions > 0
                        ? `${stats.todayPrescriptions} prescriptions processed today`
                        : 'No prescriptions processed today'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleExportReport}
              >
                <FontAwesome name="download" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Export Report</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        )}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  headerSpacer: {
    width: 40,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#d4af37',
  },
  periodButtonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
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
  content: {
    flex: 1,
    padding: 20,
  },
  summarySection: {
    marginBottom: 24,
  },
  reportCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  cardStats: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  insightsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  insightsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4af37',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});

