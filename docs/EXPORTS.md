# Distribution exports

## Outputs

`pnpm export:all` creates:

- `mediamatrix-v1.0.0-full-source.tar.gz`
- `mediamatrix-v1.0.0-vercel.tar.gz`
- `mediamatrix-v1.0.0-netlify.tar.gz`
- `mediamatrix-v1.0.0-wordpress.zip`
- `mediamatrix-v1.0.0-blogger.xml`
- `manifest.json`, `BUILD_INFO.json`, and `SHA256SUMS.txt`

The source/deployment archives come from clean Git `HEAD`, not uncommitted working files. Each receives build/deployment metadata. WordPress files are zipped under `mediamatrix/`; Blogger remains directly uploadable XML.

## Validation performed

- Clean Git tree required.
- Required workspace files present in source archives.
- Node modules, `.git`, `.next`, build/coverage output, `.env` files, dumps, and private-key filename patterns rejected.
- WordPress ZIP required files/theme header/REST proxy structures checked.
- Blogger XML parsed and required `b:skin`, section, widget, configuration, and search structures checked.
- Artifact existence/size and SHA-256 manifest entries generated.
- `pnpm validate:export` rechecks archive structure, XML, ZIP entries, and checksums.

Structural validation does not prove that a provider accepted a deployment, WordPress activated a theme, or Blogger accepted/rendered a template. Those are separate environment checks recorded in `release/verification.json`.

## CLI

```bash
export MEDIAMATRIX_EXPORT_DIR=/tmp/mediamatrix-exports
pnpm export:all
pnpm validate:export
(cd /tmp/mediamatrix-exports && sha256sum -c SHA256SUMS.txt)
```

Individual export-named commands regenerate the complete set for manifest consistency and print only the selected artifact summary. `pnpm checksums` validates artifacts and rewrites the checksum file; it does not convert an invalid package into a valid one.

## Self-hosted admin manager

Runtime generation is off by default and rejected on Vercel/Netlify. Requirements:

- self-hosted Node process;
- Git and tar executables;
- clean source checkout and correct `MEDIAMATRIX_REPOSITORY_ROOT` when standalone output cannot locate it;
- `MEDIAMATRIX_EXPORTS_ENABLED=true`;
- durable `MEDIAMATRIX_EXPORT_DIR` outside the repository;
- administrator session.

The route uses fixed artifact names and no user-selected shell commands or output paths. Generated output is not committed or served as a public static directory. Downloads recheck SHA-256 before returning bytes.

## Release metadata

`release/verification.json` is included when present. It distinguishes passed, failed, skipped, and unverified checks. Exporters do not invent successful build/test/deployment evidence. Regenerate release evidence before publishing a final distribution.
