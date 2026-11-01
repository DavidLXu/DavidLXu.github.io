# RoboScope reading atlas

RoboScope separates four independent research facets from suggested related reading.
The interface supports intersecting labels, bilingual search, paper details, evidence,
related neighborhoods, stable 2D/3D maps and a keyboard-accessible paper list below the map.
The default view is 3D; there is no separate list-only view. The 3D map slowly rotates
by default, pauses while the pointer is over it or during interaction, and offers an
auto-rotate toggle. Reduced-motion preferences disable automatic rotation initially. Query parameters
retain filters, selection, neighborhood, view, color dimension and sorting on reload.
Dates are note dates, not publication dates.

## Build and update

```sh
ruby scripts/build_roboscope.rb
ruby tests/roboscope_test.rb
bundle exec jekyll build
```

The indexer only uses Ruby's standard library. Normal local Jekyll builds invoke it
through `_plugins/roboscope_generator.rb`. **GitHub Pages safe-mode builds do not run
custom plugins:** run the indexer and commit `assets/data/roboscope-index.json` with
new or changed paper notes before pushing. `ruby scripts/build_roboscope.rb --check`
checks freshness without modifying files. No external API or browser inference is used.

When preparing a commit, stage the intended paper notes (and any intended taxonomy
or override changes), then run:

```sh
ruby scripts/build_roboscope.rb --staged
ruby scripts/build_roboscope.rb --staged --check
git add assets/data/roboscope-index.json
```

`--staged` reads paper notes, taxonomy and overrides from Git's staging area, so
unrelated untracked drafts and unstaged edits cannot enter the published index.
Commit the generated index together with the intended notes. Run the staged build
after any full local Jekyll build: local builds include working-tree notes for preview.
Never remove unrelated drafts just to generate a release index.

## Classification

`_data/roboscope_taxonomy.json` defines stable label IDs, bilingual names, colors and
phrase aliases. Each dimension permits zero or multiple labels. Existing tags are
checked first, then titles, then the summary. Matching uses phrase boundaries rather
than arbitrary substrings. Generic manipulation is omitted when a specific task is
identified. `contact` alone does not imply tactile sensing; a human hand alone does
not imply a robot hand. Empty dimensions are shown as unspecified, not guessed.

These are explainable **rule-based suggestions**, not a validated semantic classifier.
Summary matches may describe baselines or limitations. The detail panel shows the
source and matched phrase. Review representative notes and correct these cases using
`_data/roboscope_overrides.yml`. A correction replaces only the specified dimension;
an empty list removes false positives. Overrides also support a reviewed summary.
Validate IDs against the taxonomy. Notes and their existing tags are never rewritten.

## Similarity and stable positions

The indexer removes HTML/style/script content, code blocks, math and links, then
combines weighted title, tags, summary and an English body excerpt. Recommendations
combine cosine similarity of cleaned TF-IDF vectors (80%) and facet Jaccard overlap
(20%). Up to six neighbors with score >= 0.14 are retained; these scores are not
confidence probabilities. Related lists are independent of active filters. The
neighborhood view intersects that local set with the current search and labels.

On first creation, a deterministic neighbor graph generates coordinates. Later runs
reuse coordinates by permalink-derived ID and place new papers near existing
neighbors. Filtering never reruns layout. Changing the color dimension uses fixed
taxonomy colors; for multiply tagged papers, the first taxonomy label supplies the
single node color and all labels remain visible in details. Moving or renaming a
permalink creates a new ID. Deleting notes removes them and their recommendations.

The map is an approximate reading aid, not a metric embedding. Persisting positions
also means they can become less representative as notes are substantially revised.
A deliberate future re-layout should be reviewed as a separate change; do not delete
the committed index during routine updates. To move to learned embeddings later,
replace vector generation and validate retrieval quality on reviewed paper pairs;
keep facet IDs, overrides and the existing interface contract.
