import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, withTiming, useSharedValue, Easing } from 'react-native-reanimated';
import { theme } from '../theme';

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

export default function RigelHeader({ scrollY }) {
  const isHovered = useSharedValue(0);

  // Animated styles for the main container (moving and scaling based on scroll)
  const containerStyle = useAnimatedStyle(() => {
    // Escala desde un tamaño gigante (ej. scale 4) en el centro, a scale 1 en la esquina
    const scale = interpolate(
      scrollY.value,
      [0, windowHeight * 0.8],
      [5, 1],
      Extrapolate.CLAMP
    );

    // Mover desde el centro (mitad del height/width) a la esquina superior izquierda
    const translateY = interpolate(
      scrollY.value,
      [0, windowHeight * 0.8],
      [windowHeight / 2 - 50, 40], // 50 is half approx height, 40 is top padding
      Extrapolate.CLAMP
    );

    const translateX = interpolate(
      scrollY.value,
      [0, windowHeight * 0.8],
      [windowWidth / 2 - 40, theme.spacing.xl], // Center to left padding
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateY },
        { translateX },
        { scale }
      ]
    };
  });

  // Animated styles for hover reveal text "IGEL"
  const textRevealStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isHovered.value ? 120 : 0, { duration: 400, easing: Easing.out(Easing.exp) }),
      opacity: withTiming(isHovered.value ? 1 : 0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  // Animated styles for "STUDIO" dropping down
  const studioRevealStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isHovered.value ? 1 : 0, { duration: 400 }),
      transform: [
        { translateY: withTiming(isHovered.value ? 25 : 0, { duration: 400, easing: Easing.out(Easing.exp) }) }
      ]
    };
  });

  return (
    <Animated.View style={[styles.absoluteContainer, containerStyle]}>
      <Pressable 
        onHoverIn={() => { isHovered.value = 1; }}
        onHoverOut={() => { isHovered.value = 0; }}
        style={styles.pressableArea}
      >
        <View style={styles.logoRow}>
          <Animated.Text style={styles.rLetter}>R</Animated.Text>
          <Animated.View style={textRevealStyle}>
            <Animated.Text style={styles.restLetters} numberOfLines={1}>IGEL</Animated.Text>
          </Animated.View>
          <Animated.Text style={styles.dot}> •</Animated.Text>
        </View>
        <Animated.View style={[styles.studioContainer, studioRevealStyle]}>
          <Animated.Text style={styles.studioText}>STUDIO</Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableArea: {
    padding: 10,
    position: 'relative',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rLetter: {
    fontFamily: theme.fonts.title,
    fontSize: 48,
    color: theme.colors.textPrimary,
  },
  restLetters: {
    fontFamily: theme.fonts.title,
    fontSize: 48,
    color: theme.colors.textPrimary,
    letterSpacing: 2,
  },
  dot: {
    fontFamily: theme.fonts.title,
    fontSize: 48,
    color: theme.colors.accent,
  },
  studioContainer: {
    position: 'absolute',
    left: 12,
    top: 15,
  },
  studioText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    letterSpacing: 6,
  }
});
