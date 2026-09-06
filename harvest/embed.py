from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import socket
import sys
import tempfile
from array import array
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

from .thresholds import (
    EMBED_DIM,
    EMBED_MODEL,
    EMBODIES_MIN_COSINE,
    HASH_RECIPE,
    RESOLVE_MIN_COSINE,
    VARIANT_MIN_COSINE,
    embedding_text,
)


DEFAULT_DATA_ROOT = Path(__file__).resolve().parents[1] / "data"
DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
BATCH_SIZE = 32
OLLAMA_TIMEOUT_SECONDS = 60


class ModelDigestMismatch(RuntimeError):
    """The committed vectors were produced by a different model realization."""


class EmbeddingCheckError(RuntimeError):
    """The embedding artifacts are incomplete, malformed, or stale."""


def _json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode("utf-8")


def _atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temporary = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_optional_json(path: Path) -> Any | None:
    try:
        return _read_json(path)
    except FileNotFoundError:
        return None


def _read_index(path: Path) -> list[dict[str, Any]]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return []
    records: list[dict[str, Any]] = []
    for line_number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid JSON in {path}:{line_number}: {error.msg}") from error
        if not isinstance(record, dict):
            raise ValueError(f"expected object in {path}:{line_number}")
        records.append(record)
    return records


def _curated_inputs(data_root: Path) -> list[tuple[str, str]]:
    path = data_root / "curated/lenses.json"
    lenses = _read_json(path)
    if not isinstance(lenses, list):
        raise ValueError(f"expected a list in {path}")

    inputs: list[tuple[str, str]] = []
    for index, lens in enumerate(lenses):
        if not isinstance(lens, dict):
            raise ValueError(f"expected an object at {path}[{index}]")
        lens_id = lens.get("id")
        name = lens.get("name") or lens.get("lens_name")
        definition = lens.get("definition")
        examples = lens.get("examples") or []
        if not isinstance(lens_id, str) or not lens_id:
            raise ValueError(f"curated lens at index {index} has no id")
        if not isinstance(name, str) or not isinstance(definition, str):
            raise ValueError(f"curated lens {lens_id} has invalid embedding fields")
        if not isinstance(examples, list) or not all(
            isinstance(example, str) for example in examples
        ):
            raise ValueError(f"curated lens {lens_id} has invalid examples")
        text = f"{name}\n{definition}\n" + "\n".join(examples)
        inputs.append((lens_id, text))
    return _sorted_unique(inputs, "curated")


def _generated_inputs(data_root: Path) -> list[tuple[str, str]]:
    records = _read_index(data_root / "generated/index.jsonl")
    inputs: list[tuple[str, str]] = []
    for index, record in enumerate(records):
        lens_id = record.get("id")
        body_path = record.get("body_path")
        if not isinstance(lens_id, str) or not lens_id:
            raise ValueError(f"generated record at index {index} has no id")
        if not isinstance(body_path, str) or not body_path:
            raise ValueError(f"generated record {lens_id} has no body_path")
        body = (data_root / body_path).read_text(encoding="utf-8")

        spec = None
        spec_path = record.get("spec_path")
        if spec_path:
            if not isinstance(spec_path, str):
                raise ValueError(f"generated record {lens_id} has invalid spec_path")
            spec = _read_json(data_root / spec_path)
            if not isinstance(spec, dict):
                raise ValueError(f"generated record {lens_id} has a non-object spec")
        inputs.append((lens_id, embedding_text(spec, body) or lens_id))
    return _sorted_unique(inputs, "generated")


def _sorted_unique(inputs: list[tuple[str, str]], layer: str) -> list[tuple[str, str]]:
    result = sorted(inputs, key=lambda item: item[0])
    ids = [lens_id for lens_id, _ in result]
    if len(ids) != len(set(ids)):
        raise ValueError(f"duplicate {layer} embedding id")
    return result


def _endpoint(url: str, path: str) -> str:
    return f"{url.rstrip('/')}{path}"


def _request_json(request: Request, *, timeout: float) -> Any:
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _model_digest(ollama_url: str, *, timeout: float) -> str:
    payload = _request_json(
        Request(_endpoint(ollama_url, "/api/tags")),
        timeout=timeout,
    )
    models = payload.get("models") if isinstance(payload, dict) else None
    if not isinstance(models, list):
        raise RuntimeError("Ollama /api/tags response has no models list")

    expected_names = (f"{EMBED_MODEL}:latest", EMBED_MODEL)
    for expected in expected_names:
        for model in models:
            if not isinstance(model, dict) or model.get("name") != expected:
                continue
            digest = model.get("digest")
            if isinstance(digest, str) and digest:
                return digest
    raise RuntimeError(f"Ollama model {EMBED_MODEL} has no digest")


