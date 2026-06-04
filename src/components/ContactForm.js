import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { theme } from '../theme';
import { supabase } from '../lib/supabase';

export default function ContactForm() {
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [desafio, setDesafio] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!nombre.trim() || !empresa.trim() || !desafio.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (desafio.trim().length < 20) {
      setError('Por favor, cuéntame un poco más sobre el desafío.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: supabaseError } = await supabase
        .from('portfolio_leads')
        .insert([
          { nombre: nombre.trim(), empresa: empresa.trim(), desafio: desafio.trim() }
        ]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setNombre('');
      setEmpresa('');
      setDesafio('');
    } catch (err) {
      console.error('Error al enviar:', err);
      setError('Hubo un error al enviar el mensaje. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(1000).duration(800)}>
        <View style={styles.content}>
          <View style={styles.leftColumn}>
            <Text style={styles.title}>Rigel Studio.</Text>
            <Text style={styles.subtitle}>Desarrollo de software boutique y sistemas de alta eficiencia. Cuéntanos sobre tu operación.</Text>
          </View>

          <View style={styles.rightColumn}>
            {success ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Mensaje recibido. Me pondré en contacto contigo pronto.</Text>
              </View>
            ) : (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Tu Nombre"
                  placeholderTextColor="rgba(25, 25, 112, 0.6)"
                  value={nombre}
                  onChangeText={setNombre}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tu Empresa"
                  placeholderTextColor="rgba(25, 25, 112, 0.6)"
                  value={empresa}
                  onChangeText={setEmpresa}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Volumen de tu operación y desafío técnico principal..."
                  placeholderTextColor="rgba(25, 25, 112, 0.6)"
                  value={desafio}
                  onChangeText={setDesafio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.accent} />
                  ) : (
                    <Text style={styles.buttonText}>Solicitar Evaluación</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xl,
  },
  leftColumn: {
    flex: 4,
    minWidth: 300,
  },
  rightColumn: {
    flex: 6,
    minWidth: 300,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 36,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s,
    textAlign: 'left',
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.textSecondary,
    opacity: 0.8,
    marginBottom: theme.spacing.xl,
    textAlign: 'left',
  },
  form: {
    gap: theme.spacing.m,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: theme.spacing.xl,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent,
    backgroundColor: 'transparent',
    padding: theme.spacing.m,
    fontFamily: theme.fonts.body,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 120,
  },
  button: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.m,
    alignItems: 'center',
    marginTop: theme.spacing.s,
    width: '100%',
  },
  buttonText: {
    fontFamily: theme.fonts.button,
    fontSize: 14,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  errorText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: '#FF6B6B',
    marginBottom: theme.spacing.s,
  },
  successBox: {
    padding: theme.spacing.l,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
  },
  successText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
