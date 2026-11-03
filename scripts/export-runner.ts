import { createDistributionExports, regenerateChecksums, validateExistingExports } from "../packages/cms-editions/src/index.ts";

const mode = process.argv[2] || "all";
try {
  if (mode === "validate") {
    const result = await validateExistingExports(); console.log(JSON.stringify({ status: "passed", output: result.output, artifacts: result.manifest.artifacts.length, validation: result.validation }, null, 2));
  } else if (mode === "checksums") {
    const result = await regenerateChecksums(); console.log(`Checksums regenerated and verified in ${result.output}`);
  } else {
    const manifest = await createDistributionExports();
    const selected = mode === "all" ? manifest.artifacts : manifest.artifacts.filter((item) => item.name.includes(mode === "full" ? "full-source" : `-${mode}`));
    if (!selected.length) throw new Error(`No artifact matched export target ${mode}.`);
    console.log(JSON.stringify({ status: "passed", note: "The complete distribution set is generated together so its manifest and checksums stay consistent.", commit: manifest.commit, artifacts: selected, validation: manifest.validation }, null, 2));
  }
} catch (error) { console.error(`Export command failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
