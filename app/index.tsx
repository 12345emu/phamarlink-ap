import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import LogoPage from '../components/LogoPage';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, loading, firstTimeUser, user } = useAuth();

  // Debug logging
  console.log('Index.tsx - Auth State:', { loading, firstTimeUser, isAuthenticated, userRole: user?.role });
  console.log('Index.tsx - User object:', user);

  if (loading) {
    console.log('Index.tsx - Showing LoadingScreen');
    return <LoadingScreen />;
  }

  // TEMPORARY: Force LogoPage for testing - remove this when flow is working
  // console.log('Index.tsx - TEMPORARY: Forcing LogoPage for testing');
  // return <LogoPage />;

  // For first-time users, show LogoPage first (but skip for doctors)
  if (firstTimeUser && user?.role !== 'doctor') {
    console.log('Index.tsx - Showing LogoPage for first-time user (non-doctor)');
    return <LogoPage />;
  }

  // For returning users, check authentication status and role
  if (isAuthenticated && user) {
    console.log('Index.tsx - Redirecting authenticated user based on role:', user.role);
    
    // Role-based navigation
    switch (user.role) {
      case 'doctor':
        console.log('Index.tsx - Redirecting doctor to doctor tabs');
        console.log('Index.tsx - Attempting to redirect to doctor tabs');
        return <Redirect href={"/(doctor-tabs)" as any} />;
      case 'facility-admin':
        console.log('Index.tsx - Redirecting facility-admin to facility tabs');
        return <Redirect href={"/(facility-tabs)" as any} />;
      case 'patient':
        console.log('Index.tsx - Redirecting patient to patient tabs');
        return <Redirect href="/(tabs)" />;
      case 'pharmacist':
        console.log('Index.tsx - Redirecting pharmacist to pharmacist tabs');
        return <Redirect href={"/(pharmacist-tabs)" as any} />;
      case 'admin':
        console.log('Index.tsx - Redirecting admin to patient tabs (temporary)');
        return <Redirect href="/(tabs)" />;
      default:
        console.log('Index.tsx - Unknown role, redirecting to patient tabs');
        return <Redirect href="/(tabs)" />;
    }
  }

  console.log('Index.tsx - Redirecting unauthenticated user to login');
  return <Redirect href="/login" />;
} 