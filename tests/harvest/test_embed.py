from __future__ import annotations

import hashlib
import json
import struct
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from harvest.embed import EmbeddingCheckError, check_embeddings, main, update_embeddings
from harvest.thresholds import EMBED_DIM, EMBED_MODEL, HASH_RECIPE, embedding_text


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def _write_index(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def _generated_record(data_root: Path, lens_id: str, name: str, body: str) -> dict:
    relative = Path("generated/lenses") / f"{lens_id}.md"
    path = data_root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    return {
        "id": lens_id,
        "name": name,
        "body_path": relative.as_posix(),
        "spec_path": None,
    }


class _FakeOllama(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, digest: str) -> None:
        self.digest = digest
        self.embed_requests: list[dict] = []
        super().__init__(("127.0.0.1", 0), _FakeOllamaHandler)


class _FakeOllamaHandler(BaseHTTPRequestHandler):
    server: _FakeOllama

    def log_message(self, format: str, *args: object) -> None:
        return

    def _reply(self, payload: object, status: int = 200) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:
        if self.path != "/api/tags":
            self._reply({"error": "not found"}, 404)
            return
        self._reply(
            {
                "models": [
                    {"name": f"{EMBED_MODEL}:latest", "digest": self.server.digest}
                ]
            }
        )

    def do_POST(self) -> None:
        if self.path != "/api/embed":
            self._reply({"error": "not found"}, 404)
            return
        length = int(self.headers.get("content-length", "0"))
        payload = json.loads(self.rfile.read(length))
        self.server.embed_requests.append(payload)
        vector = [0.0] * EMBED_DIM
        vector[0] = 3.0
        vector[1] = 4.0
        self._reply({"embeddings": [vector[:] for _ in payload["input"]]})


@contextmanager
def _fake_ollama(digest: str):
    server = _FakeOllama(digest)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        host, port = server.server_address
        yield server, f"http://{host}:{port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def _fixture_data(data_root: Path) -> tuple[list[dict], dict[str, str]]:
    curated = [
        {
            "id": "curated-z",
            "name": "Zeta",
            "definition": "Last definition",
            "examples": ["last example"],
        },
        {
            "id": "curated-a",
            "name": "Alpha",
            "definition": "First definition",
            "examples": ["first example", "second example"],
        },
    ]
    _write_json(data_root / "curated/lenses.json", curated)

    bodies = {
        "gen:fd-zeta@22222222": (
            "Apply the perspective of the second lens.\n\n"
            "Details.\n\n### 1. Compare outcomes\n"
        ),
        "gen:fd-alpha@11111111": (
            "Apply the perspective of the first lens.\n\n"
            "Details.\n\n### 1. Trace evidence\n"
        ),
    }
    records = [
        _generated_record(data_root, "gen:fd-zeta@22222222", "fd-zeta", bodies["gen:fd-zeta@22222222"]),
        _generated_record(data_root, "gen:fd-alpha@11111111", "fd-alpha", bodies["gen:fd-alpha@11111111"]),
    ]
    _write_index(data_root / "generated/index.jsonl", records)
    return records, bodies


def _output_snapshot(data_root: Path) -> dict[str, bytes]:
    root = data_root / "embeddings"
    return {path.name: path.read_bytes() for path in sorted(root.iterdir())}


def test_embed_writes_normalized_sorted_matrices_and_updates_incrementally(
    tmp_path: Path,
) -> None:
    data_root = tmp_path / "data"
    records, bodies = _fixture_data(data_root)

    with _fake_ollama("digest-one") as (server, url):
        meta = update_embeddings(
            data_root=data_root,
            ollama_url=url,
            machine="clavain",
            generated_at="2026-09-06T12:00:00+00:00",
        )
        assert sum(len(request["input"]) for request in server.embed_requests) == 4
        assert all(request["model"] == EMBED_MODEL for request in server.embed_requests)
        assert [len(request["input"]) for request in server.embed_requests] == [2, 2]

        root = data_root / "embeddings"
        assert json.loads((root / "curated.ids.json").read_text()) == [
            "curated-a",
            "curated-z",
        ]
        assert json.loads((root / "generated.ids.json").read_text()) == [
            "gen:fd-alpha@11111111",
            "gen:fd-zeta@22222222",
        ]
        assert (root / "curated.f32").stat().st_size == 2 * EMBED_DIM * 4
        assert (root / "generated.f32").stat().st_size == 2 * EMBED_DIM * 4
        assert struct.unpack("<ff", (root / "curated.f32").read_bytes()[:8]) == (
            0.6000000238418579,
            0.800000011920929,
        )
        assert meta == {
            "model": EMBED_MODEL,
            "model_digest": "digest-one",
            "dim": EMBED_DIM,
            "pooling": "ollama-default",
            "normalized": True,
            "hash_recipe": HASH_RECIPE,
            "thresholds": {
                "VARIANT_MIN_COSINE": 0.92,
                "EMBODIES_MIN_COSINE": 0.60,
                "RESOLVE_MIN_COSINE": 0.86,
            },
            "embedded_on": "clavain",
            "curated": 2,
            "generated": 2,
            "generated_at": "2026-09-06T12:00:00+00:00",
            "index_sha256": hashlib.sha256(
                (data_root / "generated/index.jsonl").read_bytes()
            ).hexdigest(),
        }

        server.embed_requests.clear()
        new_body = (
            "Apply the perspective of a new lens.\n\n"
            "Details.\n\n### 1. Find novelty\n"
        )
        records.append(
            _generated_record(
                data_root,
                "gen:fd-new@33333333",
                "fd-new",
                new_body,
            )
        )
        _write_index(data_root / "generated/index.jsonl", records)
        update_embeddings(data_root=data_root, ollama_url=url, machine="clavain")
        assert [request["input"] for request in server.embed_requests] == [
            [embedding_text(None, new_body)]
        ]

        server.embed_requests.clear()
        alpha = next(record for record in records if record["name"] == "fd-alpha")
        spec = {
            "persona": "Evidence tracker",
            "focus": "claim provenance",
            "decision_lens": "verify",
            "review_areas": ["sources", "counterexamples"],
        }
        alpha["spec_path"] = "generated/specs/gen:fd-alpha@11111111.json"
        _write_json(data_root / alpha["spec_path"], spec)
        _write_index(data_root / "generated/index.jsonl", records)
        update_embeddings(data_root=data_root, ollama_url=url, machine="clavain")
        assert [request["input"] for request in server.embed_requests] == [
            [embedding_text(spec, bodies["gen:fd-alpha@11111111"])]
        ]

        generated_hashes = json.loads(
            (root / "generated.hashes.json").read_text(encoding="utf-8")
        )
        assert generated_hashes[alpha["id"]] == hashlib.sha256(
            embedding_text(spec, bodies[alpha["id"]]).encode("utf-8")
        ).hexdigest()


def test_embed_batches_requests_in_groups_of_32(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    curated = [
        {"id": f"curated-{index:02d}", "name": f"Lens {index}", "definition": "D"}
        for index in range(33)
    ]
    _write_json(data_root / "curated/lenses.json", curated)
    _write_index(data_root / "generated/index.jsonl", [])

    with _fake_ollama("digest-one") as (server, url):
        update_embeddings(data_root=data_root, ollama_url=url)

    assert [len(request["input"]) for request in server.embed_requests] == [32, 1]


def test_digest_mismatch_exits_three_and_writes_nothing(
    tmp_path: Path,
    capsys,
) -> None:
    data_root = tmp_path / "data"
    _fixture_data(data_root)
    with _fake_ollama("recorded-digest") as (_, url):
        assert main(["--data-root", str(data_root), "--ollama-url", url]) == 0
    before = _output_snapshot(data_root)

    with _fake_ollama("live-digest") as (server, url):
        assert main(["--data-root", str(data_root), "--ollama-url", url]) == 3
        assert server.embed_requests == []

    assert _output_snapshot(data_root) == before
    assert "model digest changed: recorded-digest -> live-digest" in capsys.readouterr().err


def test_reembed_all_overrides_digest_gate_and_check_detects_stale_index(
    tmp_path: Path,
) -> None:
    data_root = tmp_path / "data"
    records, _ = _fixture_data(data_root)
    with _fake_ollama("recorded-digest") as (_, url):
        assert main(
            ["--data-root", str(data_root), "--ollama-url", url, "--check"]
        ) == 0

    with _fake_ollama("new-digest") as (server, url):
        assert main(
            [
                "--data-root",
                str(data_root),
                "--ollama-url",
                url,
                "--reembed-all",
                "--check",
            ]
        ) == 0
        assert sum(len(request["input"]) for request in server.embed_requests) == 4

    check_embeddings(data_root=data_root)
    records.append(
        _generated_record(data_root, "gen:fd-late@44444444", "fd-late", "late")
    )
    _write_index(data_root / "generated/index.jsonl", records)
    with pytest.raises(EmbeddingCheckError, match="index digest"):
        check_embeddings(data_root=data_root)
