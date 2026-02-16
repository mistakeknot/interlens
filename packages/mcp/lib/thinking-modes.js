/**
 * Thinking Modes for Interlens
 *
 * Inspired by Six Thinking Hats - provides structured entry points for agents.
 * Groups lenses into coherent modes based on problem type and reasoning goal.
 *
 * Based on research showing mode-based thinking:
 * - Reduces cognitive load (5-6 modes vs 13+ tools)
 * - Provides clear use cases
 * - Guides workflow naturally
 * - Prevents analysis paralysis
 */

const THINKING_MODES = [
  {
    id: 'systems_thinking',
    name: 'Systems Thinking',
    description: 'Understand structure, dynamics, and relationships in complex systems',
    icon: '🔄',
    lenses: [
      'Pace Layering',
      'Feedback Loops',
      'System Boundaries',
      'Leverage Points',
      'Bottleneck Theory',
      'Theory of Constraints'
    ],
    use_when: [
      'Complex interdependencies between components',
      'Stuck despite many optimization attempts',
      'Unclear root cause of systemic problems',
      'Need to understand how parts interact',
      'Performance issues with no obvious bottleneck'
    ],
    problem_patterns: [
      /stuck/i,
      /plateau/i,
      /complex/i,
      /system/i,
      /interdependen/i,
      /performance/i,
      /bottleneck/i,
      /root cause/i
    ],
    example_questions: [
      'Which system layer is creating the constraint?',
      'What feedback loops are reinforcing the problem?',
      'Where are the high-leverage intervention points?',
      'What pace mismatches exist between layers?'
    ]
  },

  {
    id: 'strategic_thinking',
    name: 'Strategic Thinking',
    description: 'Navigate uncertainty, balance trade-offs, and choose direction',
    icon: '🎯',
    lenses: [
      'Explore vs Exploit',
      'Time Horizons',
      'Strategic Choice',
      'Competitive Dynamics',
      'Innovation Portfolio',
      'Jobs to be Done'
    ],
    use_when: [
      'High-stakes decisions with uncertain outcomes',
      'Resource allocation conflicts',
      'Balancing short-term vs long-term goals',
      'Market positioning decisions',
      'Build vs buy vs partner choices'
    ],
    problem_patterns: [
      /strateg/i,
      /decide|decision/i,
      /trade-?off/i,
      /priorit/i,
      /allocat/i,
      /compete|competit/i,
      /position/i,
      /invest/i
    ],
    example_questions: [
      'What time horizon does this decision optimize for?',
      'Are we exploring (learning) or exploiting (optimizing)?',
      'What job is the customer really trying to do?',
      'How does this position us competitively?'
    ]
  },

  {
    id: 'diagnostic_thinking',
    name: 'Diagnostic Thinking',
    description: 'Find root causes, identify bottlenecks, and trace problems to their source',
    icon: '🔍',
    lenses: [
      'Root Cause Analysis',
      'Five Whys',
      'Bottleneck Theory',
      'System Boundaries',
      'Pace Layering'
    ],
    use_when: [
      'Something is broken or failing',
      'Performance degraded unexpectedly',
      'Issues keep recurring despite fixes',
      'Need to understand why something happened',
      'Symptoms are clear but cause is not'
    ],
    problem_patterns: [
      /why/i,
      /broke|broken/i,
      /fail/i,
      /bug/i,
      /issue/i,
      /problem/i,
      /wrong/i,
      /recurring/i
    ],
    example_questions: [
      'What is the root cause vs symptom?',
      'Which layer is creating this problem?',
      'What constraint is limiting the system?',
      'Why does this keep happening?'
    ]
  },

  {
    id: 'innovation_thinking',
    name: 'Innovation Thinking',
    description: 'Generate novel solutions, break assumptions, and find creative alternatives',
    icon: '💡',
    lenses: [
      'Innovation Cascade',
      'Constraints',
      'Progressive Disclosure',
      'Zone of Proximal Development',
      'Jobs to be Done',
      'First Principles'
    ],
    use_when: [
      'Conventional solutions have failed',
      'Need breakthrough ideas',
      'Market differentiation required',
      'Stuck in incremental thinking',
      'Want to challenge assumptions'
    ],
    problem_patterns: [
      /innovat/i,
      /creative/i,
      /novel/i,
      /different/i,
      /breakthrough/i,
      /rethink/i,
      /alternative/i
    ],
    example_questions: [
      'What assumptions can we challenge?',
      'What job is really being done?',
      'How can constraints become advantages?',
      'What would a first-principles approach reveal?'
    ]
  },

  {
    id: 'adaptive_thinking',
    name: 'Adaptive Thinking',
    description: 'Learn, evolve, and improve systems over time through iteration',
    icon: '🌱',
    lenses: [
      'Zone of Proximal Development',
      'Feedback Loops',
      'Progressive Disclosure',
      'Pace Layering',
      'Iterative Improvement'
    ],
    use_when: [
      'Building learning systems',
      'Gradual improvement over time',
      'Team skill development',
      'User onboarding and adoption',
      'Capability building'
    ],
    problem_patterns: [
      /learn/i,
      /adopt/i,
      /onboard/i,
      /train/i,
      /improve/i,
      /iterative/i,
      /gradual/i,
      /grow/i
    ],
    example_questions: [
      'What is within the current capability zone?',
      'How do we create positive feedback loops?',
      'What pace of change can be absorbed?',
      'How do we reveal complexity progressively?'
    ]
  },

  {
    id: 'organizational_thinking',
    name: 'Organizational Thinking',
    description: 'Understand team dynamics, coordination, and organizational patterns',
    icon: '👥',
    lenses: [
      'Conway\'s Law',
      'Communication Bandwidth',
      'System Boundaries',
      'Pace Layering',
      'Feedback Loops'
    ],
    use_when: [
      'Team coordination problems',
      'Cross-functional alignment issues',
      'Remote collaboration challenges',
      'Organizational design decisions',
      'Process improvement'
    ],
    problem_patterns: [
      /team/i,
      /organizat/i,
      /coordinat/i,
      /collaborat/i,
      /communicate|communication/i,
      /alignment/i,
      /remote/i
    ],
    example_questions: [
      'Does org structure match system architecture?',
      'What communication bandwidth is needed?',
      'Which team owns which layer?',
      'What feedback loops exist in the process?'
    ]
  }
];

