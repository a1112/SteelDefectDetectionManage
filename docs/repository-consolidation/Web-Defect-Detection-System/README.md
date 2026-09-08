# Web-Defect-Detection-System consolidation evidence

Source: https://github.com/a1112/Web-Defect-Detection-System
Source commit: `5958c4df6b22ec8d34f5ca68d87f7e82023befc4`
Consumer baseline: `07b05bc88e5b7fdb77477ef7adeb4c07dc095898`

The consumer backend adds field-aware defect filtering and coordinates, orientation-aware prefetch and expanded cache/image processing. Preserve the consumer implementation. Fourteen differing Python files are stored as historical source. The template changes only five image/cache settings; a line delta reconstructs its exact source bytes against the pinned consumer blob without copying the unchanged nonempty password field. This is source preservation, not a runtime compatibility certification.

## Coverage and validation

{"already_in_consumer": 416, "archived_line_delta": 1, "archived_original": 14}

Every source file is accounted for in manifest.json. Exact Git blobs and modes
are verified against the staged consumer tree or reconstructed archive bytes.
Historical files use inert extensions and are not installed or executed.
No application code, active dependency files, deployment scripts or datasets change.
No application build, live database or hardware test is claimed by this archive-only PR.

For archived_line_delta, load the pinned consumer_git_blob, split UTF-8 text into
lines retaining endings, and apply each start/end replacement in reverse order.
The reconstructed Git blob must equal source_git_blob. Preserve this base blob
in consumer history when rewriting history or moving the archive.

## Retirement boundary

Keep the source repository until this PR is merged and source coverage is verified
on the maintained branch. This is a file-tree snapshot, not a full backup of Git
history, other branches, tags, releases or hosted records. Runtime equivalence of
the differing versions has not been established; retained originals allow review.
