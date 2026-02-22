# Metadata Schema (Bilingual)

Use this schema when reviewing or extending `manifest.json` created by `scripts/compress_images.py`.

## Required user inputs

- `image paths`: list of local image files (or `--paths-file`)
- `year`: numeric year for the photo set
- `city` and `country`: at least one language provided

## Recommended normalized inputs before running script

- `city_en`
- `country_en`
- `city_zh`
- `country_zh`

If the user supplies only one language, translate and confirm uncommon names before running.

## Manifest shape (JSON)

```json
{
  "tool": "compress-images-bilingual",
  "settings": {
    "year": 2024,
    "output_dir": "output/photos-2024-paris",
    "format": "webp",
    "quality": 82,
    "max_width": 2200
  },
  "location": {
    "en": {
      "city": "Paris",
      "country": "France",
      "label": "Paris, France"
    },
    "zh": {
      "city": "巴黎",
      "country": "法国",
      "label": "法国巴黎"
    }
  },
  "images": [
    {
      "index": 1,
      "source_path": "/abs/path/to/input.jpg",
      "output_path": "/abs/path/to/output.webp",
      "source_bytes": 1234567,
      "output_bytes": 345678,
      "compression_ratio": 0.28,
      "year": 2024,
      "captions": {
        "en": "Photo taken in Paris, France (2024).",
        "zh": "摄于法国巴黎（2024年）。"
      }
    }
  ]
}
```

## Caption handling

- The script generates default bilingual caption placeholders.
- If the user wants descriptive captions, replace the placeholders after image review while keeping the same schema.