/**
 * Match problem description to most relevant thinking mode(s)
 *
 * @param {string} problemDescription - User's problem statement
 * @returns {Array} Sorted array of modes with relevance scores
 */
function matchThinkingMode(problemDescription) {
  const scores = THINKING_MODES.map(mode => {
    let score = 0;

    // Pattern matching (each match = +1 point)
    mode.problem_patterns.forEach(pattern => {
      if (pattern.test(problemDescription)) {
        score += 1;
      }
    });

    // Use-case matching (partial text matching)
    mode.use_when.forEach(useCase => {
      const keywords = useCase.toLowerCase().split(' ');
      const problemLower = problemDescription.toLowerCase();
      const matchingKeywords = keywords.filter(kw =>
        kw.length > 3 && problemLower.includes(kw)
      );
      score += matchingKeywords.length * 0.5;
    });

    return {
      ...mode,
      relevance_score: score
    };
  });

  // Sort by relevance, return top 3
  return scores
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 3);
}

/**
 * Get all lenses for a specific mode
 *
 * @param {string} modeId - Mode identifier
 * @returns {Array} List of lens names in that mode
 */
function getLensesForMode(modeId) {
  const mode = THINKING_MODES.find(m => m.id === modeId);
  return mode ? mode.lenses : [];
}

/**
 * Get recommended workflow for a mode
 *
 * @param {string} modeId - Mode identifier
 * @returns {Object} Workflow guidance
 */
function getWorkflowForMode(modeId) {
  const workflows = {
    systems_thinking: {
      steps: [
        'Identify which system layers are involved (Pace Layering)',
        'Map feedback loops and dynamics',
        'Find leverage points for intervention',
        'Check system boundaries (what you control vs don\'t)'
      ],
      tools: ['search_lenses', 'get_lens', 'find_lens_journey'],
      outcome: 'Structural understanding and high-leverage interventions'
    },
    strategic_thinking: {
      steps: [
        'Clarify time horizon (quarterly vs multi-year)',
        'Identify explore vs exploit tension',
        'Map competitive dynamics',
        'Define decision criteria'
      ],
      tools: ['search_lenses', 'find_contrasting_lenses', 'get_related_lenses'],
      outcome: 'Clear strategic direction with explicit trade-offs'
    },
    diagnostic_thinking: {
      steps: [
        'Ask "Why?" 5 times to find root cause',
        'Identify bottlenecks and constraints',
        'Check which layer the problem originates',
        'Validate with evidence'
      ],
      tools: ['search_lenses', 'get_lens', 'find_bridge_lenses'],
      outcome: 'Root cause identified with clear evidence'
    },
    innovation_thinking: {
      steps: [
        'Challenge key assumptions',
        'Reframe problem from first principles',
        'Explore constraints as advantages',
        'Generate alternative approaches'
      ],
      tools: ['random_lens_provocation', 'find_contrasting_lenses', 'get_lens'],
      outcome: 'Novel solution approaches and reframed problems'
    },
    adaptive_thinking: {
      steps: [
        'Assess current capability level (ZPD)',
        'Design progressive revelation of complexity',
        'Build positive feedback loops',
        'Set pace appropriate to learning rate'
      ],
      tools: ['search_lenses', 'get_lens', 'get_related_lenses'],
      outcome: 'Sustainable learning and improvement system'
    },
    organizational_thinking: {
      steps: [
        'Map org structure to system architecture (Conway\'s Law)',
        'Assess communication bandwidth needs',
        'Define clear boundaries of ownership',
        'Establish feedback loops for coordination'
      ],
      tools: ['search_lenses', 'get_lens', 'find_lens_journey'],
      outcome: 'Aligned organization and effective coordination'
    }
  };

  return workflows[modeId] || null;
}

export {
  THINKING_MODES,
  matchThinkingMode,
  getLensesForMode,
  getWorkflowForMode
};
