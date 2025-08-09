import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import LogoPage from '../components/LogoPage';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, loading, firstTimeUser } = useAuth();

  // Debug logging
  console.log('Index.tsx - Auth State:', { loading, firstTimeUser, isAuthenticated });

  if (loading) {
    console.log('Index.tsx - Showing LoadingScreen');
    return <LoadingScreen />;
  }

  // For first-time users, show LogoPage first
  if (firstTimeUser) {
    console.log('Index.tsx - Showing LogoPage for first-time user');
    return <LogoPage />;
  }

  // For returning users, check authentication status
  if (isAuthenticated) {
    console.log('Index.tsx - Redirecting authenticated user to tabs');
    return <Redirect href="/(tabs)" />;
  }

  console.log('Index.tsx - Redirecting unauthenticated user to login');
  return <Redirect href="/login" />;
} 