import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type Json = { [key: string]: any };

const PACKAGE_JSON_FILE_NAME = "package.json";

function readJsonFile(filePath: string): Json | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return undefined;
  }
}

function findPackageJson(pkgName: string | undefined): { content: Json; foundIn: string } | undefined {
  if (pkgName === undefined) {
    const packageJsonPath = `./${PACKAGE_JSON_FILE_NAME}`;
    const content = readJsonFile(packageJsonPath);

    return content ? { content, foundIn: packageJsonPath } : undefined;
  }

  const dirsToSearch = [
    path.join(pkgName),
    path.join("node_modules", pkgName),
    path.join("node_modules", "@itwin", pkgName),
    path.join("node_modules", "@bentley", pkgName),
    path.join("node_modules", ".pnpm", "node_modules", pkgName),
    path.join("node_modules", ".pnpm", "node_modules", "@itwin", pkgName),
    path.join("node_modules", ".pnpm", "node_modules", "@bentley", pkgName),
  ];

  let prefix = process.cwd();
  while (true) {
    for (const dirToSearch of dirsToSearch) {
      const packageJsonPath = path.join(prefix, dirToSearch, PACKAGE_JSON_FILE_NAME);
      const packageJson = readJsonFile(packageJsonPath);

      if (packageJson !== undefined) {
        return { content: packageJson, foundIn: packageJsonPath };
      }
    }

    const parent = path.dirname(prefix);
    if (parent === prefix)
      break;

    prefix = parent;
  }

  return undefined;
}

function printHeader(label: string, value: unknown): void {
  if (typeof value !== "string" || value === "")
    return;

  console.log(`- ${label}: ${value}`);

}

function printPeerDependencies(pkgName: string | undefined, showDeps: boolean): void {
  const searchResult = findPackageJson(pkgName);
  if (searchResult === undefined) {
    if (pkgName === undefined)
      console.error("Package.json not found in current directory");
    else
      console.error(`Package '${pkgName}' not found.`);

    return;
  }

  const { content, foundIn } = searchResult;

  console.log(`${content.name} (${path.resolve(foundIn)})`);
  printHeader("version", content.version);
  printHeader("type", content.type);
  printHeader("repo", content?.repository?.url);
  console.log("");

  console.log(`Peers:`);
  const peerDeps = content.peerDependencies;
  if (peerDeps && Object.keys(peerDeps).length > 0) {
    for (const [dep, version] of Object.entries(peerDeps)) {
      console.log(`  ${dep}: ${version}`);
    }
  } else {
    console.log("  <empty>");
  }

  if (showDeps) {
    console.log(`Dependencies:`);
    const deps = content.dependencies;
    if (deps && Object.keys(deps).length > 0) {
      for (const [dep, version] of Object.entries(deps)) {
        console.log(`  ${dep}: ${version}`);
      }
    } else {
      console.log("  <empty>");
    }
  }
}

const argv = yargs(hideBin(process.argv))
  .usage("Usage: node peer.js <package-name> [--deps]")
  .demandCommand(0, 1)
  .option("deps", {
    alias: "d",
    type: "boolean",
    description: "Show dependencies",
    default: false
  })
  .help()
  .parseSync();

const pkgName = argv._[0] as string | undefined;
const showDeps = argv.deps;

printPeerDependencies(pkgName, showDeps);
