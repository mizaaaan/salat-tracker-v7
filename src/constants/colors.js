// Two full palettes — Dark Teal theme (inspired by Muslim Pro screenshot)

export const darkColors = {
  // Backgrounds — deep dark teal from screenshot hero area
  background:   '#071C1E',   // near-black dark teal
  card:         '#101C1E',   // dark teal card
  cardLight:    '#162425',   // slightly lighter teal card
  cardGlow:     '#1A2E30',   // teal glow

  // Brand — gold stays, pairs beautifully with dark teal
  primary:      '#C9A84C',   // Gold (unchanged)
  primaryLight: '#E8C875',
  primaryDim:   '#C9A84C30',

  // Accent — teal/olive from screenshot
  blue:         '#1AB87A',   // teal-green (bottom nav active + "See More" color)
  purple:       '#7A8830',   // olive (arc right-side tone)
  night:        '#091A1C',   // deep teal for next-prayer card

  // Text
  text:         '#FFFFFF',   // pure white (screenshot text)
  textSecondary:'#8AA4A6',   // muted teal-gray (prayer time secondary text)
  textMuted:    '#3D5A5C',   // dark muted teal

  // UI
  border:       '#1A3436',   // teal border
  divider:      '#122628',   // dark teal divider
  overlay:      'rgba(0,0,0,0.6)',

  // Status
  success:      '#1AB87A',   // teal green (matches accent)
  successDim:   '#1AB87A20',
  warning:      '#FF9800',
  danger:       '#F44336',
};

export const lightColors = {
  // Backgrounds — light teal/mint for light mode
  background:   '#F0F8F8',   // soft teal white
  card:         '#FFFFFF',
  cardLight:    '#E8F5F5',   // very light teal tint
  cardGlow:     '#D4ECEC',   // light teal glow

  // Brand
  primary:      '#A9852E',   // Gold (unchanged)
  primaryLight: '#C9A84C',
  primaryDim:   '#A9852E22',

  // Accent
  blue:         '#0D8A68',   // darker teal for light mode readability
  purple:       '#5A6A20',   // olive for light mode
  night:        '#D8ECEC',   // soft teal card equivalent

  // Text
  text:         '#071C1E',   // deep dark teal text
  textSecondary:'#2E5055',   // muted teal text
  textMuted:    '#5A7880',   // light teal muted

  // UI
  border:       '#B8D8DA',   // light teal border
  divider:      '#D0E8E8',   // soft teal divider
  overlay:      'rgba(0,0,0,0.45)',

  // Status
  success:      '#0D8A68',
  successDim:   '#1AB87A20',
  warning:      '#F57C00',
  danger:       '#D32F2F',
};

// Back-compat fallback
export const Colors = darkColors;
