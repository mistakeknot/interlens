#!/usr/bin/env node
import * as api from './api-client.js';

// Simple color helpers (avoiding chalk dependency for now)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function color(text, colorCode) {
  return `${colorCode}${text}${colors.reset}`;
}

function bold(text) {
  return color(text, colors.bright);
}

function dim(text) {
  return color(text, colors.dim);
}

function cyan(text) {
  return color(text, colors.cyan);
}

function green(text) {
  return color(text, colors.green);
}

function yellow(text) {
  return color(text, colors.yellow);
}

function blue(text) {
  return color(text, colors.blue);
}

function magenta(text) {
  return color(text, colors.magenta);
}

function red(text) {
  return color(text, colors.red);
}

// Formatting helpers
function formatLens(lens, compact = false) {
  const name = lens.name || lens.lens_name;
  if (compact) {
    return `${bold(name)} ${dim(`(Ep. ${lens.episode})`)}\n  ${lens.definition.substring(0, 100)}...`;
  }

  let output = `\n${bold(cyan(name))} ${dim(`Episode ${lens.episode}`)}\n`;
  output += `${lens.definition}\n`;

  if (lens.examples && lens.examples.length > 0) {
    output += `\n${bold('Examples:')}\n`;
    lens.examples.forEach(ex => {
      output += `  • ${ex}\n`;
    });
  }

  if (lens.related_concepts && lens.related_concepts.length > 0) {
    output += `\n${bold('Related concepts:')} ${dim(lens.related_concepts.join(', '))}\n`;
  }

  return output;
}

function printHeader(text) {
  console.log(`\n${bold(cyan(text))}\n`);
}

function printError(text) {
  console.error(`${red('Error:')} ${text}`);
}

