function compareIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function edgeWeight(value, fallback) {
  const weight = Number(value);
  return Number.isFinite(weight) ? weight : fallback;
}

function addUndirectedEdge(adj, source, target, edge) {
  if (source === target || !adj.has(source) || !adj.has(target)) return;
  if (adj.get(source).has(target)) return;
  adj.get(source).set(target, edge);
  adj.get(target).set(source, edge);
}

export function buildGraph(store) {
  const curated = Array.isArray(store.curated) ? store.curated : [];
  const generated = Array.isArray(store.generated) ? store.generated : [];
  const ids = [];
  const seen = new Set();
  const names = new Map();
  const layers = new Map();

  for (const lens of [...curated, ...generated]) {
    if (!lens?.id || seen.has(lens.id)) continue;
    seen.add(lens.id);
    ids.push(lens.id);
    names.set(lens.id, lens.name || lens.lens_name || lens.id);
    layers.set(lens.id, lens.layer || (curated.includes(lens) ? 'curated' : 'generated'));
  }

  const adj = new Map(ids.map(id => [id, new Map()]));

  for (const connection of store.connections || []) {
    const edge = {
      weight: edgeWeight(connection.weight, 0),
      type: connection.type,
    };
    if (connection.insight !== undefined) edge.insight = connection.insight;
    addUndirectedEdge(adj, connection.source_id, connection.target_id, edge);
  }

  for (const frame of store.frames || []) {
    const frameIds = (frame.lens_ids || []).filter(id => adj.has(id));
    for (let i = 0; i < frameIds.length; i += 1) {
      for (let j = i + 1; j < frameIds.length; j += 1) {
        addUndirectedEdge(adj, frameIds[i], frameIds[j], { weight: 0.3, type: 'frame' });
      }
    }
  }

  const byEpisode = new Map();
  for (const lens of curated) {
    const episode = Number(lens.episode);
    if (!Number.isInteger(episode) || !adj.has(lens.id)) continue;
    if (!byEpisode.has(episode)) byEpisode.set(episode, []);
    byEpisode.get(episode).push(lens.id);
  }
  const episodes = [...byEpisode.keys()].sort((a, b) => a - b);
  for (const episode of episodes) {
    const next = byEpisode.get(episode + 1);
    if (!next) continue;
    for (const source of byEpisode.get(episode)) {
      for (const target of next) {
        addUndirectedEdge(adj, source, target, { weight: 0.1, type: 'temporal' });
      }
    }
  }

  const byConcept = new Map();
  for (const lens of curated) {
    if (!adj.has(lens.id)) continue;
    for (const rawConcept of lens.related_concepts || []) {
      const concept = String(rawConcept).toLowerCase();
      if (!byConcept.has(concept)) byConcept.set(concept, new Set());
      byConcept.get(concept).add(lens.id);
    }
  }
  for (const conceptIds of byConcept.values()) {
    if (conceptIds.size < 2 || conceptIds.size > 5) continue;
    const lensIds = [...conceptIds];
    for (let i = 0; i < lensIds.length; i += 1) {
      for (let j = i + 1; j < lensIds.length; j += 1) {
        addUndirectedEdge(adj, lensIds[i], lensIds[j], { weight: 0.4, type: 'concept' });
      }
    }
  }

  const generatedTypes = new Set(['embodies', 'fused-from', 'variant-of']);
  for (const generatedEdge of store.edges || []) {
    if (!generatedTypes.has(generatedEdge.type)) continue;
    const fallback = generatedEdge.type === 'embodies' ? 0 : 0.5;
    const edge = {
      weight: edgeWeight(generatedEdge.score, fallback),
      type: generatedEdge.type,
    };
    if (generatedEdge.insight !== undefined) edge.insight = generatedEdge.insight;
    addUndirectedEdge(adj, generatedEdge.source, generatedEdge.target, edge);
  }

  return { adj, ids, layers, names };
}

