import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { theme } from '../theme';

export default function Navbar({ onContactPress }) {
  const [hovered, setHovered] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.textLogo}>C.</Text>
        </View>
        
        <View style={styles.navLinks}>
          <Pressable 
            onHoverIn={() => setHovered('estratega')} 
            onHoverOut={() => setHovered(null)}
          >
            <Text style={[styles.navLink, hovered === 'estratega' && styles.navLinkHover]}>El Estratega</Text>
          </Pressable>
          <Pressable 
            onHoverIn={() => setHovered('casos')} 
            onHoverOut={() => setHovered(null)}
          >
            <Text style={[styles.navLink, hovered === 'casos' && styles.navLinkHover]}>Casos de Estudio</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', // Navbar invisible por encima de las secciones
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: theme.spacing.xl,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textLogo: {
    fontFamily: theme.fonts.title,
    fontSize: 48,
    color: '#191970',
    letterSpacing: -2,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 32,
  },
  navLink: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: '#36454F',
    textTransform: 'uppercase',
    letterSpacing: 2,
    transitionDuration: '0.3s', // CSS transiciones para suavidad en web
  },
  navLinkHover: {
    color: '#4682B4', // Azul Acero
  },
});