def _embed_batch(
    ollama_url: str,
    texts: list[str],
    *,
    timeout: float,
) -> list[array]:
    encoded = json.dumps({"model": EMBED_MODEL, "input": texts}).encode("utf-8")
    request = Request(
        _endpoint(ollama_url, "/api/embed"),
        data=encoded,
        headers={"content-type": "application/json"},
        method="POST",
    )
    payload = _request_json(request, timeout=timeout)
    embeddings = payload.get("embeddings") if isinstance(payload, dict) else None
    if not isinstance(embeddings, list) or len(embeddings) != len(texts):
        raise RuntimeError(f"expected {len(texts)} embeddings from Ollama")

    normalized: list[array] = []
    for vector in embeddings:
        if not isinstance(vector, list) or len(vector) != EMBED_DIM:
            raise RuntimeError(f"expected embedding dimension {EMBED_DIM}")
        values = array("f")
        norm_squared = 0.0
        for raw_value in vector:
            value = float(raw_value)
            if not math.isfinite(value):
                raise RuntimeError("embedding contains a non-finite value")
            values.append(value)
            norm_squared += value * value
        if norm_squared == 0.0:
            raise RuntimeError("cannot normalize a zero embedding")
        norm = math.sqrt(norm_squared)
        for index in range(EMBED_DIM):
            values[index] /= norm
        normalized.append(values)
    return normalized


def _read_existing_vectors(
    embeddings_root: Path,
    layer: str,
) -> tuple[dict[str, array], dict[str, str]]:
    try:
        ids = _read_json(embeddings_root / f"{layer}.ids.json")
        hashes = _read_json(embeddings_root / f"{layer}.hashes.json")
        content = (embeddings_root / f"{layer}.f32").read_bytes()
    except (FileNotFoundError, json.JSONDecodeError):
        return {}, {}
    if not isinstance(ids, list) or not all(isinstance(item, str) for item in ids):
        return {}, {}
    if not isinstance(hashes, dict) or not all(
        isinstance(key, str) and isinstance(value, str)
        for key, value in hashes.items()
    ):
        return {}, {}
    if len(content) != len(ids) * EMBED_DIM * 4:
        return {}, {}

    values = array("f")
    values.frombytes(content)
    if sys.byteorder != "little":
        values.byteswap()
    vectors = {
        lens_id: array(
            "f",
            values[row * EMBED_DIM : (row + 1) * EMBED_DIM],
        )
        for row, lens_id in enumerate(ids)
    }
    return vectors, hashes


def _layer_vectors(
    *,
    embeddings_root: Path,
    layer: str,
    inputs: list[tuple[str, str]],
    ollama_url: str,
    timeout: float,
    reembed_all: bool,
) -> tuple[list[str], list[array], dict[str, str]]:
    old_vectors: dict[str, array] = {}
    old_hashes: dict[str, str] = {}
    if not reembed_all:
        old_vectors, old_hashes = _read_existing_vectors(embeddings_root, layer)

    hashes = {
        lens_id: hashlib.sha256(text.encode("utf-8")).hexdigest()
        for lens_id, text in inputs
    }
    changed = [
        (lens_id, text)
        for lens_id, text in inputs
        if lens_id not in old_vectors or old_hashes.get(lens_id) != hashes[lens_id]
    ]
    new_vectors: dict[str, array] = {}
    for start in range(0, len(changed), BATCH_SIZE):
        batch = changed[start : start + BATCH_SIZE]
        embedded = _embed_batch(
            ollama_url,
            [text for _, text in batch],
            timeout=timeout,
        )
        new_vectors.update(
            (lens_id, vector)
            for (lens_id, _), vector in zip(batch, embedded, strict=True)
        )

    ids = [lens_id for lens_id, _ in inputs]
    vectors = [new_vectors.get(lens_id, old_vectors.get(lens_id)) for lens_id in ids]
    if any(vector is None for vector in vectors):
        raise RuntimeError(f"failed to produce every {layer} embedding")
    return ids, [vector for vector in vectors if vector is not None], hashes


def _matrix_bytes(vectors: list[array]) -> bytes:
    matrix = array("f")
    for vector in vectors:
        if len(vector) != EMBED_DIM:
            raise RuntimeError(f"expected embedding dimension {EMBED_DIM}")
        matrix.extend(vector)
    if sys.byteorder != "little":
        matrix.byteswap()
    return matrix.tobytes()


def _index_digest(data_root: Path) -> str:
    path = data_root / "generated/index.jsonl"
    try:
        content = path.read_bytes()
    except FileNotFoundError:
        content = b""
    return hashlib.sha256(content).hexdigest()


