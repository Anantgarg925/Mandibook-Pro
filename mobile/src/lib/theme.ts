import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
// Base width standard (e.g., iPhone 12/13/14 Pro is 390, Android is ~360-380)
const guidelineBaseWidth = 380;

// Dynamic scaling function
const scale = (size: number) => (width / guidelineBaseWidth) * size;
// Moderate scale to ensure components don't shrink or grow excessively
export const ms = (size: number, factor = 0.4) => Math.round(size + (scale(size) - size) * factor);

export const Colors = {
  primary: '#1B5E20',
  primaryLight: '#2E7D32',
  primaryPressed: '#145214',
  success: '#2E7D32',
  warning: '#E65100',
  danger: '#B71C1C',
  info: '#0D47A1',
  background: '#F0F4F0',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecond: '#546E57',
  border: '#C8E6C9',
  headerBg: '#1B5E20',
} as const;

export const Spacing = {
  xs: ms(4),
  sm: ms(8),
  md: ms(14),
  lg: ms(20),
  xl: ms(28),
} as const;

export const FontSize = {
  xs: ms(11),
  sm: ms(12),
  md: ms(14),
  lg: ms(16),
  xl: ms(20),
  xxl: ms(24),
} as const;

export const Radius = {
  sm: ms(8),
  md: ms(12),
  lg: ms(14),
  round: 999,
} as const;

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
