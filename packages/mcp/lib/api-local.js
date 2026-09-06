import {
  getAllLenses as storeGetAllLenses,
  getFrames as storeGetFrames,
  getLens as storeGetLens,
  getLensesByEpisode as storeGetLensesByEpisode,
  getRelatedLenses as storeGetRelatedLenses,
  loadStore,
  searchLenses as storeSearchLenses,
} from './store.js';
import {
  buildGraph,
  centralLenses,
  findBridges,
  findContrasts,
  findPaths,
  frameCoverage,
  neighborhood,
  progression,
  triads,
} from './graph.js';

let cachedStore = null;
let cachedGraph = null;

function failure(error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

async function safely(operation) {
  try {
    return await operation();
  } catch (error) {
    return failure(error);
  }
}

async function localGraph() {
  const store = await loadStore();
  if (store !== cachedStore) {
    cachedStore = store;
    cachedGraph = buildGraph(store);
  }
  return { store, graph: cachedGraph };
}

function missingLens(name) {
  return failure(`Lens "${name}" not found`);
}

function lensFromStore(store, id) {
  const lens = store.byId.get(id);
  return lens ? { ...lens } : null;
}

function pathWeight(graph, path) {
  let weight = 0;
  for (let index = 1; index < path.length; index += 1) {
    weight += Number(graph.adj.get(path[index - 1])?.get(path[index])?.weight) || 0;
  }
  return weight;
}

function choose(items, seed = Date.now()) {
  if (items.length === 0) return null;
  return items[Math.abs(Math.trunc(seed)) % items.length];
}

export async function getCachedData() {
  return null;
}

export async function setCachedData() {}

export async function fetchFromAPI() {
  throw new Error('linsenkasten: remote API retired; use the local store');
}

export async function searchLenses(query, limit = 10) {
  return safely(() => storeSearchLenses(query, limit));
}

export async function getLens(name) {
  return safely(() => storeGetLens(name));
}

export async function getLensesByEpisode(episode) {
  return safely(() => storeGetLensesByEpisode(episode));
}

export async function getRelatedLenses(name, limit = 5) {
  return safely(() => storeGetRelatedLenses(name, limit));
}

export async function findLensJourney(sourceName, targetName) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const source = await storeGetLens(sourceName);
    if (!source) return missingLens(sourceName);
    const target = await storeGetLens(targetName);
    if (!target) return missingLens(targetName);

    const idPaths = findPaths(graph, source.id, target.id);
    if (idPaths.length === 0) {
      return failure(`No path found between "${sourceName}" and "${targetName}"`);
    }
    return {
      success: true,
      source_lens: source,
      target_lens: target,
      paths: idPaths.map(path => path.map(id => lensFromStore(store, id))),
      path_weights: idPaths.map(path => pathWeight(graph, path)),
    };
  });
}

export async function findBridgeLenses(names) {
  return safely(async () => {
    if (!Array.isArray(names) || names.length < 2) {
      return failure('At least two lens names are required');
    }
    const { store, graph } = await localGraph();
    const lenses = await Promise.all(names.map(name => storeGetLens(name)));
    const missingIndex = lenses.findIndex(lens => lens === null);
    if (missingIndex !== -1) return missingLens(names[missingIndex]);

    const sourceIds = lenses.map(lens => lens.id);
    const bridges = findBridges(graph, sourceIds).map((id) => ({
      ...lensFromStore(store, id),
      connection_strength: sourceIds.reduce(
        (sum, sourceId) => sum + (Number(graph.adj.get(id)?.get(sourceId)?.weight) || 0),
        0,
      ),
    }));
    return {
      success: true,
      count: bridges.length,
      bridges,
      insight: bridges.length > 0
        ? 'These lenses connect multiple concepts in the requested set.'
        : 'No lens directly bridges multiple concepts in the requested set.',
    };
  });
}

export async function findContrastingLenses(name) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const source = await storeGetLens(name);
    if (!source) return missingLens(name);
    const contrasts = findContrasts(graph, source.id)
      .map(({ id, weight, insight }) => ({
        ...lensFromStore(store, id),
        weight,
        insight,
      }));
    return {
      success: true,
      source_lens: source,
      count: contrasts.length,
      contrasts,
    };
  });
}

export async function getCentralLenses(measure = 'betweenness', limit = 10) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const central = centralLenses(graph, measure, limit).map(({ id, centrality_score }) => ({
      ...lensFromStore(store, id),
      centrality_score,
    }));
    return {
      success: true,
      measure,
      central_lenses: central,
      insight: `${measure} centrality highlights the most connected curated lenses.`,
    };
  });
}