// Command handlers
async function cmdSearch(query, options) {
  try {
    const limit = options.limit || 10;
    printHeader(`Searching for: "${query}"`);

    const results = await api.searchLenses(query, limit);

    if (results.results && results.results.length > 0) {
      console.log(dim(`Found ${results.count} results (showing ${results.results.length}):\n`));
      results.results.forEach((lens, idx) => {
        console.log(`${yellow(`${idx + 1}.`)} ${formatLens(lens, true)}\n`);
      });
    } else {
      console.log(dim('No results found.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdGet(name) {
  try {
    printHeader(`Getting lens: "${name}"`);

    const lens = await api.getLens(name);

    if (lens) {
      console.log(formatLens(lens));
    } else {
      console.log(dim(`Lens "${name}" not found.`));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdJourney(source, target) {
  try {
    printHeader(`Finding journey: ${source} → ${target}`);

    const results = await api.findLensJourney(source, target);

    if (results.success && results.paths && results.paths.length > 0) {
      results.paths.forEach((path, idx) => {
        console.log(`\n${bold(green(`Path ${idx + 1}`))}: ${path.length} steps\n`);
        path.forEach((lens, i) => {
          console.log(`${yellow(`${i + 1}.`)} ${bold(lens.name)} ${dim(`(Ep. ${lens.episode})`)}`);
          console.log(`   ${lens.definition}`);
          if (i < path.length - 1) {
            console.log(dim('   ↓'));
          }
        });
      });
    } else {
      console.log(dim(results.error || 'No path found between these lenses.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdRandom(options) {
  try {
    printHeader('🎲 Random Lens Provocation');

    const context = options.context || [];
    const results = await api.getRandomProvocation(context.length > 0 ? context : null);

    if (results.success && results.provocation) {
      // Show gap analysis if context was provided
      if (results.gap_analysis) {
        const gap = results.gap_analysis;
        console.log(`${bold(cyan('Gap Analysis:'))}`);
        console.log(`  Coverage: ${gap.coverage.explored}/${gap.coverage.total} frames (${Math.round((gap.coverage.explored / gap.coverage.total) * 100)}%)`);
        if (gap.was_gap_biased) {
          console.log(`  ${green('✨ Targeting unexplored area:')} ${bold(gap.suggested_from_frame)}`);
        }
        console.log('');
      }

      const lens = results.provocation;
      console.log(formatLens(lens));

      if (results.suggestion) {
        console.log(`\n${magenta('💡')} ${bold(results.suggestion)}\n`);
      }

      if (results.related && results.related.length > 0) {
        console.log(`${bold('Related lenses for follow-up:')}`);
        results.related.forEach(r => {
          console.log(`  • ${bold(r.name)} ${dim(`(Ep. ${r.episode})`)}`);
        });
      }
    } else {
      console.log(dim(results.error || 'Could not generate provocation.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdGaps(context) {
  try {
    printHeader('🔍 Thinking Gap Analysis');

    if (!context || context.length === 0) {
      printError('No context provided. Usage: linsenkasten gaps --context "Lens 1" --context "Lens 2"');
      process.exit(1);
    }

    console.log(dim(`Analyzing ${context.length} explored lens${context.length > 1 ? 'es' : ''}...\n`));

    const results = await api.detectThinkingGaps(context);

    if (results.success) {
      const cov = results.coverage;

      console.log(`${bold('Coverage Summary:')}`);
      console.log(`  ${green('Explored')}: ${cov.coverage_percentage}% (${Object.keys(cov.explored_frames).length}/${cov.total_frames} frames)`);
      console.log(`  ${yellow('Unexplored')}: ${cov.unexplored_frames.length} frames`);
      console.log(`  ${yellow('Underexplored')}: ${cov.underexplored_frames.length} frames (only 1 lens)\n`);

      if (Object.keys(cov.explored_frames).length > 0) {
        console.log(`${bold(green('✅ Explored Frames:'))}`);
        Object.entries(cov.explored_frames).forEach(([frame, count]) => {
          console.log(`  • ${bold(frame)}: ${count} lens${count > 1 ? 'es' : ''}`);
        });
        console.log('');
      }

      if (cov.unexplored_frames.length > 0) {
        console.log(`${bold(yellow('⚠️  Unexplored Frames (Blind Spots):'))}`);
        cov.unexplored_frames.slice(0, 10).forEach(frame => {
          console.log(`  • ${frame}`);
        });
        if (cov.unexplored_frames.length > 10) {
          console.log(dim(`\n  ...and ${cov.unexplored_frames.length - 10} more`));
        }
        console.log('');
      }

      if (results.suggestions && results.suggestions.length > 0) {
        console.log(`${bold(cyan('💡 Suggested Lenses to Explore:'))}\n`);
        results.suggestions.forEach(sugg => {
          console.log(`${bold(magenta(sugg.frame))}`);
          sugg.sample_lenses.forEach(lens => {
            console.log(`  • ${bold(lens.name)} ${dim(`(Ep. ${lens.episode})`)}`);
            console.log(`    ${dim(lens.definition.substring(0, 100))}...`);
          });
          console.log('');
        });
      }

      console.log(dim(results.insight));
    } else {
      console.log(dim(results.error || 'Could not analyze thinking gaps.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdBridge(lenses) {
  try {
    printHeader(`Finding bridges between: ${lenses.join(', ')}`);

    const results = await api.findBridgeLenses(lenses);

    if (results.success && results.bridges && results.bridges.length > 0) {
      console.log(dim(`Found ${results.count} bridge lens${results.count > 1 ? 'es' : ''}:\n`));

      results.bridges.forEach((bridge, idx) => {
        console.log(`${yellow(`${idx + 1}.`)} ${bold(bridge.name)} ${dim(`(Ep. ${bridge.episode})`)}`);
        console.log(`   ${bridge.definition}`);
        console.log(`   ${dim('Related: ' + bridge.related_concepts.join(', '))}\n`);
      });

      if (results.insight) {
        console.log(`${magenta('💡')} ${results.insight}\n`);
      }
    } else {
      console.log(dim(results.error || 'No bridges found between these lenses.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdCentral(options) {
  try {
    const measure = options.measure || 'betweenness';
    const limit = options.limit || 10;

    printHeader(`Central Lenses (${measure})`);

    const results = await api.getCentralLenses(measure, limit);

    if (results.success && results.central_lenses) {
      if (results.note) {
        console.log(`${yellow('⚠')}  ${dim(results.note)}\n`);
      }

      if (results.insight) {
        console.log(`${dim(results.insight)}\n`);
      }

      results.central_lenses.forEach((lens, idx) => {
        console.log(`${yellow(`${idx + 1}.`)} ${bold(lens.name)} ${dim(`(Ep. ${lens.episode})`)}`);
        console.log(`   ${dim('Centrality:')} ${lens.centrality_score}`);
        console.log(`   ${lens.definition}`);
        console.log(`   ${dim('Concepts: ' + lens.related_concepts.slice(0, 5).join(', '))}\n`);
      });
    } else {
      console.log(dim(results.error || 'Could not retrieve central lenses.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdNeighborhood(lens, options) {
  try {
    const radius = options.radius || 2;

    printHeader(`Neighborhood of "${lens}" (radius: ${radius})`);

    const results = await api.getLensNeighborhood(lens, radius);

    if (results.success && results.neighborhood) {
      console.log(`${bold(results.source_lens.name)} ${dim(`(Ep. ${results.source_lens.episode})`)}`);
      console.log(`${results.source_lens.definition}\n`);

      Object.entries(results.neighborhood).forEach(([edgeType, lenses]) => {
        if (lenses.length > 0) {
          console.log(`${bold(green(edgeType.toUpperCase() + ' connections'))} ${dim(`(${lenses.length})`)}`);
          lenses.forEach(l => {
            console.log(`  • ${bold(l.name)} ${dim(`(Ep. ${l.episode})`)}: ${l.definition.substring(0, 80)}...`);
          });
          console.log('');
        }
      });
    } else {
      console.log(dim(results.error || 'Could not explore neighborhood.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdContrasts(lens) {
  try {
    printHeader(`Contrasting lenses for "${lens}"`);

    const results = await api.findContrastingLenses(lens);

    if (results.success && results.contrasts && results.contrasts.length > 0) {
      console.log(`${bold('Source:')} ${bold(results.source_lens.name)} ${dim(`(Ep. ${results.source_lens.episode})`)}`);
      console.log(`${results.source_lens.definition}\n`);
      console.log(`${bold(green(`Paradoxical Pairs (${results.count}):`))}\n`);

      results.contrasts.forEach((contrast, idx) => {
        console.log(`${yellow(`${idx + 1}.`)} ${bold(contrast.name)} ${dim(`(Ep. ${contrast.episode})`)}`);
        console.log(`   ${contrast.definition}`);
        console.log(`   ${magenta('💭')} ${contrast.insight}\n`);
      });
    } else {
      console.log(dim(results.error || 'No contrasts found for this lens.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdTriads(lens, options = {}) {
  try {
    const limit = parseInt(options.limit) || 3;
    printHeader(`Dialectic triads for "${lens}"`);

    const results = await api.getDialecticTriads(lens, limit);

    if (results.success && results.triads && results.triads.length > 0) {
      console.log(`${bold('Source:')} ${bold(results.source_lens.name)} ${dim(`(Ep. ${results.source_lens.episode})`)}`);
      console.log(`${results.source_lens.definition}\n`);
      console.log(`${bold(magenta(`Thesis/Antithesis/Synthesis Triads (${results.count}):`))}\n`);

      results.triads.forEach((triad, idx) => {
        console.log(`${bold(yellow(`Triad ${idx + 1}:`))}`);
        console.log(`   ${green('THESIS:')} ${bold(triad.thesis.name)} ${dim(`(Ep. ${triad.thesis.episode})`)}`);
        console.log(`   ${triad.thesis.definition.slice(0, 150)}...\n`);
        console.log(`   ${red('ANTITHESIS:')} ${bold(triad.antithesis.name)} ${dim(`(Ep. ${triad.antithesis.episode})`)}`);
        console.log(`   ${triad.antithesis.definition.slice(0, 150)}...\n`);
        console.log(`   ${blue('SYNTHESIS:')} ${bold(triad.synthesis.name)} ${dim(`(Ep. ${triad.synthesis.episode})`)}`);
        console.log(`   ${triad.synthesis.definition.slice(0, 150)}...\n`);
        console.log(`   ${magenta('💡')} ${triad.synthesis_insight}\n`);
      });
    } else {
      console.log(dim(results.error || results.message || 'No triads found for this lens.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdProgressions(start, target, options = {}) {
  try {
    const maxSteps = parseInt(options['max-steps']) || 5;
    printHeader(`Learning progression: "${start}" → "${target}"`);

    const results = await api.getLensProgressions(start, target, maxSteps);

    if (results.success && results.progression && results.progression.length > 0) {
      console.log(`${results.summary}\n`);
      console.log(`${bold(cyan('PROGRESSION:'))}\n`);

      results.progression.forEach((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === results.progression.length - 1;
        const marker = isFirst ? '🚀' : isLast ? '🎯' : '→';

        console.log(`${bold(yellow(`Step ${step.step}`))} ${marker} ${bold(step.lens.name)} ${dim(`(Ep. ${step.lens.episode})`)}`);
        console.log(`   ${step.lens.definition.slice(0, 150)}...`);
        console.log(`   ${dim(step.insight)}\n`);
      });
    } else {
      console.log(dim(results.error || 'No progression found between these lenses.'));
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

async function cmdExport(format, options = {}) {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const validFormats = ['openai', 'openapi'];

  if (!format || !validFormats.includes(format)) {
    printError(`Invalid format. Use: linsenkasten export --format <openai|openapi>`);
    console.log(`\n${bold('Available formats:')}`);
    console.log(`  ${green('openai')}   - OpenAI function calling schema (JSON)`);
    console.log(`  ${green('openapi')}  - OpenAPI 3.0 specification (YAML)`);
    process.exit(1);
  }

  try {
    const schemaDir = path.join(__dirname, 'schemas');
    let filePath, content;

    if (format === 'openai') {
      filePath = path.join(schemaDir, 'openai-functions.json');
      content = await fs.readFile(filePath, 'utf-8');
    } else if (format === 'openapi') {
      filePath = path.join(schemaDir, 'openapi.yaml');
      content = await fs.readFile(filePath, 'utf-8');
    }

    if (options.output) {
      await fs.writeFile(options.output, content);
      console.log(`${green('✓')} Exported ${format} schema to ${options.output}`);
    } else {
      // Output to stdout
      console.log(content);
    }
  } catch (error) {
    printError(`Failed to export schema: ${error.message}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
${bold(cyan('Linsenkasten CLI'))} - FLUX Lens Exploration Tool

${bold('USAGE:')}
  linsenkasten <command> [options]

${bold('COMMANDS:')}
  ${green('search')} <query>              Search for lenses
    ${dim('--limit <n>              Number of results (default: 10)')}
    ${dim('Example: linsenkasten search "systems thinking" --limit 5')}

  ${green('get')} <name>                  Get detailed lens information
    ${dim('Example: linsenkasten get "Pace Layering"')}

  ${green('journey')} <source> <target>   Find conceptual path between two lenses
    ${dim('Example: linsenkasten journey "Systems Thinking" "Innovation"')}

  ${green('random')}                      Get a random lens provocation
    ${dim('--context <lens>         Lens names already explored (enables gap-aware selection)')}
    ${dim('Example: linsenkasten random')}
    ${dim('Example: linsenkasten random --context "Pace Layering" --context "Systems Thinking"')}

  ${green('gaps')}                        Analyze thinking gaps across FLUX frames
    ${dim('--context <lens>         Required: Lens names that have been explored')}
    ${dim('Example: linsenkasten gaps --context "Pace Layering" --context "Systems Thinking"')}

  ${green('bridge')} <lens1> <lens2>...   Find lenses that bridge between concepts
    ${dim('Example: linsenkasten bridge "Leadership" "Complexity" "Communication"')}

  ${green('central')}                     Get most central lenses in the network
    ${dim('--measure <type>         Centrality measure: betweenness, pagerank, eigenvector (default: betweenness)')}
    ${dim('--limit <n>              Number of results (default: 10)')}
    ${dim('Example: linsenkasten central --measure pagerank --limit 5')}

  ${green('neighborhood')} <lens>         Explore conceptual neighborhood around a lens
    ${dim('--radius <n>             Exploration depth: 1 or 2 (default: 2)')}
    ${dim('Example: linsenkasten neighborhood "Pace Layering" --radius 1')}

  ${green('contrasts')} <lens>            Find contrasting/paradoxical lenses
    ${dim('Example: linsenkasten contrasts "Explore vs Exploit"')}

  ${green('triads')} <lens>               Get thesis/antithesis/synthesis triads
    ${dim('--limit <n>              Number of triads (default: 3)')}
    ${dim('Example: linsenkasten triads "Pace Layering"')}

  ${green('progressions')} <start> <target>  Get learning progression between lenses
    ${dim('--max-steps <n>          Maximum steps (default: 5)')}
    ${dim('Example: linsenkasten progressions "Systems Thinking" "Innovation"')}

  ${green('export')}                      Export schemas for other platforms
    ${dim('--format <type>          Schema format: openai, openapi')}
    ${dim('--output <file>          Write to file (default: stdout)')}
    ${dim('Example: linsenkasten export --format openai')}
    ${dim('Example: linsenkasten export --format openapi --output api.yaml')}

  ${green('help')}                        Show this help message

${bold('ENVIRONMENT:')}
  LINSENKASTEN_API_URL    Override API endpoint (default: hosted API)

${bold('EXAMPLES:')}
  linsenkasten search innovation
  linsenkasten get "Systems Thinking"
  linsenkasten journey "Pace Layering" "Innovation Cascade"
  linsenkasten random
  linsenkasten random --context "Pace Layering" --context "Systems Thinking"
  linsenkasten gaps --context "Innovation" --context "Leadership" --context "Systems Thinking"
  linsenkasten bridge "Leadership" "Complexity"
  linsenkasten central --measure betweenness --limit 10
  linsenkasten neighborhood "Systems Thinking" --radius 2
  linsenkasten contrasts "Explore vs Exploit"
  linsenkasten triads "Pace Layering" --limit 2
  linsenkasten progressions "Systems Thinking" "Innovation"

${bold('LEARN MORE:')}
  GitHub: https://github.com/mistakeknot/Linsenkasten
  FLUX:   https://read.fluxcollective.org/
`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  const params = [];
  const options = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];

      // Handle multiple occurrences of --context by accumulating into an array
      if (key === 'context') {
        if (!options.context) {
          options.context = [];
        }
        options.context.push(value);
      } else {
        options[key] = value;
      }

      i++; // skip next arg
    } else {
      params.push(args[i]);
    }
  }

  return { command, params, options };
}

// Main execution
async function main() {
  const { command, params, options } = parseArgs();

  try {
    switch (command) {
      case 'search':
        if (params.length === 0) {
          printError('Missing search query. Usage: linsenkasten search <query>');
          process.exit(1);
        }
        await cmdSearch(params.join(' '), options);
        break;

      case 'get':
        if (params.length === 0) {
          printError('Missing lens name. Usage: linsenkasten get <name>');
          process.exit(1);
        }
        await cmdGet(params.join(' '));
        break;

      case 'journey':
        if (params.length < 2) {
          printError('Missing source or target. Usage: linsenkasten journey <source> <target>');
          process.exit(1);
        }
        await cmdJourney(params[0], params.slice(1).join(' '));
        break;

      case 'random':
        await cmdRandom(options);
        break;

      case 'gaps':
        await cmdGaps(options.context || []);
        break;

      case 'bridge':
        if (params.length < 2) {
          printError('Need at least 2 lenses. Usage: linsenkasten bridge <lens1> <lens2> [lens3...]');
          process.exit(1);
        }
        await cmdBridge(params);
        break;

      case 'central':
        await cmdCentral(options);
        break;

      case 'neighborhood':
        if (params.length === 0) {
          printError('Missing lens name. Usage: linsenkasten neighborhood <lens>');
          process.exit(1);
        }
        await cmdNeighborhood(params.join(' '), options);
        break;

      case 'contrasts':
        if (params.length === 0) {
          printError('Missing lens name. Usage: linsenkasten contrasts <lens>');
          process.exit(1);
        }
        await cmdContrasts(params.join(' '));
        break;

      case 'triads':
        if (params.length === 0) {
          printError('Missing lens name. Usage: linsenkasten triads <lens> [--limit n]');
          process.exit(1);
        }
        await cmdTriads(params.join(' '), options);
        break;

      case 'progressions':
        if (params.length < 2) {
          printError('Missing lens names. Usage: linsenkasten progressions <start> <target> [--max-steps n]');
          process.exit(1);
        }
        await cmdProgressions(params[0], params.slice(1).join(' '), options);
        break;

      case 'export':
        await cmdExport(options.format, options);
        break;

      default:
        printError(`Unknown command: ${command}`);
        console.log(dim('\nRun "linsenkasten help" for usage information.'));
        process.exit(1);
    }
  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}

main();
