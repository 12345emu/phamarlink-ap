import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EMOJI_BUTTON_WIDTH = SCREEN_WIDTH / 8; // 8 columns per row

interface EmojiPickerProps {
  visible: boolean;
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES = {
  '😀': {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓']
  },
  '👋': {
    name: 'Hands',
    emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏']
  },
  '❤️': {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  '👍': {
    name: 'Body',
    emojis: ['✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄']
  },
  '🎉': {
    name: 'Objects',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🎄', '🎃', '🎆', '🎇', '✨', '🌟', '💫', '⭐', '💥', '🔥', '💢', '💯', '✅', '❌', '⭕', '❓', '❗', '💬', '💭', '💤']
  },
};

export default function EmojiPicker({ visible, onSelectEmoji, onClose }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('😀');
  const categoryKeys = Object.keys(EMOJI_CATEGORIES);
  const currentEmojis = EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.emojis || [];

  const handleEmojiSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    // Close picker after selection (optional, WhatsApp keeps it open)
    // if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.emojiGrid}
        contentContainerStyle={styles.emojiGridContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {currentEmojis.map((emoji, index) => (
          <TouchableOpacity
            key={`${selectedCategory}-${index}`}
            style={styles.emojiButton}
            onPress={() => handleEmojiSelect(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Category Tabs */}
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categoryKeys.map((categoryKey) => {
            const category = EMOJI_CATEGORIES[categoryKey as keyof typeof EMOJI_CATEGORIES];
            const isSelected = selectedCategory === categoryKey;
            return (
              <TouchableOpacity
                key={categoryKey}
                style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(categoryKey)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryEmoji, isSelected && styles.categoryEmojiActive]}>
                  {categoryKey}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 280,
    maxHeight: 280,
  },
  emojiGrid: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emojiGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    paddingBottom: 8,
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: EMOJI_BUTTON_WIDTH,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emojiText: {
    fontSize: 32,
  },
  categoryContainer: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    height: 50,
  },
  categoryScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  categoryTab: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  categoryTabActive: {
    backgroundColor: '#e0e0e0',
  },
  categoryEmoji: {
    fontSize: 24,
    opacity: 0.6,
  },
  categoryEmojiActive: {
    opacity: 1,
  },
});