export async function getLensNeighborhood(name, radius = 2) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const source = await storeGetLens(name);
    if (!source) return missingLens(name);
    const byType = neighborhood(graph, source.id, radius);
    const lensesByType = Object.fromEntries(
      Object.entries(byType).map(([type, ids]) => [
        type,
        ids.map(id => lensFromStore(store, id)).filter(Boolean),
      ]),
    );
    return {
      success: true,
      source_lens: source,
      radius,
      neighborhood: lensesByType,
    };
  });
}

export async function getGraph() {
  return safely(async () => {
    const store = await loadStore();
    return {
      success: true,
      connections: [...store.connections],
      edges: [...store.edges],
    };
  });
}

export async function getRandomProvocation(context = null) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const hasContext = Array.isArray(context) && context.length > 0;
    const seed = Date.now();
    let candidates = store.curated;
    let selectedFrame = null;
    let coverage = null;

    if (hasContext) {
      coverage = frameCoverage(store, context);
      const unexplored = new Set(coverage.unexplored);
      const eligibleFrames = store.frames
        .filter(frame => unexplored.has(frame.name))
        .map(frame => ({
          frame,
          lenses: (frame.lens_ids || [])
            .map(id => lensFromStore(store, id))
            .filter(lens => lens?.layer === 'curated'),
        }))
        .filter(({ lenses }) => lenses.length > 0);
      const selected = choose(eligibleFrames, seed);
      if (selected) {
        selectedFrame = selected.frame;
        candidates = selected.lenses;
      }
    }

    const provocation = choose(candidates, seed);
    if (!provocation) return failure('No curated lenses are available');
    const related = [...(graph.adj.get(provocation.id)?.keys() || [])]
      .map(id => lensFromStore(store, id))
      .filter(lens => lens?.layer === 'curated')
      .slice(0, 3);
    const result = {
      success: true,
      provocation,
      related,
      suggestion: `Use ${provocation.name} to challenge the assumptions in your current framing.`,
    };
    if (hasContext) {
      result.gap_analysis = {
        coverage: {
          explored: Object.keys(coverage.explored).length,
          total: coverage.total_frames,
        },
        was_gap_biased: selectedFrame !== null,
        suggested_from_frame: selectedFrame?.name || null,
      };
    }
    return result;
  });
}

export async function detectThinkingGaps(context) {
  return safely(async () => {
    if (!Array.isArray(context) || context.length === 0) {
      return failure('Context parameter required (list of explored lens names)');
    }
    const store = await loadStore();
    const coverage = frameCoverage(store, context);
    const suggestions = coverage.unexplored.slice(0, 5).map((frameName) => {
      const frame = store.frames.find(candidate => candidate.name === frameName);
      const sampleLenses = (frame?.lens_ids || []).slice(0, 3).map(id => store.byId.get(id))
        .filter(Boolean)
        .map(({ id, name, definition, episode }) => ({ id, name, definition, episode }));
      return { frame: frameName, sample_lenses: sampleLenses };
    });
    return {
      success: true,
      coverage: {
        explored_frames: coverage.explored,
        unexplored_frames: coverage.unexplored,
        underexplored_frames: coverage.underexplored,
        total_frames: coverage.total_frames,
        coverage_percentage: coverage.coverage_percentage,
      },
      suggestions,
      insight: coverage.unexplored.length > 0
        ? 'The unexplored frames are candidate blind spots for the current line of thinking.'
        : 'The current lens set touches every thematic frame.',
    };
  });
}

export async function getDialecticTriads(name, limit = 3) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const thesis = await storeGetLens(name);
    if (!thesis) return missingLens(name);
    const results = triads(graph, store, thesis.id, limit).map(({
      antithesis,
      synthesis,
      contrast_insight,
      synthesis_insight,
    }) => ({ antithesis, synthesis, contrast_insight, synthesis_insight }));
    if (results.length === 0) return failure(`No dialectic triads found for "${name}"`);
    return { success: true, thesis, triads: results };
  });
}

export async function getLensProgressions(startName, targetName, maxSteps = 5) {
  return safely(async () => {
    const { store, graph } = await localGraph();
    const start = await storeGetLens(startName);
    if (!start) return missingLens(startName);
    const target = await storeGetLens(targetName);
    if (!target) return missingLens(targetName);
    const result = progression(graph, store, start.id, target.id, maxSteps);
    if (result.progression.length === 0) {
      return failure(`No progression found between "${startName}" and "${targetName}"`);
    }
    return {
      success: true,
      start_lens: start,
      target_lens: target,
      progression: result.progression,
      overall_insight: result.overall_insight,
    };
  });
}

export async function getAllLenses() {
  return safely(async () => ({
    success: true,
    lenses: await storeGetAllLenses('curated'),
  }));
}

export async function getFrames() {
  return safely(() => storeGetFrames());
}
