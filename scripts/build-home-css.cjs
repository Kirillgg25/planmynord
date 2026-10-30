const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const css = fs.readFileSync(path.join(publicDir, "style.css"), "utf8");
const sourceFiles = [
  "public/index.html",
  "public/js/home-page.js",
  "public/js/auth.js",
  "public/js/currency.js",
  "public/js/i18n.js",
  "public/js/popup-controller.js",
  "public/js/support-chat.js",
  "public/js/html-utils.js"
];
const used = new Set();
for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of source.matchAll(/\bclass\s*=\s*["']([^"']*)["']/g)) {
    for (const name of match[1].split(/\s+/)) if (name) used.add(name);
  }
  for (const match of source.matchAll(/\bclassName\s*=\s*["']([^"']*)["']/g)) {
    for (const name of match[1].split(/\s+/)) if (name) used.add(name);
  }
  for (const match of source.matchAll(/\b(?:id|class)\s*=\s*["']([^"']*)["']/g)) {
    for (const name of match[1].split(/\s+/)) if (name) used.add(name);
  }
}

function scanToDelimiter(source, start) {
  let quote = "";
  let escaped = false;
  let round = 0;
  let square = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) throw new Error("Unclosed CSS comment");
      i = end + 1;
      continue;
    }
    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (!round && !square && (char === "{" || char === ";")) return { index: i, delimiter: char };
  }
  return null;
}

function findBlockEnd(source, open) {
  let depth = 1;
  let quote = "";
  let escaped = false;
  for (let i = open + 1; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) throw new Error("Unclosed CSS comment");
      i = end + 1;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return i;
  }
  throw new Error("Unclosed CSS block");
}

function selectorIsUsed(selectorList) {
  return selectorList.split(",").some((selector) => {
    if (/:not\s*\(/i.test(selector)) return true;
    const names = [...selector.matchAll(/([.#])((?:\\.|[\w-])+)/g)];
    if (!names.length) return true;
    return names.some((match) => used.has(match[2].replaceAll("\\", "")));
  });
}

function filterRules(source) {
  let output = "";
  let index = 0;
  while (index < source.length) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (index >= source.length) break;
    if (source[index] === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new Error("Unclosed CSS comment");
      if (source[index + 2] === "!") output += source.slice(index, end + 2);
      index = end + 2;
      continue;
    }

    const ruleStart = index;
    const found = scanToDelimiter(source, index);
    if (!found) break;
    if (found.delimiter === ";") {
      const prelude = source.slice(ruleStart, found.index + 1);
      if (prelude.trim().startsWith("@")) output += prelude;
      index = found.index + 1;
      continue;
    }

    const prelude = source.slice(ruleStart, found.index);
    const end = findBlockEnd(source, found.index);
    const body = source.slice(found.index + 1, end);
    const trimmedPrelude = prelude.trim();
    let keep = false;
    let nextBody = body;

    if (trimmedPrelude.startsWith("@")) {
      if (/^@(?:-\w+-)?keyframes\b|^@font-face\b|^@property\b/i.test(trimmedPrelude)) {
        keep = true;
      } else {
        nextBody = filterRules(body);
        keep = nextBody.trim().length > 0;
      }
    } else {
      keep = selectorIsUsed(prelude);
    }

    if (keep) output += `${prelude}{${nextBody}}`;
    index = end + 1;
  }
  return output;
}

const result = filterRules(css);
const outputPath = path.join(publicDir, "home.css");
fs.writeFileSync(outputPath, result, "utf8");
const sourceBrotli = zlib.brotliCompressSync(css).length;
const resultBrotli = zlib.brotliCompressSync(result).length;
console.log(`Home CSS: ${Buffer.byteLength(css)} -> ${Buffer.byteLength(result)} bytes`);
console.log(`Brotli estimate: ${sourceBrotli} -> ${resultBrotli} bytes`);
