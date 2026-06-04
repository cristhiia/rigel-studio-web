import React, { useRef } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';

import { theme } from './src/theme';
import RigelHeader from './src/components/RigelHeader';
import Hero from './src/components/Hero';
import Manifesto from './src/components/Manifesto';
import Biography from './src/components/Biography';
import CaseStudies from './src/components/CaseStudies';
import ContactForm from './src/components/ContactForm';
import RigelBackground from './src/RigelBackground';

export default function App() {
  const scrollViewRef = useRef(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  if (!fontsLoaded) {
    return null; // Return empty view or a loading spinner
  }

  const scrollToContact = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const noiseStyle = Platform.OS === 'web' ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: 0.04,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  } : {};

  return (
    <>
      {Platform.OS === 'web' && <RigelBackground />}
      <View style={styles.container}>
      {Platform.OS === 'web' && <View style={noiseStyle} />}
      <RigelHeader scrollY={scrollY} />
      <Animated.ScrollView 
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
      >
        <View style={styles.section}><Hero /></View>
        <View style={styles.section}><Biography /></View>
        <View style={styles.section}><CaseStudies /></View>
        <View style={styles.section}><ContactForm /></View>
      </Animated.ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    // Web specific CSS for snap scrolling
    ...(Platform.OS === 'web' ? { scrollSnapType: 'y mandatory' } : {}),
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    height: Dimensions.get('window').height,
    width: '100%',
    // Web specific CSS for snap child
    ...(Platform.OS === 'web' ? { scrollSnapAlign: 'start' } : {}),
  },
});
