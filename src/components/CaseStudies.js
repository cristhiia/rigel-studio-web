import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { theme } from '../theme';

const projects = [
  {
    id: '1',
    title: 'Keelwise',
    tag: 'Fintech & UX',
    problem: 'Falta de educación financiera y herramientas de gestión desconectadas de la realidad del usuario.',
    solution: 'Desarrollo de un gestor de gastos con un coach financiero de tono argentino que detecta patrones de consumo y se adapta a las etapas de vida del usuario.'
  },
  {
    id: '2',
    title: 'Qué Tomamos',
    tag: 'Desarrollo & Lógica',
    problem: 'Dificultad para elegir el vino perfecto para cada comida en el mercado de San Juan, Argentina.',
    solution: 'Desarrollo de una interfaz minimalista e integración de un motor de recomendaciones precisas basadas en maridaje.'
  },
  {
    id: '3',
    title: 'Gestión & Operaciones',
    tag: 'Sistemas & AI',
    problem: 'Cuellos de botella en el diagnóstico y gestión operativa de mantenimiento.',
    solution: 'Arquitectura de interfaz orientada a la eficiencia operativa e integración de diagnóstico asistido, reduciendo el margen de error técnico.'
  }
];

export default function CaseStudies() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Casos de Estudio</Text>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
          contentContainerStyle={styles.carouselContent}
          decelerationRate="fast"
          snapToInterval={null} // Default behavior for pagingEnabled
        >
          {projects.map((project, index) => (
            <View key={project.id} style={styles.cardContainer}>
              <Animated.View 
                entering={FadeInUp.delay(300).duration(1200)}
                style={styles.card}
              >
                <View style={styles.tagContainer}>
                  <Text style={styles.tag}>{project.tag}</Text>
                </View>
                <Text style={styles.title}>{project.title}</Text>
                
                <View style={[styles.textGroup, styles.problemGroup]}>
                  <Text style={styles.label}>Problema:</Text>
                  <Text style={styles.text}>{project.problem}</Text>
                </View>
                
                <View style={styles.textGroup}>
                  <Text style={styles.label}>Solución:</Text>
                  <Text style={styles.text}>{project.solution}</Text>
                </View>
              </Animated.View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Will expand to fill the section container in App.js
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
  },
  sectionTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 32,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl, // Keep title aligned with other sections
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  carousel: {
    width: '100%',
  },
  carouselContent: {
    alignItems: 'center',
  },
  cardContainer: {
    width: typeof window !== 'undefined' ? window.innerWidth : 400, // On web fallback to simple width
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 800,
    padding: theme.spacing.xxl,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagContainer: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: theme.spacing.m,
  },
  tag: {
    fontFamily: theme.fonts.button,
    fontSize: 10,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 24,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.l,
  },
  textGroup: {
    marginBottom: theme.spacing.m,
  },
  problemGroup: {
    marginBottom: theme.spacing.xl, // Increased margin as requested
  },
  label: {
    fontFamily: theme.fonts.button,
    fontSize: 12,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  text: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
