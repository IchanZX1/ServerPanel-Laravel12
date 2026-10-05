# Zireku OTP

## Mission
Create implementation-ready, token-driven UI guidance for Zireku OTP that is optimized for consistency, accessibility, and fast delivery across dashboard web app.

## Brand
- Product/brand: Zireku OTP
- URL: https://otp.zireku.com/
- Audience: authenticated users and operators
- Product surface: dashboard web app

## Style Foundations
- Visual style: clean, functional, implementation-oriented
- Main font style: `font.family.primary=Outfit`, `font.family.stack=Outfit, sans-serif`, `font.size.base=40px`, `font.weight.base=400`, `font.lineHeight.base=40px`
- Typography scale: `font.size.xs=11.52px`, `font.size.sm=12.48px`, `font.size.md=13.6px`, `font.size.lg=13.92px`, `font.size.xl=14px`, `font.size.2xl=14.4px`, `font.size.3xl=16px`, `font.size.4xl=16.8px`
- Color palette: `color.text.primary=#41525d`, `color.text.secondary=#6c757d`, `color.text.tertiary=#212529`, `color.surface.muted=#ffffff`, `color.surface.base=#000000`, `color.surface.raised=#222222`, `color.border.strong=#d1d7db`
- Spacing scale: `space.1=4px`, `space.2=6px`, `space.3=6.4px`, `space.4=8px`, `space.5=10px`, `space.6=12px`, `space.7=13.6px`, `space.8=16px`
- Radius/shadow/motion tokens: `radius.xs=5px`, `radius.sm=6px`, `radius.md=8px`, `radius.lg=12px`, `radius.xl=50px` | `shadow.1=rgba(15, 23, 42, 0.12) 0px 12px 32px -12px` | `motion.duration.instant=150ms`, `motion.duration.fast=200ms`, `motion.duration.normal=300ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: buttons (24), links (20), cards (20), lists (12), inputs (1), navigation (1).

- Extraction diagnostics: Audience and product surface inference confidence is low; verify generated brand context.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
