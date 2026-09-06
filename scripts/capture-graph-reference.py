#!/usr/bin/env python3
"""Capture the Python LensGraph's answers as JSON fixtures before apps/api is deleted (plan Task 4 Step 0).

Run once: uv run --offline --with networkx python3 scripts/capture-graph-reference.py [--data-dir apps/api]
Writes tests/fixtures/graph-py/*.json. The JS port (packages/mcp/lib/graph.js) is undirected by design, so
packages/mcp/test/graph.test.mjs asserts documented relations against these files, not equality.
"""
from __future__ import annotations
import argparse, importlib.util, json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EYE, FOUNDER = "lens_161_weekly_eye_of_sauron", "lens_161_headline_founder_mode"

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(ROOT / "apps" / "api"))
    ap.add_argument("--out", default=str(ROOT / "tests" / "fixtures" / "graph-py"))
    a = ap.parse_args()
    spec = importlib.util.spec_from_file_location("lens_graph_ref", ROOT / "apps" / "api" / "src" / "lens" / "graph.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)  # type: ignore[union-attr]
    mod.DATA_DIR = a.data_dir
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
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for name, val in fixtures.items():
        (out / f"{name}.json").write_text(json.dumps(val, indent=1, sort_keys=True) + "\n")
    meta = {"source": "apps/api/src/lens/graph.py", "graph": "networkx.DiGraph", "nodes": n_nodes, "edges": n_edges,
            "lens_nodes": n_nodes - len(phantoms), "phantom_nodes": phantoms,
            "networkx": mod.nx.__version__, "eye": EYE, "founder": FOUNDER}
    (out / "meta.json").write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")
    print(f"captured {len(fixtures)} fixtures from {n_nodes} nodes ({len(phantoms)} phantom) / {n_edges} edges into {out}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
