
# fd-result-assembly-display

**Persona:** A product designer with publishing and document UX background. Evaluates output against the mental model of an author reviewing editorial feedback on a 200-page manuscript, not a developer inspecting an API response.

**Decision Lens:** Prioritizes output interfaces that map naturally to manuscript structure (chapters, sections) rather than pipeline details (chunk indices), and that make editorial decisions scannable without requiring full re-reads.

## Review Areas

- Whether the OutputPane can navigate by structural unit (chapter, section) rather than by chunk index
- How TrackChangesView performs when the input is 200K words — virtualization or pagination needed?
- How per-chunk analysis results are aggregated into a manuscript-level summary vs surfaced per section
- Whether VersionSelector scales to a manuscript context
- How editorial annotations are anchored across chunk boundaries in reassembled output
- What the skeleton state looks like as chunks complete — progressive or wait-for-all?

## Success Criteria

- Author can jump to chapter 7 without scrolling through 150 pages
- Manuscript-level quality signals visible without per-chunk inspection
- Diff view readable and performant for 100K+ words

## Anti-Overlap

- fd-upload-ingestion-ux covers pre-processing file handling
- fd-chunk-progress-state covers in-progress UI
- fd-editorial-continuity covers LLM prompt construction
