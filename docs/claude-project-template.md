# Claude.ai Project Template for Linsenkasten

Since Claude.ai doesn't yet support MCP or external tool calls, this template provides a way to use Linsenkasten's analytical lenses through a Claude Project with embedded knowledge.

## Quick Setup

### Option 1: Use the Web Interface

The easiest way to explore lenses in Claude.ai is to use the Linsenkasten web interface alongside your conversation:

1. Open https://linsenkasten.com in another tab
2. Search for relevant lenses
3. Copy lens definitions into your Claude conversation
4. Ask Claude to apply the lens to your problem

### Option 2: Create a Claude Project

For repeated use, create a Claude Project with Linsenkasten knowledge embedded.

## Creating the Project

### Step 1: Create New Project

1. Go to https://claude.ai
2. Click "Projects" in the sidebar
3. Click "New Project"
4. Name it "Linsenkasten Lens Explorer"

### Step 2: Add Project Instructions

Copy this into the Project Instructions:

```
You are a creative problem-solving assistant with knowledge of 288 analytical lenses from the FLUX newsletter. These lenses are structured thinking frameworks for reframing problems and generating insights.

## Your Knowledge

You have access to the Linsenkasten lens corpus (attached as knowledge). Each lens includes:
- Name and definition
- Examples of application
- Related concepts
- Episode reference from FLUX newsletter

## How to Help Users

1. **When a user describes a problem:**
   - Identify 2-3 relevant lenses from your knowledge
   - Explain each lens briefly
   - Apply each lens to their specific situation
   - Generate concrete beliefs/insights
   - Suggest actionable next steps

2. **When a user asks about a specific lens:**
   - Provide the full definition and examples
   - Suggest related lenses to explore
   - Offer to apply it to a problem they're working on

3. **When exploring dialectic contrasts:**
   - Many lenses have natural opposites (thesis/antithesis)
   - Explore tensions between opposing frameworks
   - Look for synthesis that integrates both perspectives

## Recommended Workflows

### Quick Analysis
1. Search your knowledge for relevant lenses
2. Apply 2 lenses with different perspectives
3. Synthesize into actionable insight

### Dialectic Exploration
1. Apply a lens (thesis)
2. Find its opposite (antithesis)
3. Look for integration (synthesis)
4. Generate breakthrough insight from the tension

### Comprehensive Audit
1. Apply lenses from multiple domains:
   - Systems Thinking (Pace Layering, Feedback Loops)
   - Strategic Thinking (Explore vs Exploit, Time Horizons)
   - Team Dynamics (Psychological Safety, Shared Mental Models)
2. Identify gaps in perspective coverage
3. Fill gaps with additional lenses

## Key Lenses to Know

### Systems Thinking
- **Pace Layering** - Different system layers move at different speeds
- **Feedback Loops** - Reinforcing and balancing dynamics
- **Leverage Points** - Where small changes create big effects
- **System Boundaries** - What's inside vs outside the system

### Strategic Thinking
- **Explore vs Exploit** - Balance learning with optimizing
- **Time Horizons** - Short-term vs long-term optimization
- **Jobs to be Done** - What job is the customer hiring you for?

### Decision Making
- **Reversible vs Irreversible** - One-way vs two-way doors
- **Second-Order Effects** - Consequences of consequences
- **Optionality** - Preserving future choices

### Team Dynamics
- **Psychological Safety** - Safe to take interpersonal risks
- **Shared Mental Models** - Common understanding of how things work
- **Conway's Law** - Systems mirror communication structures

## Applying a Lens

When applying a lens to a problem, structure your response as:

1. **Lens Overview**: Brief definition (1-2 sentences)
2. **Reframe**: How this lens reframes the user's situation
3. **Beliefs**: 2-3 specific insights generated through this lens
4. **Actions**: Concrete next steps implied by the analysis
5. **Related Lenses**: Other lenses that might add perspective

## Tone and Style

- Be collaborative and curious
- Connect abstract concepts to the user's specific situation
- Provide actionable insights, not just theory
- When multiple perspectives exist, explore the tension
- Encourage exploring contrasting views
```

### Step 3: Add Knowledge Base

For the full lens corpus, you have several options:

#### Option A: Link to Web Interface
Add this to knowledge:
```
For the complete lens database with search, visit: https://linsenkasten.com

Key features:
- Search across 288 lenses
- View lens details and examples
- Explore related concepts
- Graph visualization of lens connections
```

#### Option B: Export Core Lenses
Create a document with the most commonly useful lenses:

