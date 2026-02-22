#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

try:
    from PIL import Image, ImageOps  # type: ignore
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False


SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".tif",
    ".tiff",
    ".bmp",
    ".heic",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compress images and emit a bilingual metadata manifest."
    )
    parser.add_argument("--images", nargs="*", default=[], help="Image paths")
    parser.add_argument(
        "--paths-file",
        action="append",
        default=[],
        help="Text file with one image path per line",
    )
    parser.add_argument("--year", type=int, required=True, help="Photo year")
    parser.add_argument("--city", help="City in any language (fallback)")
    parser.add_argument("--country", help="Country in any language (fallback)")
    parser.add_argument("--city-en", help="City in English")
    parser.add_argument("--country-en", help="Country in English")
    parser.add_argument("--city-zh", help="City in Chinese")
    parser.add_argument("--country-zh", help="Country in Chinese")
    parser.add_argument(
        "--output-dir",
        default="compressed-output",
        help="Directory for compressed images and manifest",
    )
    parser.add_argument(
        "--manifest",
        help="Manifest output path (default: <output-dir>/manifest.json)",
    )
    parser.add_argument(
        "--format",
        default="keep",
        choices=["keep", "webp", "jpeg", "jpg", "png"],
        help="Target format",
    )
    parser.add_argument("--quality", type=int, default=82, help="Quality (1-100)")
    parser.add_argument(
        "--max-width",
        type=int,
        default=2200,
        help="Resize larger images to this width (pixels)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Overwrite outputs")
    parser.add_argument("--dry-run", action="store_true", help="Plan without writing files")
    return parser.parse_args()


def read_paths_file(path: Path) -> list[str]:
    result: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        result.append(line)
    return result


def collect_input_paths(args: argparse.Namespace) -> list[Path]:
    raw_paths = list(args.images)
    for file_str in args.paths_file:
        file_path = Path(file_str).expanduser()
        if not file_path.exists():
            raise FileNotFoundError(f"paths file not found: {file_path}")
        raw_paths.extend(read_paths_file(file_path))

    if not raw_paths:
        raise ValueError("No images provided. Use --images and/or --paths-file.")

    resolved: list[Path] = []
    seen: set[str] = set()
    for p in raw_paths:
        path = Path(p).expanduser().resolve()
        key = str(path)
        if key in seen:
            continue
        seen.add(key)
        if not path.exists():
            raise FileNotFoundError(f"image not found: {path}")
        if not path.is_file():
            raise ValueError(f"not a file: {path}")
        resolved.append(path)
    return resolved


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    chars = []
    prev_dash = False
    for ch in ascii_text.lower():
        if ch.isalnum():
            chars.append(ch)
            prev_dash = False
        else:
            if not prev_dash:
                chars.append("-")
                prev_dash = True
    slug = "".join(chars).strip("-")
    return slug or "image"


def resolve_bilingual_location(args: argparse.Namespace) -> tuple[dict, list[str]]:
    warnings: list[str] = []

    city_fallback = args.city or ""
    country_fallback = args.country or ""

    city_en = args.city_en or city_fallback
    country_en = args.country_en or country_fallback
    city_zh = args.city_zh or city_fallback
    country_zh = args.country_zh or country_fallback

    if not (city_en or city_zh):
        raise ValueError("Provide city via --city or language-specific fields.")
    if not (country_en or country_zh):
        raise ValueError("Provide country via --country or language-specific fields.")

    if not args.city_en or not args.country_en:
        warnings.append(
            "English city/country not fully provided; manifest uses fallback values."
        )
    if not args.city_zh or not args.country_zh:
        warnings.append(
            "Chinese city/country not fully provided; manifest uses fallback values."
        )

    location = {
        "en": {
            "city": city_en,
            "country": country_en,
            "label": f"{city_en}, {country_en}".strip(", "),
        },
        "zh": {
            "city": city_zh,
            "country": country_zh,
            "label": f"{country_zh}{city_zh}",
        },
    }
    return location, warnings


def normalize_format(requested: str, src_suffix: str) -> str:
    fmt = requested.lower()
    if fmt == "keep":
        suffix = src_suffix.lower()
        if suffix in (".jpg", ".jpeg"):
            return "jpeg"
        if suffix == ".png":
            return "png"
        if suffix == ".webp":
            return "webp"
        return "jpeg"
    if fmt == "jpg":
        return "jpeg"
    return fmt


def extension_for_format(fmt: str, src_suffix: str) -> str:
    if fmt == "keep":
        return src_suffix.lower() if src_suffix else ".jpg"
    if fmt == "jpeg":
        return ".jpg"
    return f".{fmt}"


def output_path_for(
    output_dir: Path, index: int, source: Path, target_ext: str, overwrite: bool
) -> Path:
    stem = slugify(source.stem)
    candidate = output_dir / f"{index:03d}-{stem}{target_ext}"
    if overwrite or not candidate.exists():
        return candidate

    counter = 1
    while True:
        alt = output_dir / f"{index:03d}-{stem}-{counter}{target_ext}"
        if not alt.exists():
            return alt
        counter += 1


