/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        // Fondo lino/crema anti-deslumbramiento
        cream: { DEFAULT: '#FBF9F5', deep: '#F4F0E8' },
        // Tarjetas de preguntas
        card: '#FFFFFF',
        // Verde salvia/matcha: acciones principales, estados activos y aciertos
        matcha: {
          50: '#F2F5F1',
          100: '#E4EAE2',
          200: '#CAD5C7',
          300: '#AEBCAA',
          DEFAULT: '#8A9A86',
          600: '#72836E',
          700: '#5B6A58',
          800: '#465244',
        },
        // Beige/rosa empolvado: etiquetas, píldoras y acentos suaves
        blush: {
          50: '#FBF6F2',
          100: '#F5EBE4',
          DEFAULT: '#E8D5C8',
          600: '#C7A995',
          700: '#9C7D69',
        },
        // Gris grafito suave para lectura
        main: { DEFAULT: '#2D312E', soft: '#5C625D', muted: '#8B908C' },
        // Rojo empolvado para fallos, sin agresividad
        error: {
          50: '#FCF1F1',
          100: '#F7E0E1',
          DEFAULT: '#E5989B',
          600: '#C9767A',
          700: '#A55A5E',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(45,49,46,0.04), 0 8px 24px -12px rgba(45,49,46,0.12)',
        lift: '0 2px 4px rgba(45,49,46,0.05), 0 16px 32px -16px rgba(45,49,46,0.18)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 300ms ease-out both',
        breathe: 'breathe 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
