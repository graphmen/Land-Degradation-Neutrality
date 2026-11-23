#!/usr/bin/env node
import { copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(
  join(root, "public/reference-code-lists.v0.9.json"),
  join(root, "mobile/public/reference-code-lists.v0.9.json")
);
console.log("Synced reference-code-lists.v0.9.json → mobile/public/");