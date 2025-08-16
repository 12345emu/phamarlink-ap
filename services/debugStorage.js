import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugAsyncStorage = async () => {
  console.log('🔍 Debugging AsyncStorage...');
  
  try {
    // Check all stored values
    const userToken = await AsyncStorage.getItem('userToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const userData = await AsyncStorage.getItem('userData');
    const firstTimeUser = await AsyncStorage.getItem('firstTimeUser');
    
    console.log('📋 AsyncStorage Contents:');
    console.log('   userToken:', userToken ? `${userToken.substring(0, 20)}...` : 'null');
    console.log('   refreshToken:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null');
    console.log('   userData:', userData ? 'exists' : 'null');
    console.log('   firstTimeUser:', firstTimeUser);
    
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        console.log('   Parsed userData:', {
          id: parsedUserData.id,
          email: parsedUserData.email,
          firstName: parsedUserData.firstName,
          lastName: parsedUserData.lastName,
          role: parsedUserData.role
        });
      } catch (e) {
        console.log('   Error parsing userData:', e.message);
      }
    }
    
    // Check if we can retrieve the token
    if (userToken) {
      console.log('✅ Token is stored in AsyncStorage');
    } else {
      console.log('❌ No token found in AsyncStorage');
    }
    
  } catch (error) {
    console.error('❌ Error reading AsyncStorage:', error);
  }
};

export const clearAsyncStorage = async () => {
  console.log('🧹 Clearing AsyncStorage...');
  try {
    await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData', 'firstTimeUser']);
    console.log('✅ AsyncStorage cleared');
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
  }
}; 