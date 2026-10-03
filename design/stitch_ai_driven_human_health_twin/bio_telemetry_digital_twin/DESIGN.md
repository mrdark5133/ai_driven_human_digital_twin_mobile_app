---
name: Bio-Telemetry Digital Twin
colors:
  surface: '#0c1321'
  surface-dim: '#0c1321'
  surface-bright: '#323949'
  surface-container-lowest: '#070e1c'
  surface-container-low: '#151b2a'
  surface-container: '#19202e'
  surface-container-high: '#232a39'
  surface-container-highest: '#2e3544'
  on-surface: '#dce2f6'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dce2f6'
  inverse-on-surface: '#2a3040'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#45dfa4'
  on-tertiary: '#003825'
  tertiary-container: '#00bd85'
  on-tertiary-container: '#00452e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#68fcbf'
  tertiary-fixed-dim: '#45dfa4'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#0c1321'
  on-background: '#dce2f6'
  surface-variant: '#2e3544'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-metric:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.03em
  headline-metric-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-caps-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-caps-xs:
    fontFamily: Inter
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.12em
  data-mono:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-tablet: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system embodies an advanced clinical-grade aesthetic combined with human-centric computational biology. It translates complex continuous physiological signals into an intuitive, calm, and hyper-precise digital twin interface.

The design movement merges **Glassmorphism** with **Technical Precision Minimalist UI**:
- **Tone:** Authoritative, predictive, reassuring, and analytical.
- **Visual Tension:** Pitch-deep biological dark space set against luminous diagnostic cyan pulses, presenting human health data with the clarity of mission control telemetry.
- **Experience Goals:** Eliminate medical anxiety through pristine data visualization, low-noise cognitive loads, and instant visual triage via chromatic status signaling.

## Colors

The palette is engineered specifically for deep-tier OLED mobile displays, minimizing ocular fatigue while creating high dynamic range for vital telemetry readings.

### Role Tokens & Color Specifications
- **Canvas Base (`neutral`):** `#0B1220` (Deep oceanic navy void, absorbing unnecessary screen emission).
- **Surface Elevation 1 (Cards):** `#121B2E` with boundary strokes set to `#1E293B`.
- **Surface Elevation 2 (Overlays/Floating Dock):** `rgba(18, 27, 46, 0.72)` with a 16px backdrop-blur filter.
- **Primary Accent (`secondary`):** `#06B6D4` (Deep cyan for active system states, selected telemetry vectors, and primary CTAs).
- **Bio-Glow Accent (`primary`):** `#22D3EE` (High-radiance energetic cyan for real-time live pulses, sparklines, and active twin nodes).
- **Diagnostic Triage Palette:**
  - **Optimal / Dynamic Equilibrium:** `#34D399` (Bio-emerald)
  - **Latent Variance / Caution:** `#FBBF24` (Amber alert)
  - **Pathology / Critical Threshold:** `#F87171` (Rose distress)
- **Typographic Neutral Spectrum:**
  - **Headings & Scalar Values:** `#F8FAFC` (High-contrast pure clinical white)
  - **Body & Graph Metadata:** `#94A3B8` (Legible slate)
  - **Micro-labels, Ticks & Units:** `#64748B` (Muted secondary slate)

## Typography

The typographic hierarchy separates analytical data parsing from conversational context.

- **Data & Display Layer (`Space Grotesk`):** Leveraged for all critical biometric integers, percentages, heart rate monitors, and structural headers. The geometric construction lends a computational, high-tech instrument feel.
- **Narrative & System Layer (`Inter`):** Leveraged across diagnostic interpretations, AI clinician insights, and interactive components to guarantee readability at scale.
- **Micro-Label Protocols:** All functional status tags, timestamp trackers, and dimensional units (e.g., `BPM`, `MMHG`, `VO2 MAX`) must be styled with `label-caps-md` or `label-caps-xs`, set in forced uppercase with expanded kerning (`0.08em` to `0.12em`) to maintain legibility when mapped inside compressed telemetry cards.

## Layout & Spacing

Designed fundamentally around a single-column, thumb-zone optimized mobile viewport (390px to 428px canonical base) that transitions seamlessly into a dense 2-column or 3-column dashboard on foldable and tablet surfaces.

- **Mobile Grid Model:** 4 fluid columns with `0.75rem` (`12px`) gutters and an outer protective margin of `1rem` (`16px`).
- **Telemetry Stacking:** Vertical rhythm adheres strictly to multiples of 4px. Metric clusters use `space-xs` (4px) or `space-sm` (8px) for title-to-value association. Related vitals widgets are grouped via `space-md` (16px), while distinct anatomical systems (e.g., Cardiovascular vs. Metabolic) are partitioned by `space-xl` (28px).
- **Responsive Handling:** 
  - `< 600px`: Single vertical stack; complex twin visualizations pin to top 40% viewport height with horizontal scroll chips below.
  - `600px - 1024px`: Side-by-side splits; anatomical digital twin model pinned to the left column, telemetry streams stacked within a dual-column layout to the right.

