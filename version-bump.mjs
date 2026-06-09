import * as fs from "fs";

const targetVersion = process.env.npm_package_version;
if (!targetVersion) throw new Error("npm_package_version is not set");

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
fs.writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
fs.writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
