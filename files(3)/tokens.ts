// Colors, spacing and text sizes taken from the Stitch design (tailwind config).
export const colors = {
  surface: '#0e131d',
  card: '#1b202a',
  cardLow: '#171c26',
  cardHigh: '#252a35',
  text: '#dee2f1',
  textDim: '#bacac5',
  outline: '#859490',
  primary: '#57f1db',
  teal: '#2dd4bf',
  onTeal: '#00574d',
  green: '#4edea3',
  amber: '#ffad3a',
  amberText: '#ffd29f',
  red: '#ffb4ab',
};
export const radius = { sm: 8, md: 12, lg: 16, full: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const type = {
  headline: { fontSize: 26, lineHeight: 34, fontWeight: '600' as const },
  headlineMd: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const },
  title: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  body: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
  bodySm: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  labelSm: { fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
};
