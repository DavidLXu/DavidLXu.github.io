---
name: compress-images-bilingual
description: Batch-compress image files for websites or posts and generate bilingual (Chinese/English) metadata manifests from a user-provided image path list plus year, city, and country. Use when preparing photo assets for publishing, converting image formats (for example to WebP/JPEG), resizing large images, or standardizing location/year metadata for multilingual pages.
---

# Compress Images Bilingual

Compress a list of local image paths, optionally convert formats, and emit a bilingual metadata manifest that includes year and location in Chinese and English.

Use this skill when the user provides:
- a list of image paths
- a year
- a city and country (in English, Chinese, or both)

## Quick Workflow

1. Collect required inputs:
- image path list (or a text file containing paths)
- `year`
- `city` and `country`

2. Normalize bilingual location fields:
- If the user gives English only, translate city/country into Chinese.
- If the user gives Chinese only, translate city/country into English.
- Prefer explicit confirmation for uncommon place names.
- Pass both language variants to the script (`--city-en`, `--country-en`, `--city-zh`, `--country-zh`).

3. Run the compressor script:
- Use `scripts/compress_images.py` for deterministic compression and manifest generation.
- Prefer `--format webp` for web delivery when the site supports it.
- Keep originals unchanged; write outputs to a separate directory.

4. Verify results:
- Confirm output images exist.
- Check size reduction and visual quality on a sample.
- Review `manifest.json` for bilingual fields and location formatting.

## Commands

English + Chinese explicitly provided:

```bash
python3 scripts/compress_images.py \
  --images images/a.jpg images/b.png \
  --year 2024 \
  --city-en "Paris" \
  --country-en "France" \
  --city-zh "巴黎" \
  --country-zh "法国" \
  --output-dir output/photos-2024-paris \
  --format webp \
  --quality 82 \
  --max-width 2200
```

Single-language input (Codex fills missing language before running):

```bash
python3 scripts/compress_images.py \
  --paths-file /tmp/image_paths.txt \
  --year 2023 \
  --city "Beijing" \
  --country "China" \
  --city-zh "北京" \
  --country-zh "中国" \
  --output-dir output/photos-2023-beijing \
  --format keep
```

## Output Contract

The script writes:
- compressed images in `--output-dir`
- a JSON manifest (default: `--output-dir/manifest.json`) with:
  - source/output paths
  - byte sizes and compression ratio
  - year
  - bilingual city/country labels
  - bilingual caption placeholders

See `references/metadata-schema.md` for the manifest shape.

## Notes

- `Pillow` is preferred; the script falls back to macOS `sips` when `Pillow` is unavailable.
- For ambiguous translations of place names, ask the user to confirm the official English/Chinese spelling.
- Keep manifest field names in English for stable machine parsing; put translated text in values.
