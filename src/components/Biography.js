import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { theme } from '../theme';

export default function Biography() {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(700).duration(800)}>
        <View style={styles.content}>
          <Text style={styles.title}>El estratega en la sombra.</Text>
          <Text style={styles.text}>
            Soy Gabriel Gallego, Director de Proyectos y Desarrollador de Software con base en San Juan. Mi perfil no es el de un programador tradicional; vengo de gestionar proyectos complejos donde los sistemas, las operaciones y el código se cruzan. Entiendo que la tecnología es solo un puente hacia el crecimiento. Por eso, mi enfoque siempre es dual: visión estratégica de negocio y una ejecución técnica impecable. No me siento a escribir líneas de código hasta no entender perfectamente cómo gana dinero tu empresa.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Will expand to fill the section container in App.js
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: 'transparent',
  },
  content: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#191970', // Azul Noche
    paddingLeft: theme.spacing.l,
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
  },
});
