#!/usr/bin/env python3
"""Capture the Python LensGraph's answers as JSON fixtures before apps/api is deleted (plan Task 4 Step 0).

Run once: uv run --offline --with networkx python3 scripts/capture-graph-reference.py [--data-dir data/curated]
Writes tests/fixtures/graph-py/*.json. graph.py hardcodes the pre-move file names, so the data dir is exposed to it
through a temp directory of symlinks under those names. Two fixture families:
  * central_<measure>.json           — the DiGraph as the Flask app ran it (documentation of the divergence only);
  * central_<measure>_undirected.json — phantom nodes removed, graph symmetrised: the apples-to-apples reference the
    JS port (undirected by design) is asserted against in packages/mcp/test/graph.test.mjs (top-10 overlap >= 8).
"""
from __future__ import annotations
import argparse, importlib.util, json, os, sys, tempfile
from pathlib import Path

OLD_NAMES = {"lenses.json": "all_lenses_for_analysis.json", "connections.json": "claude_lens_connections_analysis.json",
             "frames.json": "lens_frames_thematic.json"}

ROOT = Path(__file__).resolve().parents[1]
EYE, FOUNDER = "lens_161_weekly_eye_of_sauron", "lens_161_headline_founder_mode"

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(ROOT / "data" / "curated"))
    ap.add_argument("--out", default=str(ROOT / "tests" / "fixtures" / "graph-py"))
    a = ap.parse_args()
    spec = importlib.util.spec_from_file_location("lens_graph_ref", ROOT / "apps" / "api" / "src" / "lens" / "graph.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)  # type: ignore[union-attr]
    data_dir = Path(a.data_dir)
    view = tempfile.mkdtemp(prefix="graph-ref-")
    for new, old in OLD_NAMES.items():   # graph.py reads the pre-move names; expose data/curated under them
        src = data_dir / (new if (data_dir / new).exists() else old)
        os.symlink(src, Path(view) / old)
    mod.DATA_DIR = view
    g = mod.LensGraph()
    n_nodes, n_edges = g.graph.number_of_nodes(), g.graph.number_of_edges()
    # networkx add_edge() auto-creates a node for any endpoint id that has no lens record; those phantom
    # nodes (no 'name' attribute) are dropped from every fixture because the JS port never creates them.
    real = lambda n: "name" in g.graph.nodes[n]
    phantoms = sorted(n for n in g.graph.nodes if not real(n))
    fixtures = {
        "central_betweenness": [list(x) for x in g.get_central_lenses("betweenness") if real(x[0])],
        "central_pagerank": [list(x) for x in g.get_central_lenses("pagerank") if real(x[0])],
        "central_eigenvector": [list(x) for x in g.get_central_lenses("eigenvector") if real(x[0])],
        "paths_eye_founder": [p for p in g.find_path(EYE, FOUNDER) if all(real(n) for n in p)],
        "contrasts_eye": [list(x) for x in g.find_contrasts(EYE) if real(x[0])],
        "neighborhood_eye_r2": {k: [n for n in v if real(n)] for k, v in g.get_lens_neighborhood(EYE, 2).items()},
        "bridges_eye_founder": [n for n in g.find_bridges([EYE, FOUNDER]) if real(n)],
    }
    # Apples-to-apples reference for the JS port: drop phantom nodes, symmetrise, rank top 10 (ties by id).
    G = g.graph.copy(); G.remove_nodes_from(phantoms); U = G.to_undirected()
    try:
        from networkx.algorithms.link_analysis.pagerank_alg import _pagerank_python as _pr
    except ImportError:  # pragma: no cover
        _pr = mod.nx.pagerank
    top = lambda d: [[n, s, G.nodes[n]["name"]] for n, s in sorted(d.items(), key=lambda x: (-x[1], x[0]))[:10]]
    fixtures.update({
        "central_betweenness_undirected": top(mod.nx.betweenness_centrality(U)),
        "central_pagerank_undirected": top(_pr(U, alpha=0.85)),
        "central_eigenvector_undirected": top(mod.nx.eigenvector_centrality(U, max_iter=2000)),
        "central_degree_undirected": top(mod.nx.degree_centrality(U)),
    })
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for name, val in fixtures.items():
        (out / f"{name}.json").write_text(json.dumps(val, indent=1, sort_keys=True) + "\n")
    meta = {"source": "apps/api/src/lens/graph.py", "graph": "networkx.DiGraph", "nodes": n_nodes, "edges": n_edges,
            "lens_nodes": n_nodes - len(phantoms), "phantom_nodes": phantoms,
            "undirected_edges_without_phantoms": U.number_of_edges(),
            "networkx": mod.nx.__version__, "eye": EYE, "founder": FOUNDER}
    (out / "meta.json").write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")
    print(f"captured {len(fixtures)} fixtures from {n_nodes} nodes ({len(phantoms)} phantom) / {n_edges} edges into {out}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
