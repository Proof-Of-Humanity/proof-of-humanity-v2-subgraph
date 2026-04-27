const fs = require("fs");
const path = require("path");

const root = process.cwd();
const schemaPath = path.join(root, "schema.graphql");
const localSchemaPath = path.join(root, "schema.local-debug.graphql");
const manifestPath = path.join(root, "subgraph.yaml");

const schema = fs.readFileSync(schemaPath, "utf8");
const manifest = fs.readFileSync(manifestPath, "utf8");

const strippedSchema = schema.replace(
  /\ntype _Schema_[\s\S]*?include: \[\{ entity: "Claimer", fields: \[\{ name: "name" \}\] \}\]\n  \)\s*$/m,
  "\n"
);

if (strippedSchema === schema) {
  throw new Error("Failed to strip @fulltext block from schema.graphql");
}

const strippedDataSources = [];
const manifestLines = manifest.split("\n");
let collecting = false;
let currentBlock = [];

function flushCurrentBlock() {
  if (currentBlock.length === 0) return;
  const blockText = currentBlock.join("\n");
  if (
    blockText.includes("\n    name: ForesightGnosisRouter\n") ||
    blockText.includes("\n    name: ForesightCredits\n")
  ) {
    strippedDataSources.push(blockText);
  }
  currentBlock = [];
}

for (const line of manifestLines) {
  if (line === "dataSources:") {
    collecting = true;
    continue;
  }

  if (collecting && line.startsWith("  - kind: ethereum")) {
    flushCurrentBlock();
    currentBlock.push(line);
    continue;
  }

  if (collecting) {
    currentBlock.push(line);
  }
}

flushCurrentBlock();

if (strippedDataSources.length !== 2) {
  throw new Error(
    `Expected 2 foresight data sources in local debug manifest, found ${strippedDataSources.length}`
  );
}

const localOnlyManifest = [
  "specVersion: 1.2.0",
  "description: Proof of Humanity subgraph",
  "features:",
  "  - nonFatalErrors",
  "schema:",
  "  file: ./schema.local-debug.graphql",
  "dataSources:",
  ...strippedDataSources,
].join("\n");

const patchedManifest = localOnlyManifest
  .replace("  - fullTextSearch\n", "")
  .replace("./schema.graphql", "./schema.local-debug.graphql");

fs.writeFileSync(localSchemaPath, strippedSchema);
fs.writeFileSync(manifestPath, patchedManifest);

console.log("Prepared local debug manifest and schema");
