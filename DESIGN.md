---
version: alpha
name: PAYSAVE
summary: Apple-inspired enterprise FinTech system using blue, green, white, glass surfaces, and restrained minimalism.
description: Calm, trustworthy and modern operating-system UI for PAYSAVE Recovery staff, partners, supervisors and field agents.
colors:
  primary: "#0A66C2"
  primary-hover: "#0958A8"
  secondary: "#10734F"
  secondary-hover: "#0B5F41"
  background: "#F4F7FB"
  surface: "#FFFFFF"
  foreground: "#0B1220"
  muted: "#EAF0F6"
  muted-foreground: "#5D6B7C"
  border: "#DCE4EE"
  danger: "#B42318"
  warning: "#B54708"
  info: "#175CD3"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  h1:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 1.75rem
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.005em"
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, IBM Plex Sans Thai, Noto Sans Thai, sans-serif"
    fontSize: 0.8125rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  button-success:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  table-header:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    padding: 12px
  dialog-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: 24px
---

## Overview

PAYSAVE uses calm Apple-inspired minimalism for high-trust field recovery operations. Blue communicates trust and action, green communicates verified progress and financial success, and white preserves clarity. Glass is used only for elevated navigation, authentication and dialogs; operational tables remain crisp and solid.

## Colors

- **PAYSAVE Blue:** Primary actions, links, selection and keyboard focus. White text passes WCAG AA.
- **Recovery Green:** Confirmed, completed and successful states. Use the dark green token for text-bearing controls.
- **White:** Primary content surface. Never use glass where dense information needs maximum readability.
- **Ink:** Main text color. Avoid pure black.
- **Muted Blue Gray:** Page backgrounds, separators and secondary regions.
- Danger and warning colors are reserved for real risk; they are never decorative.

## Typography

Use the Apple system font stack first for speed and platform familiarity. IBM Plex Sans Thai and Noto Sans Thai are controlled Thai fallbacks. Headlines use restrained negative tracking; Thai body text uses generous line height. Never use more than three weights on one screen.

## Layout

Use a 4px base grid. Common gaps are 8, 12, 16, 24, 32 and 48px. Desktop application layouts use a 12-column grid; tablet uses 8 columns; mobile uses 4 columns. Content width is capped around 1280px and horizontal page padding scales from 16px to 32px.

## Elevation & Depth

Default cards use a low blue-gray shadow. Elevated cards and dialogs use a soft multi-layer shadow. Glass surfaces use 68–88% white with 20–24px backdrop blur and a white translucent border. Never stack multiple glass layers.

## Shapes

Controls use 12px radius, compact controls use 8px, standard cards use 24px and prominent glass/dialog surfaces use 32px. Pills are reserved for status, filters and compact metadata.

## Components

- **Button:** Minimum height 44px. One primary action per region. Use green only for confirm/success actions.
- **Card:** Solid white by default; glass only on visually elevated, low-density surfaces.
- **Input:** Visible label, persistent focus ring, explicit error message and `aria-invalid` state.
- **Table:** Sticky-capable header, 48px minimum row target, restrained hover state and horizontal mobile scrolling.
- **Dialog:** Native focus trapping through Radix UI, clear title, concise description, mobile-safe width and obvious close action.

## Do's and Don'ts

- Do preserve generous white space and one clear action hierarchy.
- Do use blue for navigation/action and green for verified outcomes.
- Do keep Thai labels short and comfortable to scan.
- Do meet WCAG AA and show keyboard focus.
- Don't use noisy gradients, neon glow, dense glass or oversized shadows.
- Don't place more than four accent colors on one screen.
- Don't imitate old ERP tables, Canva cards or government dashboards.
- Don't use color as the only indicator of status.
