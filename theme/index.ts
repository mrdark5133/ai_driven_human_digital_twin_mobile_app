/**
 * Design System Theme & Color Tokens
 * Clinical-grade biological dark canvas with glowing cyan, emerald and amber triage accents.
 */

export const colors = {
  // Base Canvas & Surface Hierarchy
  background: '#0c1321',
  surface: '#0c1321',
  surfaceDim: '#0c1321',
  surfaceBright: '#323949',
  surfaceContainerLowest: '#070e1c',
  surfaceContainerLow: '#151b2a',
  surfaceContainer: '#19202e',
  surfaceContainerHigh: '#232a39',
  surfaceContainerHighest: '#2e3544',

  // Typography & Text Tones
  onSurface: '#dce2f6',
  onSurfaceVariant: '#bcc9cd',
  onBackground: '#dce2f6',
  inverseSurface: '#dce2f6',
  inverseOnSurface: '#2a3040',
  outline: '#869397',
  outlineVariant: '#3d494c',

  // Bio-Radiant Primary Accent (Cyan / Aqua)
  primary: '#4cd7f6',
  onPrimary: '#003640',
  primaryContainer: '#06b6d4',
  onPrimaryContainer: '#00424f',
  primaryFixed: '#acedff',
  primaryFixedDim: '#4cd7f6',
  onPrimaryFixed: '#001f26',
  onPrimaryFixedVariant: '#004e5c',
  surfaceTint: '#4cd7f6',

  // Energetic Secondary Cyan
  secondary: '#5de6ff',
  onSecondary: '#00363e',
  secondaryContainer: '#00cbe6',
  onSecondaryContainer: '#00515d',
  secondaryFixed: '#a2eeff',
  secondaryFixedDim: '#2fd9f4',
  onSecondaryFixed: '#001f25',
  onSecondaryFixedVariant: '#004e5a',

  // Tertiary Equilibrium (Bio-Emerald / Mint)
  tertiary: '#45dfa4',
  onTertiary: '#003825',
  tertiaryContainer: '#00bd85',
  onTertiaryContainer: '#00452e',
  tertiaryFixed: '#68fcbf',
  tertiaryFixedDim: '#45dfa4',
  onTertiaryFixed: '#002114',
  onTertiaryFixedVariant: '#005137',

  // Diagnostic Triage Palettes
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  // Amber / Warning Alerts
  warning: '#fbbf24',
  warningContainer: '#78350f',
  amberAccent: '#f59e0b',
  indigoAccent: '#818cf8',
  roseAccent: '#ff758f',
};

export const spacing = {
  spaceXs: 4,
  spaceSm: 8,
  spaceMd: 16,
  spaceLg: 20,
  spaceXl: 28,
  margin: 16,
  gutter: 12,
  gutterTablet: 16,
  marginTablet: 24,
};

export const radii = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  displayLg: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  displayLgMobile: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  headlineMetric: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.9,
  },
  headlineMetricMobile: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  titleMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  labelCapsMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  labelCapsXs: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  dataMono: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
};
