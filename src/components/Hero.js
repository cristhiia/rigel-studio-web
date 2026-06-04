import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { theme } from '../theme';

export default function Hero() {
  return (
    <View style={styles.wrapper}>
      {/* El contenido central ahora está manejado globalmente por RigelHeader.js */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
});
