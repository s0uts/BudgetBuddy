/**
 * BudgetBuddy Design System — Theme Tokens
 * Lilac/purple + white + gold palette
 */

export const Colors = {
  // Brand
  primary: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  gold: '#F4B942',
  goldLight: '#FDE68A',

  // Backgrounds
  background: '#FFFFFF',
  surface: '#F5F3FF',
  surfaceElevated: '#EDE9FE',

  // Borders
  border: '#E9D5FF',
  borderLight: '#F3E8FF',

  // Text
  textPrimary: '#1E1B4B',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Chart palette (sunburst ring colors)
  chart: [
    '#8B5CF6', // primary purple
    '#A78BFA', // light purple
    '#C4B5FD', // lighter purple
    '#F4B942', // gold
    '#FDE68A', // light gold
    '#10B981', // success green
    '#6EE7B7', // light green
    '#3B82F6', // blue
    '#93C5FD', // light blue
    '#EF4444', // danger red
    '#FCA5A5', // light red
    '#F59E0B', // amber
  ],
} as const;

export const Typography = {
  // Font family
  fontFamily: 'Inter',
  fontFamilyBold: 'Inter_700Bold',
  fontFamilySemiBold: 'Inter_600SemiBold',
  fontFamilyMedium: 'Inter_500Medium',
  fontFamilyRegular: 'Inter_400Regular',

  // Sizes
  heading1: 28,
  heading2: 24,
  heading3: 20,
  subheading: 18,
  body: 15,
  bodySmall: 13,
  caption: 12,
  tiny: 10,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  screen: 16,   // horizontal screen padding
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
  circle: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
} as const;

export default Theme;
