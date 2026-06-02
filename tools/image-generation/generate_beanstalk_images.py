#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
from io import BytesIO
from pathlib import Path
import sys
from typing import Any


DEFAULT_MODEL = "gpt-image-1"
DEFAULT_QUALITY = "medium"
DEFAULT_FORMAT = "png"
DEFAULT_MANIFEST = Path("tools/image-generation/beanstalk_assets.json")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_api_key(root: Path) -> str:
    env_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if env_key:
        return env_key

    key_path = root / "openai_key.txt"
    if not key_path.exists():
        raise SystemExit(
            "Missing API key. Set OPENAI_API_KEY or create an uncommitted repo-root openai_key.txt."
        )
    key = key_path.read_text(encoding="utf-8").strip()
    if not key:
        raise SystemExit(f"API key file is empty: {key_path}")
    return key


def parse_size(size: str) -> tuple[int, int]:
    try:
        width_text, height_text = size.lower().split("x", 1)
        width = int(width_text)
        height = int(height_text)
    except ValueError as error:
        raise SystemExit(f"Invalid size {size!r}; expected WIDTHxHEIGHT.") from error
    if width <= 0 or height <= 0:
        raise SystemExit(f"Invalid size {size!r}; dimensions must be positive.")
    return width, height


def load_manifest(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit(f"Manifest must be a list: {path}")
    return data


def build_prompt(prompt_path: Path, api_size: str, output_size: str) -> str:
    text = prompt_path.read_text(encoding="utf-8").strip()
    return (
        text
        + "\n\n## Output Requirement\n"
        + f"- Generate exactly one image at API request size {api_size}.\n"
        + f"- The local script will save the final asset at {output_size}.\n"
        + "- Do not include text, labels, borders, watermarks, or a UI frame.\n"
        + "- Keep the silhouette readable after downscaling for the browser game.\n"
    )


def response_image_bytes(response: Any, label: str) -> bytes:
    if not response.data:
        raise SystemExit(f"No image payload returned for {label}")

    payload = response.data[0]
    if getattr(payload, "b64_json", None):
        return base64.b64decode(payload.b64_json)
    if getattr(payload, "url", None):
        import httpx

        return httpx.get(payload.url, timeout=60.0).content
    raise SystemExit(f"Unrecognized image payload returned for {label}")


def resize_if_needed(image_bytes: bytes, output_size: str) -> bytes:
    from PIL import Image

    width, height = parse_size(output_size)
    with Image.open(BytesIO(image_bytes)) as image:
        image = image.convert("RGBA")
        if image.size != (width, height):
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format="PNG", optimize=True)
        return output.getvalue()


def generate_one(client: Any, root: Path, entry: dict[str, Any], force: bool, dry_run: bool) -> bool:
    asset_id = str(entry["id"])
    prompt_path = root / str(entry["prompt"])
    output_path = root / str(entry["output"])
    api_size = str(entry["api_size"])
    output_size = str(entry["output_size"])

    if output_path.exists() and not force:
        print(f"skip: {asset_id} already exists at {output_path}")
        return False

    prompt = build_prompt(prompt_path, api_size, output_size)
    if dry_run:
        print(f"dry-run: {asset_id}: {prompt_path} -> {output_path} api={api_size} output={output_size}")
        return False

    response = client.images.generate(
        model=DEFAULT_MODEL,
        prompt=prompt,
        size=api_size,
        quality=DEFAULT_QUALITY,
        output_format=DEFAULT_FORMAT,
    )
    image_bytes = resize_if_needed(response_image_bytes(response, asset_id), output_size)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    print(f"wrote: {output_path}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Beanstalk Conductor images from prompt files.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="JSON manifest of prompt/output assets.")
    parser.add_argument("--asset", help="Generate only one manifest entry by id.")
    parser.add_argument("--limit", type=int, default=1, help="Maximum number of new images to generate.")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the output already exists.")
    parser.add_argument("--dry-run", action="store_true", help="List work without calling the image API.")
    args = parser.parse_args()

    root = repo_root()
    manifest = load_manifest(root / args.manifest)
    if args.asset:
        manifest = [entry for entry in manifest if entry.get("id") == args.asset]
        if not manifest:
            raise SystemExit(f"No manifest entry found for asset id {args.asset!r}")

    if args.dry_run:
        client = None
    else:
        from openai import OpenAI

        client = OpenAI(api_key=load_api_key(root))
    generated = 0
    for entry in manifest:
        if generate_one(client, root, entry, args.force, args.dry_run):  # type: ignore[arg-type]
            generated += 1
        if generated >= args.limit:
            break

    if generated == 0 and not args.dry_run:
        print("no new images generated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