function comparePaths(a, b) {
  return b.weight - a.weight
    || a.path.length - b.path.length
    || compareIds(a.path.join('\0'), b.path.join('\0'));
}

export function findPaths(g, srcId, dstId, maxLen = 4, limit = 3) {
  if (limit <= 0 || !g.adj.has(srcId) || !g.adj.has(dstId)) return [];
  if (srcId === dstId) return [[srcId]];

  const cutoff = Math.max(0, Math.floor(maxLen));
  const best = [];
  const path = [srcId];
  const visited = new Set(path);

  function keep(candidate, weight) {
    best.push({ path: [...candidate], weight });
    best.sort(comparePaths);
    if (best.length > limit) best.pop();
  }

  function visit(current, weight) {
    const depth = path.length - 1;
    if (depth >= cutoff) return;
    for (const [neighbor, edge] of g.adj.get(current)) {
      if (visited.has(neighbor)) continue;
      path.push(neighbor);
      visited.add(neighbor);
      const nextWeight = weight + edgeWeight(edge.weight, 0);
      if (neighbor === dstId) keep(path, nextWeight);
      else visit(neighbor, nextWeight);
      visited.delete(neighbor);
      path.pop();
    }
  }

  visit(srcId, 0);
  return best.map(({ path: result }) => result);
}

export function findBridges(g, ids) {
  const group = new Set(ids.filter(id => g.adj.has(id)));
  const candidates = new Map();

  for (const id of group) {
    for (const [candidate, edge] of g.adj.get(id)) {
      if (group.has(candidate)) continue;
      if (!candidates.has(candidate)) candidates.set(candidate, { touches: 0, score: 0 });
      const entry = candidates.get(candidate);
      entry.touches += 1;
      entry.score += edgeWeight(edge.weight, 0);
    }
  }

  return [...candidates.entries()]
    .filter(([, { touches }]) => touches >= 2)
    .sort((a, b) => b[1].score - a[1].score || compareIds(a[0], b[0]))
    .slice(0, 5)
    .map(([id]) => id);
}

export function findContrasts(g, id) {
  if (!g.adj.has(id)) return [];
  return [...g.adj.get(id)]
    .filter(([, edge]) => edge.type === 'contrast')
    .map(([neighbor, edge]) => ({
      id: neighbor,
      weight: edgeWeight(edge.weight, 0),
      insight: edge.insight || '',
    }))
    .sort((a, b) => b.weight - a.weight || compareIds(a.id, b.id));
}

export function neighborhood(g, id, radius = 2) {
  if (!g.adj.has(id) || radius <= 0) return {};
  const result = {};
  const visited = new Set([id]);
  const queue = [[id, 0]];
  let head = 0;

  while (head < queue.length) {
    const [current, depth] = queue[head];
    head += 1;
    if (depth >= radius) continue;
    for (const [neighbor, edge] of g.adj.get(current)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      const type = edge.type || 'unknown';
      if (!result[type]) result[type] = [];
      result[type].push(neighbor);
      queue.push([neighbor, depth + 1]);
    }
  }

  return result;
}

function centralityGraph(g, layer) {
  const ids = layer === 'all' || !g.layers
    ? [...g.ids]
    : g.ids.filter(id => g.layers.get(id) === layer);
  const index = new Map(ids.map((id, i) => [id, i]));
  const neighbors = ids.map(id => {
    const result = [];
    for (const neighbor of g.adj.get(id)?.keys() || []) {
      const neighborIndex = index.get(neighbor);
      if (neighborIndex !== undefined && neighborIndex !== index.get(id)) result.push(neighborIndex);
    }
    return result;
  });
  return { ids, neighbors };
}