def update_embeddings(
    *,
    data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    reembed_all: bool = False,
    machine: str | None = None,
    generated_at: str | None = None,
    timeout: float = OLLAMA_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    root = Path(data_root)
    embeddings_root = root / "embeddings"
    prior_meta = _read_optional_json(embeddings_root / "meta.json")
    if prior_meta is not None and not isinstance(prior_meta, dict):
        raise ValueError("embeddings/meta.json must contain an object")

    live_digest = _model_digest(ollama_url, timeout=timeout)
    recorded_digest = prior_meta.get("model_digest") if prior_meta else None
    if recorded_digest and recorded_digest != live_digest and not reembed_all:
        raise ModelDigestMismatch(
            f"model digest changed: {recorded_digest} -> {live_digest}"
        )

    compatible_prior = bool(
        prior_meta
        and recorded_digest == live_digest
        and prior_meta.get("model") == EMBED_MODEL
        and prior_meta.get("dim") == EMBED_DIM
    )
    regenerate = reembed_all or not compatible_prior
    curated_inputs = _curated_inputs(root)
    generated_inputs = _generated_inputs(root)
    layer_results: dict[str, tuple[list[str], list[array], dict[str, str]]] = {}
    for layer, inputs in (
        ("curated", curated_inputs),
        ("generated", generated_inputs),
    ):
        layer_results[layer] = _layer_vectors(
            embeddings_root=embeddings_root,
            layer=layer,
            inputs=inputs,
            ollama_url=ollama_url,
            timeout=timeout,
            reembed_all=regenerate,
        )

    timestamp = generated_at or datetime.now(timezone.utc).isoformat()
    meta = {
        "model": EMBED_MODEL,
        "model_digest": live_digest,
        "dim": EMBED_DIM,
        "pooling": "ollama-default",
        "normalized": True,
        "hash_recipe": HASH_RECIPE,
        "thresholds": {
            "VARIANT_MIN_COSINE": VARIANT_MIN_COSINE,
            "EMBODIES_MIN_COSINE": EMBODIES_MIN_COSINE,
            "RESOLVE_MIN_COSINE": RESOLVE_MIN_COSINE,
        },
        "embedded_on": machine or socket.gethostname(),
        "curated": len(curated_inputs),
        "generated": len(generated_inputs),
        "generated_at": timestamp,
        "index_sha256": _index_digest(root),
    }

    for layer in ("curated", "generated"):
        ids, vectors, hashes = layer_results[layer]
        _atomic_write(embeddings_root / f"{layer}.f32", _matrix_bytes(vectors))
        _atomic_write(embeddings_root / f"{layer}.ids.json", _json_bytes(ids))
        _atomic_write(embeddings_root / f"{layer}.hashes.json", _json_bytes(hashes))
    _atomic_write(embeddings_root / "meta.json", _json_bytes(meta))
    return meta


def check_embeddings(
    *, data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT
) -> dict[str, Any]:
    root = Path(data_root)
    embeddings_root = root / "embeddings"
    meta = _read_json(embeddings_root / "meta.json")
    if not isinstance(meta, dict):
        raise EmbeddingCheckError("embeddings/meta.json must contain an object")
    if meta.get("index_sha256") != _index_digest(root):
        raise EmbeddingCheckError("generated index digest does not match embeddings")

    for layer in ("curated", "generated"):
        ids = _read_json(embeddings_root / f"{layer}.ids.json")
        hashes = _read_json(embeddings_root / f"{layer}.hashes.json")
        content = (embeddings_root / f"{layer}.f32").read_bytes()
        if not isinstance(ids, list) or not all(isinstance(item, str) for item in ids):
            raise EmbeddingCheckError(f"invalid {layer}.ids.json")
        expected_size = len(ids) * EMBED_DIM * 4
        if len(content) != expected_size:
            raise EmbeddingCheckError(
                f"{layer}.f32 has {len(content)} bytes; expected {expected_size}"
            )
        if not isinstance(hashes, dict) or set(hashes) != set(ids):
            raise EmbeddingCheckError(f"{layer}.hashes.json does not match ids")
        if meta.get(layer) != len(ids):
            raise EmbeddingCheckError(f"meta count does not match {layer}.ids.json")
    return meta


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest embed")
    parser.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    parser.add_argument("--ollama-url", default=DEFAULT_OLLAMA_URL)
    parser.add_argument("--reembed-all", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    try:
        meta = update_embeddings(
            data_root=args.data_root,
            ollama_url=args.ollama_url,
            reembed_all=args.reembed_all,
        )
        if args.check:
            check_embeddings(data_root=args.data_root)
        print(f"embedded curated={meta['curated']} generated={meta['generated']}")
        return 0
    except ModelDigestMismatch as error:
        print(error, file=sys.stderr)
        return 3
    except Exception as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
