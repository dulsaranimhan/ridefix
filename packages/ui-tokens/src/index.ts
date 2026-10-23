// RideFix visual style. Light backgrounds, dark text and panels, orange-gradient primary actions.
// Apps import these instead of hard-coding colours, so the look stays the same everywhere.

export const colors = {
  background: '#FFFFFF',
  surface: '#F4F5F7',
  surfaceAlt: '#E9EBEF',
  border: '#DADDE3',
  text: '#14161A',
  textMuted: '#5B616E',
  panel: '#1E2128',
  onPanel: '#FFFFFF',
  primary: '#FBBA00',
  accent: '#FF6B3D',
  onPrimary: '#14161A',
  success: '#1E9E5A',
  danger: '#D93636',
} as const;

/** Primary action gradient: amber to orange/coral. */
export const primaryGradient = [colors.primary, colors.accent] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const fontSize = { caption: 12, body: 15, subtitle: 17, title: 22, display: 28 } as const;

export const fontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;