function betweennessCentrality(neighbors) {
  const count = neighbors.length;
  const scores = new Float64Array(count);
  const predecessors = Array.from({ length: count }, () => []);
  const sigma = new Float64Array(count);
  const distance = new Int32Array(count);
  const delta = new Float64Array(count);
  const queue = new Int32Array(count);
  const stack = new Int32Array(count);

  for (let source = 0; source < count; source += 1) {
    distance.fill(-1);
    sigma.fill(0);
    delta.fill(0);
    for (const list of predecessors) list.length = 0;

    let queueHead = 0;
    let queueLength = 1;
    let stackLength = 0;
    queue[0] = source;
    distance[source] = 0;
    sigma[source] = 1;

    while (queueHead < queueLength) {
      const vertex = queue[queueHead];
      queueHead += 1;
      stack[stackLength] = vertex;
      stackLength += 1;
      const nextDistance = distance[vertex] + 1;
      for (const neighbor of neighbors[vertex]) {
        if (distance[neighbor] < 0) {
          distance[neighbor] = nextDistance;
          queue[queueLength] = neighbor;
          queueLength += 1;
        }
        if (distance[neighbor] === nextDistance) {
          sigma[neighbor] += sigma[vertex];
          predecessors[neighbor].push(vertex);
        }
      }
    }

    while (stackLength > 0) {
      stackLength -= 1;
      const vertex = stack[stackLength];
      if (sigma[vertex] !== 0) {
        const dependency = (1 + delta[vertex]) / sigma[vertex];
        for (const predecessor of predecessors[vertex]) {
          delta[predecessor] += sigma[predecessor] * dependency;
        }
      }
      if (vertex !== source) scores[vertex] += delta[vertex];
    }
  }

  if (count > 2) {
    const scale = 1 / ((count - 1) * (count - 2));
    for (let i = 0; i < count; i += 1) scores[i] *= scale;
  }
  return scores;
}

function pageRankCentrality(neighbors) {
  const count = neighbors.length;
  if (count === 0) return new Float64Array();
  const damping = 0.85;
  let scores = new Float64Array(count).fill(1 / count);
  let next = new Float64Array(count);

  for (let iteration = 0; iteration < 100; iteration += 1) {
    next.fill((1 - damping) / count);
    let dangling = 0;
    for (let vertex = 0; vertex < count; vertex += 1) {
      const degree = neighbors[vertex].length;
      if (degree === 0) {
        dangling += scores[vertex];
        continue;
      }
      const share = damping * scores[vertex] / degree;
      for (const neighbor of neighbors[vertex]) next[neighbor] += share;
    }
    if (dangling !== 0) {
      const share = damping * dangling / count;
      for (let i = 0; i < count; i += 1) next[i] += share;
    }
    [scores, next] = [next, scores];
  }
  return scores;
}

function eigenvectorCentrality(neighbors) {
  const count = neighbors.length;
  if (count === 0) return new Float64Array();
  let scores = new Float64Array(count).fill(1 / Math.sqrt(count));
  let next = new Float64Array(count);

  for (let iteration = 0; iteration < 100; iteration += 1) {
    next.fill(0);
    for (let vertex = 0; vertex < count; vertex += 1) {
      for (const neighbor of neighbors[vertex]) next[vertex] += scores[neighbor];
    }
    let normSquared = 0;
    for (const value of next) normSquared += value * value;
    const norm = Math.sqrt(normSquared);
    if (norm === 0) return next;
    for (let i = 0; i < count; i += 1) next[i] /= norm;
    [scores, next] = [next, scores];
  }
  return scores;
}

function degreeCentrality(neighbors) {
  const denominator = Math.max(1, neighbors.length - 1);
  return Float64Array.from(neighbors, list => list.length / denominator);
}

