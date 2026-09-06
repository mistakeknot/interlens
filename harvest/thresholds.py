import re

EMBED_MODEL = "nomic-embed-text"
EMBED_DIM = 768
VARIANT_MIN_COSINE = 0.92     # variant-of clustering
EMBODIES_MIN_COSINE = 0.60    # generated -> curated
EMBODIES_TOP_K = 3
RESOLVE_MIN_COSINE = 0.86     # registry hit for reuse (mirrors packages/mcp/lib/constants.js)
EXCLUDE_DIR_NAMES = {"node_modules", ".git", "target", "dist", "build", ".venv", "venv", ".worktrees", "worktrees"}
MAX_DEPTH = 6                 # below ~/projects
HASH_RECIPE = "body-v1"       # bump when normalize_body changes; recorded per record and in embeddings/meta.json (melange f-013/f-030/f-034)
TRUNCATION_MARKER = re.compile(r"\[truncated — \d+ chars omitted\]")   # bodies carrying this are corrupt (melange f-028)
REUSE_LOG_FALLBACK = "~/.local/share/linsenkasten/reuse-log.jsonl"       # outside every pruned directory (melange f-040)


def normalize_body(body: str) -> str:
    """The one normalization the content hash is taken over: frontmatter already stripped by the caller."""
    return re.sub(r"\s+", " ", body).strip()


def embedding_text(spec: dict | None, body: str) -> str:
    """The one recipe both layers use. Spec wins; body fallback is deterministic."""
    if spec:
        parts = [spec.get("persona", ""), spec.get("focus", ""), spec.get("decision_lens", "")]
        parts += list(spec.get("review_areas") or [])
        return "\n".join(p for p in parts if p).strip()
    import re
    m = re.search(r"^Apply the perspective.*?(?=\n\n)", body, re.S | re.M)
    heads = re.findall(r"^### \d+\. (.+)$", body, re.M)
    # Lead of the whitespace-normalized body (code points, not bytes): pre-v5 bodies have neither the persona
    # paragraph nor numbered headings, and an empty text embeds to one shared vector (2026-09-06 calibration:
    # a 28-member spurious cluster of empty-text records).
    lead = normalize_body(body)[:1200]
    return "\n".join(p for p in [m.group(0) if m else "", *heads, lead] if p).strip()
