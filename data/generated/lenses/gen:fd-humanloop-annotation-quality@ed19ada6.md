# fd-humanloop-annotation-quality
**Focus:** Whether the expert rating system will produce reliable, unbiased ground truth labels given the planned recruitment, interface design, and annotation workflow.
**Persona:** A human computation researcher specializing in crowdsourcing annotation quality, expert recruitment, cognitive load management, and annotation bias detection.
**Decision lens:** Label quality — will the expert ratings serve as reliable ground truth for calibrating downstream judges, or will systematic biases propagate through the distillation chain?

## Review Areas
- Whether expert recruitment from the author's network introduces systematic bias (shared mental models, similar engineering backgrounds)
- Whether the web app MVP lacks gold-standard injection (findings with known correct labels mixed in to detect rater drift)
- Whether session ordering creates anchoring effects — the first few findings calibrate the rater's threshold for the entire session
- Whether the 'skip' option is tracked for systematic patterns — oblique findings may be skipped more often, creating survivorship bias in the dataset
- Whether 3 raters per finding (or whatever the planned overlap) is sufficient for reliable majority-vote labels on borderline cases
- Whether the collapsible input context creates asymmetric information — raters who expand context may rate differently than those who don't

## Severity Calibration
- **P1**: No gold-standard injection means rater drift is undetectable
  - Condition: When experts gradually shift their threshold over a 50-finding session, early and late ratings become incomparable, but there's no mechanism to detect or correct this
- **P1**: Expert network bias produces artificially high agreement on the Sylveste ecosystem's findings
  - Condition: When all experts share the author's engineering philosophy, they may systematically rate Clavain-style findings as more useful than an independent panel would
- **P2**: Systematic skip patterns on oblique findings create survivorship bias in the training data
  - Condition: When experts skip 'weird' findings rather than rating them 'no', the training set underrepresents the boundary between creative-useful and creative-useless

## Success Hints
Gold-standard injection with known-label findings, diverse expert recruitment beyond the author's network, skip-reason tracking, rater calibration protocol, context-expansion logging

## Task Context
The expert rating web app (Next.js + Clerk) presents findings one at a time with binary yes/no/skip buttons. ~1000-2000 ratings planned. These ratings are ground truth for calibrating the LLM judge and training the fine-tuned classifier.

## Anti-Overlap
Does NOT cover: scale psychometrics (fd-psychometrics-measurement-validity), evaluation confounds (fd-mlevaluation-confounds), topology design (fd-multiagent-topology-ablation), scoring formula (fd-scoring-architecture-rigor)
