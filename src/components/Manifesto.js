import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { theme } from '../theme';

export default function Manifesto() {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(600).duration(800)}>
        <View style={styles.content}>
          <View style={styles.line} />
          <Text style={styles.title}>Menos ruido. Más lógica.</Text>
          <Text style={styles.text}>
            La mayoría se enamora de la tecnología; yo me enfoco en el negocio. Si un sistema no agiliza procesos, no mejora ventas o no ahorra tiempo, es código muerto. Mi trabajo es darte la arquitectura digital exacta para que tu proyecto despegue.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    backgroundColor: 'transparent',
  },
  content: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  line: {
    width: 40,
    height: 1,
    backgroundColor: theme.colors.accent,
    marginBottom: theme.spacing.l,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 32,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.m,
  },
  text: {
    fontFamily: theme.fonts.body,
    fontSize: 18,
    color: theme.colors.textSecondary,
    lineHeight: 28,
    maxWidth: 700,
  },
});
