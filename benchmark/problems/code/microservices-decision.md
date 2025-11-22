# Microservices vs Monolith Decision

## Problem ID
`code_microservices-decision`

## Domain
code

## Title
Team Split on Microservices Migration Strategy

## Context
- E-commerce platform, 3 years old, Django monolith
- 12 engineers, growing to 18 next quarter
- 50,000 daily active users
- Deployment takes 20 minutes, happens 3x/day
- Recent outage because payment service bug took down entire site
- New CTO pushing for microservices, engineering team skeptical

## Challenge
CTO wants to migrate to microservices architecture:
- **CTO's argument:** Scalability, team autonomy, fault isolation, modern stack
- **Engineers' concerns:** Complexity, debugging difficulty, deployment overhead, team not experienced with distributed systems

Recent meeting ended in stalemate. Both sides have valid points:

**Pro-microservices:**
- Payment service outage wouldn't have taken down catalog/search
- Teams could deploy independently (faster iterations)
- Can scale services independently (payment needs more resources)
- Attract/retain talent (modern architecture)

**Pro-monolith:**
- Known architecture, team is productive
- Shared database makes features easier (no distributed transactions)
- Simpler deployment/monitoring/debugging
- Don't have DevOps expertise for k8s/service mesh

Decision paralysis. CTO frustrated. Engineers defensive.

## Constraints
- Cannot pause feature development for >2 months
- Limited DevOps capacity (1 person)
- Must maintain 99.9% uptime
- Budget constraints (no major infrastructure overhaul)
- Team skills: strong Python/Django, weak Docker/k8s

## Success Criteria
A good solution:
- Acknowledges validity of both perspectives
- Provides decision framework (not just "do microservices" or "stay monolith")
- Suggests incremental path forward
- Addresses team skill gap
- Realistic given constraints

## Prompt for Agent

```
Our CTO wants to migrate our Django monolith to microservices.

CTO's reasoning:
- Better fault isolation (recent payment bug took down whole site)
- Team autonomy (12 engineers growing to 18)
- Independent scaling
- Modern architecture

Engineering team pushes back:
- We're productive with the monolith
- Don't have k8s/distributed systems expertise
- Worried about complexity, debugging, deployment overhead

Both sides are dug in. Meeting ended in stalemate.

Your role: Help us break through this impasse with a fresh perspective.
```

## Expected Lens Relevance

**High relevance:**
- **Explore vs Exploit** - Innovation (microservices) vs proven approach (monolith)
- **Pace Layering** - What moves fast (features) vs slow (architecture)
- **System Boundaries** - Where to draw service boundaries
- **Geometry of Dissent** - Team disagreement dynamics

**Medium relevance:**
- **Leverage Points** - Where to intervene in migration
- **Bottleneck Theory** - What's the real constraint?
- **Innovation Cascade** - How architectural patterns diffuse

**Low relevance:**
- **Ritual and Ceremony** - Not primarily cultural
- **Creative Problem Solving** - Not about ideation process

## Baseline Solution Pattern

WITHOUT linsenkasten:

```
"Here's a migration plan:

Phase 1: Set up k8s cluster
Phase 2: Extract payment service
Phase 3: Extract catalog service
Phase 4: Continue until done

Or: Stay monolith until pain is unbearable.

Or: Do modular monolith instead."
```

**Characteristics:**
- Picks a side or suggests compromise
- Doesn't address team dynamics (dug in positions)
- Tactical migration steps without addressing underlying tensions
- **Originality: 2-3/10**
- **Novelty: 2/10**
- **Actionability: 5/10** (steps are clear but doesn't resolve conflict)

## Target Solution Pattern

WITH linsenkasten (using Explore vs Exploit + Pace Layering):

```
"Applying Explore vs Exploit + Pace Layering lenses:

Key insight: This isn't microservices vs monolith. It's about pace layers.

Observation through Pace Layering:
- Fast layer: Features, experiments, customer-facing changes
- Slow layer: Core architecture, infrastructure, foundational services

CTO is optimizing for fast layer ("team autonomy, quick deploys")
Engineers are optimizing for slow layer ("stability, known architecture")

Both are correct for their layer. The conflict is layer mismatch.

Through Explore vs Exploit:
- CTO wants exploration (new architecture, learn microservices)
- Engineers want exploitation (maximize monolith productivity)

Again, both valid - but for different time horizons.

Reframe: Don't choose one. Design architecture that supports both.

Proposal: "Pace-Layered Architecture"

Slow layer (exploit):
- Keep monolith for core services (payments, orders, users)
- These MUST be stable, team knows them well
- Optimize for reliability, not autonomy

Fast layer (explore):
- NEW services start as microservices (search, recommendations, notifications)
- Experimental features go here
- Team learns distributed systems on lower-risk services
- If experiment succeeds, it stays microservice
- If it fails, easy to remove

This approach:
1. Preserves monolith stability (engineers' concern)
2. Enables architectural exploration (CTO's goal)
3. Builds team skills gradually (addresses expertise gap)
4. Reduces migration risk (not big-bang)
5. Aligns with business reality (can't pause features)

Specific next steps:
1. Identify next 3 features on roadmap
2. Classify: Core (monolith) vs Experimental (microservice)
3. Start ONE microservice (lowest risk, like notifications)
4. Run for 3 months, learn, decide on next service
5. DON'T migrate payment yet (highest risk)

Why this resolves conflict:
- CTO gets to explore microservices (fast layer)
- Engineers keep exploiting monolith (slow layer)
- Both are right - we're doing both simultaneously
- Pace layering principle: Different parts should move at different speeds

The breakthrough: Stop fighting about THE architecture. Design for multiple paces.
```

**Characteristics:**
- Lens-based reframing (not picking sides)
- Explains WHY conflict exists (layer/timescale mismatch)
- Both/and solution (not either/or)
- Incremental, risk-managed approach
- **Originality: 8/10**
- **Novelty: 8/10**
- **Actionability: 9/10**

## Evaluation Notes

**What makes this interesting:**
- Classic tech decision with strong opinions
- Tests whether agent can reframe conflict
- Both sides have valid concerns (no "right" answer)

**Creative leaps possible:**
- Seeing it as pace layer mismatch, not tech decision
- Explore/exploit both valid for different horizons
- Architecture can support multiple paces simultaneously
- Start with LOW-risk services, not core

**What would surprise evaluators:**
- Doesn't pick a side
- Explains the disagreement pattern
- "Both are right" reframe
- Pace-layered architecture concept
- Risk-managed learning approach
