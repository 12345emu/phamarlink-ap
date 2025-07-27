import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useProfile } from '../context/ProfileContext';

interface ProfileImageProps {
  size?: number;
  showBorder?: boolean;
}

export default function ProfileImage({ size = 32, showBorder = true }: ProfileImageProps) {
  const { profileImage } = useProfile();

  return (
    <View style={[
      styles.container,
      { width: size, height: size, borderRadius: size / 2 },
      showBorder && styles.border
    ]}>
      {profileImage ? (
        <Image 
          source={{ uri: profileImage }} 
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 }
          ]}
        />
      ) : (
        <View style={[
          styles.defaultContainer,
          { width: size, height: size, borderRadius: size / 2 }
        ]}>
          <FontAwesome 
            name="user" 
            size={size * 0.5} 
            color="#3498db" 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  border: {
    borderWidth: 2,
    borderColor: '#ecf0f1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  defaultContainer: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 