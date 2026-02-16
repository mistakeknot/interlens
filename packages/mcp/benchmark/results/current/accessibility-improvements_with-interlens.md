# Solution: Accessibility vs Velocity (With Interlens)

## Applying FLUX Lenses: Pace Layering + Leverage Points

*[Using interlens to search for "system layers leverage points"]*

This isn't an accessibility vs features problem. It's slow-layer debt preventing fast-layer velocity.

## Through Pace Layering: System Layers Operating at Different Speeds

Your system has architectural layers:

**Slow Layer: UI Component Library / Design System**
- Should provide accessible components by default
- Changes infrequently (quarterly/yearly)
- Affects ALL features built on top

**Fast Layer: Product Features**
- Built using components from slow layer
- Changes frequently (weekly/monthly)
- Inherits accessibility from slow layer

## Root Cause: Fast Layer Built Without Accessible Slow Layer

The 200 accessibility issues exist because:
- Features (fast layer) were built without an accessible component foundation (slow layer)
- Each feature implemented its own buttons, forms, modals (no shared components)
- Result: 200 instances of inaccessible patterns across codebase

Current approach treats this as 200 separate bugs to fix. That's why it takes 6-8 weeks.

## Through Leverage Points: Fix the Slow Layer, Not the 200 Symptoms

**Low Leverage**: Fix 200 accessibility issues individually
- Timeline: 6-8 weeks
- Complexity: High (each fix is custom)
- Future: New features will create new accessibility issues

**High Leverage**: Fix the component library (slow layer) once
- Timeline: 1-2 weeks to make 15-20 base components accessible
- Multiplier: Every feature using these components inherits accessibility
- Future: New features start accessible by default

## The Breakthrough Solution

**Week 1-2: Audit and Fix Component Layer (Slow Layer)**

Identify the 15-20 base components used everywhere:
- Button (all variants)
- Form inputs (text, select, checkbox, radio)
- Modal/dialog
- Navigation/menu
- Table
- Card
- Alert/toast

Make these WCAG AA compliant:
- Proper ARIA labels
- Keyboard navigation
- Focus management
- Color contrast
- Screen reader support

**Why this works:**
- 15-20 components is 1-2 weeks of work
- These components are used in 200 places
- Fixing the component fixes all instances automatically

**Week 3-12: Build Features Using Accessible Components**

Team ships committed features:
- Uses newly-accessible components from library
- New features are accessible by default
- No additional accessibility work needed

Old features gradually get accessibility fixes as components are adopted (through natural refactoring).

## Why Previous Optimizations Had Limited Impact

Treating 200 issues as 200 separate problems misses the systemic cause:

**Symptomatic Approach** (current plan):
- Fix issue #1: Button on login page
- Fix issue #2: Button on dashboard
- ...
- Fix issue #200: Button on settings page
- All fixing the SAME root cause (inaccessible button component)

**Systemic Approach** (leverage points):
- Fix: Button component (once)
- Result: All 40 button instances fixed automatically
- Time: 1 day instead of 40 days

## Implementation Plan

**Week 1: Component Audit**
1. List all UI components in codebase
2. Identify 15-20 most-used components
3. Run accessibility audit on COMPONENTS (not whole app)
4. Document patterns needed (ARIA, keyboard, focus)

**Week 2: Component Fixes**
1. Make each component WCAG AA compliant
2. Add accessibility tests to component library
3. Document usage guidelines for team
4. Cost: 2 engineers, 1 week = 2 weeks of capacity

**Week 3-12: Feature Development + Gradual Adoption**
1. New features use accessible components (built-in compliance)
2. Refactor old features to use component library (opportunistic)
3. Track progress: "X% of app using accessible components"

**By Week 8:**
- 50%+ of app uses accessible component library
- 50%+ of original 200 issues resolved
- 3 committed features shipped

**By Week 12:**
- All committed features shipped (using accessible components)
- 80%+ of accessibility issues resolved (through component adoption)
- Team has learned accessibility through components (skill-building)

## Why This Breaks the Impossible Constraint

**False constraint:** "Fix 200 issues OR ship features"

**Actual constraint:** "Fix slow layer (component library) AND ship features"

Through Leverage Points:
- Fixing 200 issues individually = low leverage (linear work)
- Fixing 15-20 components = high leverage (multiplicative impact)

Through Pace Layering:
- Fast layer (features) needs accessible slow layer (components)
- Build slow layer properly, fast layer inherits quality
- Current problem: Fast layer built on broken slow layer

## Trade-offs

**Immediate Compliance:**
- Old: 200 issues fixed in 6-8 weeks (100% done)
- New: 80% fixed in 12 weeks, rest in week 13-16

**Long-term:**
- Old: New features still create accessibility issues (no systemic fix)
- New: New features accessible by default (systemic fix in place)

**Team Learning:**
- Old: Team fixes issues, doesn't learn root cause
- New: Team learns accessible component patterns (skill-building)

## Validation Before Committing

**Week 0 (Spike):**
1. Pick 3 most-used components (Button, Input, Modal)
2. Make them WCAG AA compliant
3. Count how many issues this fixes automatically
4. If it fixes 30-50 issues: Proves leverage point theory
5. Extrapolate: 15 components should fix 150-200 issues

## The Meta-Insight

You asked "How do we solve this impossible constraint?"

The constraint wasn't impossible. It was framed wrong.

**Original frame:** Resource allocation (accessibility vs features)
**Reframe:** Architectural debt (slow layer preventing fast layer)

Fix the layer that creates the problem (components), not the 200 symptoms (issues).

This is the power of Pace Layering + Leverage Points: Find the slow layer that multiplies across the fast layer, fix it once, benefit everywhere.