export function centralLenses(g, measure = 'betweenness', limit = 10, { layer = 'curated' } = {}) {
  if (limit <= 0) return [];
  const { ids, neighbors } = centralityGraph(g, layer);
  const normalizedMeasure = String(measure).toLowerCase();
  let scores;
  if (normalizedMeasure === 'betweenness') scores = betweennessCentrality(neighbors);
  else if (normalizedMeasure === 'pagerank') scores = pageRankCentrality(neighbors);
  else if (normalizedMeasure === 'eigenvector') scores = eigenvectorCentrality(neighbors);
  else scores = degreeCentrality(neighbors);

  return ids.map((id, index) => ({
    id,
    name: g.names?.get(id) || id,
    centrality_score: scores[index],
  }))
    .sort((a, b) => b.centrality_score - a.centrality_score || compareIds(a.id, b.id))
    .slice(0, limit);
}

function resolveStoreLens(store, nameOrId) {
  if (!nameOrId) return null;
  return store.byId.get(nameOrId) || store.byName.get(String(nameOrId).toLowerCase()) || null;
}

export function frameCoverage(store, exploredNames) {
  const unknown = [];
  const exploredIds = new Set();
  for (const name of exploredNames || []) {
    const lens = resolveStoreLens(store, name);
    if (lens) exploredIds.add(lens.id);
    else unknown.push(name);
  }

  const frameCounts = new Map();
  for (const id of exploredIds) {
    for (const frameId of store.frameOfLens.get(id) || []) {
      frameCounts.set(frameId, (frameCounts.get(frameId) || 0) + 1);
    }
  }

  const explored = {};
  const underexplored = [];
  const unexplored = [];
  for (const frame of store.frames || []) {
    const count = frameCounts.get(frame.id) || 0;
    if (count > 0) {
      explored[frame.name] = count;
      if (count === 1) underexplored.push(frame.name);
    } else {
      unexplored.push(frame.name);
    }
  }

  const totalFrames = (store.frames || []).length;
  return {
    explored,
    underexplored,
    unexplored,
    unknown,
    total_frames: totalFrames,
    coverage_percentage: totalFrames === 0
      ? 0
      : Math.round(Object.keys(explored).length / totalFrames * 100),
  };
}

function storeLens(store, id) {
  const lens = store.byId.get(id);
  return lens ? { ...lens } : null;
}

export function triads(g, store, id, limit = 3) {
  const thesis = storeLens(store, id);
  if (!thesis || limit <= 0) return [];
  const result = [];

  for (const contrast of findContrasts(g, id)) {
    const antithesis = storeLens(store, contrast.id);
    if (!antithesis) continue;
    const candidates = [];
    for (const [candidateId, thesisEdge] of g.adj.get(id)) {
      if (candidateId === id || candidateId === contrast.id) continue;
      const antithesisEdge = g.adj.get(contrast.id)?.get(candidateId);
      if (!antithesisEdge || !store.byId.has(candidateId)) continue;
      candidates.push({
        id: candidateId,
        score: edgeWeight(thesisEdge.weight, 0) + edgeWeight(antithesisEdge.weight, 0),
        thesisEdge,
        antithesisEdge,
      });
    }
    candidates.sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
    if (candidates.length === 0) continue;

    const synthesisCandidate = candidates[0];
    result.push({
      thesis: { ...thesis },
      antithesis,
      synthesis: storeLens(store, synthesisCandidate.id),
      contrast_insight: contrast.insight,
      synthesis_insight: synthesisCandidate.antithesisEdge.insight
        || synthesisCandidate.thesisEdge.insight
        || '',
    });
    if (result.length >= limit) break;
  }

  return result;
}

export function progression(g, store, startId, targetId, maxSteps = 5) {
  const path = findPaths(g, startId, targetId, maxSteps, 1)[0];
  if (!path) return { progression: [], overall_insight: '' };

  const steps = path.map((id, index) => ({
    step: index + 1,
    lens: storeLens(store, id),
    insight: index === 0 ? '' : (g.adj.get(path[index - 1]).get(id).insight || ''),
  }));
  let overallInsight = '';
  for (const step of steps) if (step.insight) overallInsight = step.insight;
  return { progression: steps, overall_insight: overallInsight };
}
