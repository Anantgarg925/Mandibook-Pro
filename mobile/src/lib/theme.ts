import { Dimensions, PixelRatio } from 'react-native';

const { width } = Dimensions.get('window');

// Modern, extremely subtle moderate scaling factor (15%) for screen-size adaptability
export const ms = (size: number, factor = 0.15) => {
  const scale = (width / 375) * size;
  return Math.round(size + (scale - size) * factor);
};

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

// Professional compact 4px grid for elite spacing
export const Spacing = {
  xs: ms(4),
  sm: ms(8),
  md: ms(12),  // 12px instead of 16px makes layout significantly tighter and premium
  lg: ms(18),  // 18px instead of 24px
  xl: ms(24),  // 24px instead of 32px
} as const;

// Premium compact Material/Apple typography scale
export const FontSize = {
  xs: ms(10),  // Extremely crisp small footnotes
  sm: ms(12),  // Premium small text / labels
  md: ms(14),  // Standard body text used in premier apps (WhatsApp, Twitter/X)
  lg: ms(16),  // Sub-headers / primary actions
  xl: ms(20),  // Screen / Card titles
  xxl: ms(24), // Heavy hero display titles
} as const;

// Crisp, refined roundness
export const Radius = {
  sm: ms(6),   // Small chips / inputs
  md: ms(10),  // Standard cards
  lg: ms(14),  // Modal bottom sheets
  round: 999,
} as const;

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