def compress_with_pillow(
    src: Path,
    dest: Path,
    target_fmt: str,
    quality: int,
    max_width: int,
) -> None:
    with Image.open(src) as img:
        img = ImageOps.exif_transpose(img)

        if max_width and img.width > max_width:
            new_height = int(img.height * (max_width / img.width))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        save_kwargs: dict = {}
        fmt_for_save = target_fmt.upper()
        if target_fmt == "jpeg":
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            save_kwargs.update(
                {
                    "quality": quality,
                    "optimize": True,
                    "progressive": True,
                }
            )
        elif target_fmt == "png":
            save_kwargs.update({"optimize": True, "compress_level": 9})
            fmt_for_save = "PNG"
        elif target_fmt == "webp":
            if img.mode == "P":
                img = img.convert("RGBA")
            save_kwargs.update({"quality": quality, "method": 6})
            fmt_for_save = "WEBP"

        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, format=fmt_for_save, **save_kwargs)


def compress_with_sips(
    src: Path,
    dest: Path,
    target_fmt: str,
    quality: int,
    max_width: int,
) -> None:
    if target_fmt not in {"jpeg", "png"}:
        raise RuntimeError("sips fallback supports jpeg/png only")

    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["sips", str(src)]
    if max_width:
        cmd.extend(["-Z", str(max_width)])
    cmd.extend(["-s", "format", target_fmt])
    if target_fmt == "jpeg":
        cmd.extend(["-s", "formatOptions", str(quality)])
    cmd.extend(["--out", str(dest)])
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def compress_or_copy(
    src: Path,
    dest: Path,
    target_fmt: str,
    quality: int,
    max_width: int,
) -> str:
    if PIL_AVAILABLE:
        compress_with_pillow(src, dest, target_fmt, quality, max_width)
        return "pillow"

    if shutil.which("sips"):
        compress_with_sips(src, dest, target_fmt, quality, max_width)
        return "sips"

    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return "copy"


def build_default_caption(year: int, location: dict) -> dict[str, str]:
    en_label = location["en"]["label"]
    zh_label = location["zh"]["label"]
    return {
        "en": f"Photo taken in {en_label} ({year}).",
        "zh": f"摄于{zh_label}（{year}年）。",
    }


def main() -> int:
    args = parse_args()
    args.quality = max(1, min(100, args.quality))

    output_dir = Path(args.output_dir).expanduser().resolve()
    manifest_path = (
        Path(args.manifest).expanduser().resolve()
        if args.manifest
        else output_dir / "manifest.json"
    )

    try:
        images = collect_input_paths(args)
        location, warnings = resolve_bilingual_location(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    manifest_images = []
    total_in = 0
    total_out = 0
    backend_used = None

    for index, src in enumerate(images, start=1):
        requested = args.format
        actual_fmt = normalize_format(requested, src.suffix)
        target_ext = extension_for_format(requested, src.suffix)
        dest = output_path_for(output_dir, index, src, target_ext, args.overwrite)

        if args.dry_run:
            source_size = src.stat().st_size
            total_in += source_size
            manifest_images.append(
                {
                    "index": index,
                    "source_path": str(src),
                    "output_path": str(dest),
                    "source_bytes": source_size,
                    "output_bytes": None,
                    "compression_ratio": None,
                    "year": args.year,
                    "captions": build_default_caption(args.year, location),
                }
            )
            continue

        source_size = src.stat().st_size
        backend_used = compress_or_copy(src, dest, actual_fmt, args.quality, args.max_width)
        output_size = dest.stat().st_size

        total_in += source_size
        total_out += output_size
        ratio = round(output_size / source_size, 4) if source_size else None

        manifest_images.append(
            {
                "index": index,
                "source_path": str(src),
                "output_path": str(dest),
                "source_bytes": source_size,
                "output_bytes": output_size,
                "compression_ratio": ratio,
                "year": args.year,
                "captions": build_default_caption(args.year, location),
            }
        )

    manifest = {
        "tool": "compress-images-bilingual",
        "backend": backend_used or ("dry-run" if args.dry_run else "unknown"),
        "warnings": warnings,
        "settings": {
            "year": args.year,
            "output_dir": str(output_dir),
            "format": args.format,
            "quality": args.quality,
            "max_width": args.max_width,
        },
        "location": location,
        "images": manifest_images,
        "summary": {
            "count": len(images),
            "total_source_bytes": total_in,
            "total_output_bytes": (None if args.dry_run else total_out),
            "overall_ratio": (
                None if args.dry_run or total_in == 0 else round(total_out / total_in, 4)
            ),
        },
    }

    if not args.dry_run:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Processed {len(images)} image(s)")
    print(f"Output directory: {output_dir}")
    print(f"Manifest: {manifest_path}")
    if warnings:
        for warning in warnings:
            print(f"WARNING: {warning}")
    if not args.dry_run and total_in:
        print(
            f"Size: {total_in} -> {total_out} bytes "
            f"(ratio {total_out / total_in:.2%})"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
