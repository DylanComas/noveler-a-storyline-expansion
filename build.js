const fs = require("fs");
const path = require("path");

const modules = [
  ["./noveler", "noveler.js"],
  ["./storyline-bridge", "storyline-bridge.js"],
  ["./antidote-bridge", "antidote-bridge.js"],
  ["./entry", "entry.js"]
];

const moduleFactories = modules.map(([id, file]) => {
  const source = fs.readFileSync(path.join(__dirname, file), "utf8");
  return `${JSON.stringify(id)}: function(module, exports, require) {\n${source}\n}`;
});

const bundle = `"use strict";
const __novelerNativeRequire = require;
const __novelerModules = {
${moduleFactories.join(",\n")}
};
const __novelerCache = Object.create(null);
function __novelerRequire(id) {
  const factory = __novelerModules[id];
  if (!factory) {
    return __novelerNativeRequire(id);
  }
  if (__novelerCache[id]) {
    return __novelerCache[id].exports;
  }
  const bundledModule = { exports: {} };
  __novelerCache[id] = bundledModule;
  factory(bundledModule, bundledModule.exports, __novelerRequire);
  return bundledModule.exports;
}
module.exports = __novelerRequire("./entry");
`;

fs.writeFileSync(path.join(__dirname, "main.js"), bundle, "utf8");