## Elevation & Depth

Spatial layering relies on glass-morphic luminescence and calibrated luminance borders rather than traditional physical dropshadows, ensuring black levels remain pristine.

- **Level 0 (Base Canvas):** Solid `#0B1220`. 
- **Level 1 (Sub-surface Modules & Cards):** Flat `#121B2E` with a solid 1px stroke of `#1E293B`.
- **Level 2 (Active Telemetry & Floating Cards):** Glassmorphic fill `rgba(18, 27, 46, 0.70)`, backdrop-filter `blur(20px)`, top-lit inner border gradient (`linear-gradient(180deg, rgba(34, 211, 238, 0.25) 0%, rgba(30, 41, 59, 0.4) 100%)`).
- **Level 3 (Diagnostic Focus / Overlays / Sheets):** Fill `rgba(11, 18, 32, 0.88)` with `blur(28px)` and an ambient aura glow (`box-shadow: 0 0 32px -8px rgba(6, 182, 212, 0.18)`).
- **The Bio-Glow Paradigm:** Glowing highlights are reserved exclusively for active biometric status. Dynamic vitals cards project an outward blur (`0 0 20px rgba(34, 211, 238, 0.12)`) that increases in frequency or pulse speed relative to telemetry severity.

## Shapes

The design system enforces organic, continuous curvature to evoke organic human anatomy while preserving technical rigor.

- **Standard Radius:** All interactive cards, modal sheets, and primary diagnostic containers feature an explicit `20px` radius (represented by `rounded-xl` in the scaled context).
- **Pill Primitives:** Buttons, interactive tags, vital metric badges, and scrub bars feature full-height pill profiles (`border-radius: 9999px`).
- **Data Rings & Gauges:** Segmented circular strokes with rounded stroke-caps to eliminate abrasive hard stops on biometric progress indicators.

## Components

### 1. Telemetry Cards (Vitals Pods)
- **Structure:** Surface `#121B2E` with a 1px `#1E293B` boundary, rounded to 20px. Internal padding set to `16px`.
- **Content Flow:** Upper row displays the micro-label in uppercase muted text (`#64748B`) paired with an SVG telemetry icon tinted in Cyan (`#22D3EE`). Mid-row displays the scalar metric (`Space Grotesk`, 26px, `#F8FAFC`) with inline micro-unit (`#94A3B8`). Lower row incorporates dynamic SVG sparklines or multi-segment progress bars.

### 2. Buttons
- **Primary Glow Button:** Fully rounded pill (`9999px`), background gradient `linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%)`, text `#0B1220` (`Inter`, 14px, SemiBold). Features an ambient hover/active drop shadow `0 0 16px rgba(34, 211, 238, 0.4)`.
- **Secondary Ghost Action:** Pill container, transparent background, 1px border `#1E293B`, text `#F8FAFC`. Active state shifts border to `#06B6D4` with surface tint `rgba(6, 182, 212, 0.08)`.

### 3. Diagnostic Chips & Filter Pills
- Compact height (28px) with full pill border radius.
- Background `rgba(18, 27, 46, 0.6)` with a 1px border `#1E293B`.
- Integrated status dot (6px circle) on the left side: `#34D399` (Healthy), `#FBBF24` (Caution), or `#F87171` (Critical). Text is uppercase 10px tracking `0.08em`.

### 4. Interactive Inputs & Search Fields
- Enclosed 20px rounded containers using `#0F1728` background with an inset 1px stroke `#1E293B`.
- Placeholder text in `#64748B`. Focus state transitions the stroke to `#22D3EE` with a subtle inner cyan glow (`box-shadow: inset 0 0 8px rgba(34, 211, 238, 0.15)`).

### 5. Checkboxes & Radio Selectors
- Checkboxes: 20px squared boxes with 6px corner radii. Default border 1.5px `#1E293B`. Checked state fills `#06B6D4` with an `#0B1220` check glyph and outer cyan halo.
- Radio Selectors: 20px circular profile with a concentric radiating dot on selection.

### 6. Domain-Specific Component: The Digital Twin Organ-Scan Dock
- A floating persistent glass navigation controller docked at the bottom screen edge (`margin: 16px`, height: 64px, radius: 24px, glassmorphic elevation 2).
- Contains localized SVG anatomical icons (Brain, Heart, Genome, Vitals) that light up with localized `#22D3EE` glows when that specific biological system requires attention or analysis.