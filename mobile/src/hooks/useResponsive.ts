import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < 360;       // iPhone SE, small Androids
  const isMedium = width < 430;      // Standard phones
  const isLarge = width >= 430;      // Pro Max, large Androids, tablets

  // Horizontal padding that scales with screen width
  const hPad = isSmall ? 12 : isMedium ? 16 : 20;

  // Max content width for centering on large screens/tablets
  const maxContentWidth = Math.min(width, 600);
  const contentHPad = isLarge ? (width - maxContentWidth) / 2 + hPad : hPad;

  // Font scaling factor
  const fontScale = isSmall ? 0.9 : 1;

  // Dynamic input width for form rows (e.g. charges screen)
  const rowInputWidth = Math.round(width * 0.24);

  // Grade code input width
  const codeInputWidth = isSmall ? 46 : 54;

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    hPad,
    contentHPad,
    fontScale,
    rowInputWidth,
    codeInputWidth,
    maxContentWidth,
  };
}
