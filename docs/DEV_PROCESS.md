# Dev Process (gstack-inspired)

OfficeWiki development follows **thin harness, fat skills**.

We do not require Claude Code to apply the methodology.
Instead, we use an OpenClaw-native workflow inspired by gstack:

## Default flow (every feature)
1) **Office hours (forcing questions)**
   - What is the user trying to do?
   - What is the smallest successful outcome (3 minutes)?
   - What data/files will it touch? (raw/wiki/ontology/workflows)
   - What are failure modes? (security, privacy, cost, correctness)
   - What is deterministic vs latent?
   - What is the acceptance test?

2) **Plan**
   - Write a short plan before coding.
   - Prefer small commits and visible artifacts (docs + samples).

3) **Implement**
   - Keep the harness thin (CLI + minimal glue).
   - Push intelligence into versioned markdown skills/specs.

4) **Review**
   - Run the frontmatter/format checks where relevant.
   - Verify outputs with file paths and example runs.

5) **Ship**
   - Push commits.
   - Record evidence (commit hash, logs, paths).

## Evidence rule
Any completion claim must include at least one of:
- file paths
- tool output
- commit hashes

## Notes
- Browser automation (/qa, /browse) is optional and may not run in all environments.
- BYOK is default for LLM usage.
