# Image Generation Tools

Local Python tooling for generating game art from prompt files.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/image-generation/requirements.txt
```

Provide an API key either as `OPENAI_API_KEY` or in an uncommitted repo-root `openai_key.txt`.

## Beanstalk Conductor

Dry run:

```bash
.venv/bin/python tools/image-generation/generate_beanstalk_images.py --dry-run
```

Generate one missing image:

```bash
.venv/bin/python tools/image-generation/generate_beanstalk_images.py --limit 1
```

Generated images are written under `src/games/beanstalk-conductor/assets/generated/`. Existing outputs are skipped unless
`--force` is passed.
