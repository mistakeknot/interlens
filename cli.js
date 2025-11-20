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

async function cmdRandom() {
  try {
    printHeader('🎲 Random Lens Provocation');

    const results = await api.getRandomProvocation();

    if (results.success && results.provocation) {
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
    ${dim('Example: linsenkasten random')}

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

  ${green('help')}                        Show this help message

${bold('ENVIRONMENT:')}
  LINSENKASTEN_API_URL    Override API endpoint (default: hosted API)

${bold('EXAMPLES:')}
  linsenkasten search innovation
  linsenkasten get "Systems Thinking"
  linsenkasten journey "Pace Layering" "Innovation Cascade"
  linsenkasten random
  linsenkasten bridge "Leadership" "Complexity"
  linsenkasten central --measure betweenness --limit 10
  linsenkasten neighborhood "Systems Thinking" --radius 2
  linsenkasten contrasts "Explore vs Exploit"

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
      options[key] = value;
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
        await cmdRandom();
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
