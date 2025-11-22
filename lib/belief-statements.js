/**
 * Belief Statement Generation
 *
 * Inspired by SaLT (Streaming Agentic Lateral Thinking) framework.
 * Generates specific, evidence-based insights about problems rather than abstract definitions.
 *
 * Key principles:
 * - Beliefs are specific to the problem context
 * - Include confidence scores
 * - Provide reasoning traces
 * - Suggest lateral connections
 * - Include actionable implications
 *
 * Research shows: Specific belief statements → 39-60% better creative reasoning
 */

/**
 * Generate belief statements for a lens applied to a problem
 *
 * @param {string} lensName - Name of the FLUX lens
 * @param {string} problemContext - User's problem description
 * @param {Object} lensDefinition - Full lens metadata
 * @returns {Array} Belief statements with confidence, reasoning, evidence
 */
function generateBeliefStatements(lensName, problemContext, lensDefinition) {
  // Extract problem signals
  const signals = extractProblemSignals(problemContext);

  // Generate lens-specific beliefs
  const beliefs = [];

  switch (lensName) {
    case 'Pace Layering':
      beliefs.push(...generatePaceLayeringBeliefs(signals, problemContext));
      break;
    case 'Leverage Points':
      beliefs.push(...generateLeveragePointsBeliefs(signals, problemContext));
      break;
    case 'System Boundaries':
      beliefs.push(...generateSystemBoundariesBeliefs(signals, problemContext));
      break;
    case 'Feedback Loops':
      beliefs.push(...generateFeedbackLoopsBeliefs(signals, problemContext));
      break;
    case 'Explore vs Exploit':
      beliefs.push(...generateExploreExploitBeliefs(signals, problemContext));
      break;
    case 'Zone of Proximal Development':
      beliefs.push(...generateZPDBeliefs(signals, problemContext));
      break;
    case 'Bottleneck Theory':
      beliefs.push(...generateBottleneckBeliefs(signals, problemContext));
      break;
    default:
      // Generic beliefs for other lenses
      beliefs.push(...generateGenericBeliefs(lensName, signals, problemContext));
  }

  return beliefs;
}

/**
 * Extract signals from problem description
 */
function extractProblemSignals(problemContext) {
  const lower = problemContext.toLowerCase();

  return {
    hasOptimizationAttempts: /tried|attempted|optimized|improved/i.test(problemContext),
    hasDiminishingReturns: /diminishing|plateau|stuck|limited impact/i.test(problemContext),
    hasComplexity: /complex|complicated|many|multiple/i.test(problemContext),
    hasTimeConstraint: /deadline|urgent|weeks|months|time/i.test(problemContext),
    hasResourceConstraint: /budget|cost|capacity|limited/i.test(problemContext),
    hasStakeholders: /team|stakeholder|customer|user|ceo|cto/i.test(problemContext),
    hasPerformance: /performance|slow|fast|speed|latency/i.test(problemContext),
    hasScale: /scale|growth|users|load/i.test(problemContext),
    hasFeatures: /feature|functionality|capability/i.test(problemContext),
    hasDecision: /decide|decision|choose|prioritize/i.test(problemContext),
    hasIssues: /issue|problem|bug|error|fail/i.test(problemContext),
    hasRepeating: /again|recurring|repeatedly|keep/i.test(problemContext),
    mentionsLayers: /layer|level|tier|architecture/i.test(problemContext),
    mentionsIterations: /iteration|attempt|try|tried/i.test(problemContext),
    numbers: extractNumbers(problemContext)
  };
}

/**
 * Extract numbers from problem context (for evidence)
 */
function extractNumbers(text) {
  const matches = text.match(/\d+[\d,.]*/g) || [];
  return matches.map(m => m.replace(/,/g, ''));
}

/**
 * Generate Pace Layering beliefs
 */
function generatePaceLayeringBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasOptimizationAttempts && signals.hasDiminishingReturns) {
    beliefs.push({
      belief: "Your optimization efforts are targeting the wrong system layer - you're optimizing the fast layer when the constraint is in the slow layer",
      confidence: 0.75,
      reasoning: "Multiple optimization attempts with diminishing returns suggests you've exhausted improvements at the current layer; the bottleneck is likely at a slower-moving architectural or structural layer",
      evidence: signals.mentionsIterations ?
        "Multiple attempts mentioned with limited cumulative impact" :
        "Pattern matches pace layer mismatch",
      lateral_connections: ['System Boundaries', 'Leverage Points', 'Bottleneck Theory'],
      implications: [
        "Profile performance across architectural layers (not just code)",
        "Examine data architecture and request patterns",
        "Consider when computation should happen vs when it currently happens",
        "Look for pace mismatches (fast-changing code on slow-changing data)"
      ]
    });
  }

  if (signals.hasFeatures && signals.hasTimeConstraint) {
    beliefs.push({
      belief: "You have a fast-layer (features) vs slow-layer (foundation) conflict - trying to build fast on unstable slow",
      confidence: 0.70,
      reasoning: "Time pressure on features while foundation issues exist creates pace layer tension; fast layer can't move faster than slow layer supports",
      evidence: "Time constraints mentioned alongside feature/capability work",
      lateral_connections: ['Leverage Points', 'System Boundaries', 'Technical Debt'],
      implications: [
        "Identify which work is fast-layer (features) vs slow-layer (platform/foundation)",
        "Allocate separate capacity for each layer",
        "Don't force slow-layer work to move at fast-layer pace",
        "Consider what foundation work would unlock multiple features"
      ]
    });
  }

  if (beliefs.length === 0) {
    // Generic Pace Layering belief
    beliefs.push({
      belief: "Your problem involves different components changing at different rates",
      confidence: 0.50,
      reasoning: "Pace Layering applies when system has layers with different change frequencies",
      evidence: "Problem structure suggests multi-layer system",
      lateral_connections: ['System Boundaries', 'Feedback Loops'],
      implications: [
        "Identify fast-changing vs slow-changing components",
        "Match intervention pace to layer speed",
        "Don't force slow layers to change quickly"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate Leverage Points beliefs
 */
function generateLeveragePointsBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasIssues && signals.numbers.length > 1) {
    const issueCount = signals.numbers.find(n => parseInt(n) > 10);
    if (issueCount) {
      beliefs.push({
        belief: `You're treating ${issueCount}+ individual issues when there's likely a single high-leverage root cause creating them all`,
        confidence: 0.80,
        reasoning: "High volume of similar issues suggests systemic cause rather than isolated problems; fixing the source has multiplicative impact",
        evidence: `${issueCount}+ issues mentioned`,
        lateral_connections: ['Root Cause Analysis', 'System Boundaries', 'Pace Layering'],
        implications: [
          `Instead of fixing ${issueCount} issues individually, find what's generating them`,
          "Look for shared infrastructure, components, or processes",
          "Fix the generator once rather than symptoms repeatedly",
          "Ask: What single change would eliminate 80% of these issues?"
        ]
      });
    }
  }

  if (signals.hasOptimizationAttempts && signals.hasDiminishingReturns) {
    beliefs.push({
      belief: "Your interventions are low-leverage (linear improvements) - you need to find high-leverage points (multiplicative improvements)",
      confidence: 0.70,
      reasoning: "Individual optimizations with small gains indicates working at wrong level of abstraction; leverage points often exist at structural/architectural level",
      evidence: "Multiple attempts with incremental results",
      lateral_connections: ['Pace Layering', 'System Boundaries', 'Bottleneck Theory'],
      implications: [
        "Map your system layers and find where small changes have large effects",
        "Look for places where one fix helps many scenarios",
        "Consider architectural changes over tactical fixes",
        "Ask: What's the thing all these problems have in common?"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate System Boundaries beliefs
 */
function generateSystemBoundariesBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasStakeholders) {
    beliefs.push({
      belief: "Some constraints are outside your system boundary (not under your control) - trying to fix them directly will fail",
      confidence: 0.65,
      reasoning: "Stakeholder involvement suggests political/organizational constraints that may be outside technical team's control",
      evidence: "Multiple stakeholders mentioned",
      lateral_connections: ['Leverage Points', 'Conway\'s Law', 'Organizational Dynamics'],
      implications: [
        "Identify what's inside vs outside your control",
        "For outside-boundary issues: influence, escalate, or work around",
        "For inside-boundary issues: direct action",
        "Don't waste effort on things you can't change"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate Feedback Loops beliefs
 */
function generateFeedbackLoopsBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasRepeating || (signals.hasIssues && signals.hasOptimizationAttempts)) {
    beliefs.push({
      belief: "You have a reinforcing feedback loop creating a vicious cycle - fixing symptoms doesn't break the loop",
      confidence: 0.70,
      reasoning: "Recurring issues despite fixes indicates a feedback loop regenerating the problem",
      evidence: "Recurring or persistent problems mentioned",
      lateral_connections: ['Root Cause Analysis', 'System Boundaries', 'Leverage Points'],
      implications: [
        "Map the feedback loop: A causes B, B causes C, C reinforces A",
        "Find where to break the cycle (often at weakest link)",
        "Address the loop structure, not individual symptoms",
        "Look for what regenerates the problem after you fix it"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate Explore vs Exploit beliefs
 */
function generateExploreExploitBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasDecision && signals.hasTimeConstraint) {
    beliefs.push({
      belief: "You have an explore vs exploit tension - short-term pressure pushing toward exploitation when exploration may be needed",
      confidence: 0.65,
      reasoning: "Time constraints naturally favor exploitation (known solutions) over exploration (learning/innovation)",
      evidence: "Decision under time pressure",
      lateral_connections: ['Time Horizons', 'Strategic Choice', 'Innovation'],
      implications: [
        "Clarify: Are you optimizing known solutions (exploit) or learning new approaches (explore)?",
        "Time pressure doesn't always mean exploit - sometimes fast exploration is the answer",
        "Consider if short-term exploit creates long-term problems",
        "Balance portfolio: some exploit (low risk), some explore (high learning)"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate Zone of Proximal Development beliefs
 */
function generateZPDBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasComplexity && signals.hasStakeholders) {
    beliefs.push({
      belief: "You're introducing complexity faster than people can absorb it - exceeding the zone of proximal development",
      confidence: 0.60,
      reasoning: "High complexity with team/user stakeholders suggests capability gap",
      evidence: "Complexity and people mentioned together",
      lateral_connections: ['Pace Layering', 'Progressive Disclosure', 'Change Management'],
      implications: [
        "Assess current capability level of users/team",
        "Introduce complexity progressively, not all at once",
        "Match pace of change to pace of learning",
        "Provide scaffolding for new capabilities"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate Bottleneck Theory beliefs
 */
function generateBottleneckBeliefs(signals, problemContext) {
  const beliefs = [];

  if (signals.hasPerformance || signals.hasScale) {
    beliefs.push({
      belief: "You likely have a single primary bottleneck - optimizing non-bottlenecks won't improve overall throughput",
      confidence: 0.75,
      reasoning: "Performance/scale issues typically have one dominant constraint (Theory of Constraints)",
      evidence: "Performance or scale concerns mentioned",
      lateral_connections: ['System Boundaries', 'Leverage Points', 'Pace Layering'],
      implications: [
        "Find the bottleneck (slowest/most constrained component)",
        "Optimize ONLY the bottleneck until it moves",
        "Don't waste effort on non-bottlenecks",
        "Monitor: as you fix one bottleneck, a new one emerges"
      ]
    });
  }

  return beliefs;
}

/**
 * Generate generic beliefs for lenses without specific templates
 */
function generateGenericBeliefs(lensName, signals, problemContext) {
  return [{
    belief: `Applying ${lensName} lens may reveal non-obvious aspects of your problem`,
    confidence: 0.50,
    reasoning: `${lensName} provides a structured perspective for analysis`,
    evidence: "Problem context suggests lens applicability",
    lateral_connections: [],
    implications: [
      `Consider problem through ${lensName} framework`,
      "Look for patterns this lens typically identifies",
      "Question assumptions this lens challenges"
    ]
  }];
}

module.exports = {
  generateBeliefStatements,
  extractProblemSignals
};
