# Figmaaidefectdetectionsystem consolidation evidence

Source: https://github.com/a1112/Figmaaidefectdetectionsystem
Source commit: `9ffd07f48c5f5a1f0f0eee7490bbbb6326d9eb2b`
Consumer baseline: `212858caad3a857ff7d2ef97a5f4dc6fbee05a22`

The consumer API types include bright/dark image fields and field-aware defect mapping. Differences also include viewer and settings components, themes, sample responses and the lockfile. Keep the consumer frontend aligned with its maintained backend; archive the standalone versions for later review.

## Coverage

- Exact files already in the consumer: 99.
- Source versions preserved under originals/: 77.
- Excluded source files: 0.

The manifest accounts for every file in the pinned default-branch tree, including
original modes and Git blob IDs. Archived bytes retain the source Git blob exactly.
The .source.txt suffix prevents archived code, tests and manifests from being
picked up as active project files. Some icon originals are binary despite this
suffix; restore their original names and modes from the manifest before reuse.
Sample fixtures already present locally are preserved; no large datasets downloaded.

## Validation and limits

Complete file coverage, exact Git blob comparison and git diff --check were verified.
Only docs/repository-consolidation changes. Application code, active dependencies
and deployment scripts are unchanged. No application build, sensor, GPU, database
or UI test is claimed. This snapshot does not establish behavioral equivalence
or integrate every standalone feature into the maintained application.

## Retirement boundary

Keep the source until this PR is merged and coverage is verified on the maintained
branch. Preserve any needed full Git history, other branches, tags, releases and
hosted records separately. Existing standalone deployments and historical clones
may still rely on the source URL; this file-tree archive does not redirect them.