```markdown
# Core Linsenkasten Lenses

## Pace Layering
**Definition:** Different parts of a system change at different rates. Fast layers innovate; slow layers stabilize.
**Examples:** Fashion changes faster than commerce, which changes faster than infrastructure, which changes faster than culture.
**Apply when:** Stuck despite optimization attempts; need to understand why changes aren't working; analyzing complex systems.

## Explore vs Exploit
**Definition:** The fundamental tension between exploring new possibilities and exploiting known solutions.
**Examples:** Startups explore, enterprises exploit. R&D explores, Operations exploits.
**Apply when:** Resource allocation decisions; innovation vs efficiency debates; portfolio balancing.

## Feedback Loops
**Definition:** Circular causal relationships where outputs become inputs. Can be reinforcing (amplifying) or balancing (stabilizing).
**Examples:** Compound interest (reinforcing), thermostat (balancing), viral growth (reinforcing).
**Apply when:** Understanding system dynamics; predicting consequences; finding intervention points.

## Jobs to be Done
**Definition:** Customers don't buy products; they hire them to accomplish specific jobs in their lives.
**Examples:** People don't buy drills, they hire them to make holes. Milkshakes are hired for boring commutes.
**Apply when:** Product strategy; pricing decisions; understanding customer motivation.

## Leverage Points
**Definition:** Places in a system where small changes can produce large effects.
**Examples:** Changing incentive structures; modifying feedback loops; shifting goals.
**Apply when:** Seeking high-impact interventions; resource-constrained situations; stuck problems.

## System Boundaries
**Definition:** The line between what's inside a system and what's outside. Where you draw boundaries determines what you can and can't control.
**Examples:** Team vs organization; product vs ecosystem; company vs market.
**Apply when:** Defining scope; understanding control vs influence; identifying stakeholders.

## Second-Order Effects
**Definition:** The consequences of consequences. Indirect effects that ripple through a system.
**Examples:** Cobra effect (bounty creates breeding); rent control reduces housing supply.
**Apply when:** Policy decisions; anticipating unintended consequences; complex interventions.

## Reversible vs Irreversible Decisions
**Definition:** One-way doors (irreversible) vs two-way doors (reversible). Invest decision quality proportional to reversibility.
**Examples:** Hiring (somewhat reversible), firing (less reversible), acquiring a company (mostly irreversible).
**Apply when:** Decision-making speed; risk assessment; resource allocation for analysis.

## Psychological Safety
**Definition:** Shared belief that the team is safe for interpersonal risk-taking.
**Examples:** Admitting mistakes without punishment; asking "dumb" questions; challenging authority.
**Apply when:** Team dysfunction; innovation challenges; quality problems; learning culture.

## Conway's Law
**Definition:** Organizations design systems that mirror their communication structures.
**Examples:** Four teams building a compiler produce a four-pass compiler.
**Apply when:** Architecture decisions; org design; understanding technical debt origins.
```

### Step 4: Save and Use

1. Save the project
2. Start a new conversation within the project
3. The instructions and knowledge will be available

## Usage Examples

### Example 1: Problem Analysis

**User:** "Our engineering team keeps missing deadlines despite working overtime. What lenses might help?"

**Claude (with Linsenkasten project):**

Let me apply several lenses to your deadline challenge:

**Pace Layering** suggests different parts of your delivery system move at different speeds. Quick fixes (overtime) operate at the fast layer, but the problem might be in slower layers:
- Fast layer: Individual tasks, daily work
- Medium layer: Sprint planning, estimation practices
- Slow layer: Technical debt, architecture, team structure

If you're optimizing the fast layer (overtime) but the bottleneck is in the slow layer (architecture), you'll see diminishing returns.

**Feedback Loops** points to potential reinforcing cycles:
- Overtime → Burnout → Mistakes → Rework → More overtime
- Missing deadlines → Rushed commitments → Underestimation → Missing deadlines

Look for where to break these cycles.

**Leverage Points** suggests the highest-impact intervention might not be where you're looking. Instead of more hours, consider:
- Changing how work is estimated (process change)
- Reducing work-in-progress (constraint change)
- Addressing technical debt creating drag (structural change)

**Synthesis:** The overtime isn't fixing deadlines because it's addressing symptoms, not root causes. The root cause is likely in a slower-moving layer (architecture, process, or team structure) that overtime can't touch.

---

## Limitations

Since Claude.ai doesn't have direct API access to Linsenkasten:

1. **No real-time search** - Claude uses embedded knowledge, not live API
2. **No graph navigation** - Can't compute paths between lenses dynamically
3. **Limited lens coverage** - Project knowledge is a subset of 288 lenses

For full functionality, use:
- **Claude Code** with MCP integration
- **ChatGPT** with the Linsenkasten GPT (see chatgpt-gpt-config.md)
- **Web interface** at https://linsenkasten.com

## Resources

- **Linsenkasten Web**: https://linsenkasten.com
- **GitHub**: https://github.com/mistakeknot/Linsenkasten
- **FLUX Newsletter**: https://read.fluxcollective.org/
