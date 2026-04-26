# CLI (v0)

## init
```bash
officewiki init ./my-workspace
```

## ingest (reference only)
```bash
officewiki ingest ./my-workspace /path/to/somewhere
```

## index
Put files under `./my-workspace/raw/` and run:
```bash
officewiki index ./my-workspace
```

v0 parses `.md`, `.txt`, `.pdf`(text), `.docx`, `.pptx`, `.xlsx` into `./my-workspace/wiki/`.
