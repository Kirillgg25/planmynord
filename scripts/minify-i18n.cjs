const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const publicDir = path.join(__dirname, "..", "public");
const sourcePath = path.join(publicDir, "js", "i18n.js");
const outputPath = path.join(publicDir, "js", "i18n.min.js");
const source = fs.readFileSync(sourcePath, "utf8");
const declaration = "const translations =";
const declarationIndex = source.indexOf(declaration);

if (declarationIndex < 0) throw new Error("Could not find the translations object");
const objectStart = source.indexOf("{", declarationIndex + declaration.length);
if (objectStart < 0) throw new Error("Could not find the start of the translations object");

let depth = 0;
let quote = "";
let escaped = false;
let objectEnd = -1;
for (let i = objectStart; i < source.length; i += 1) {
  const char = source[i];
  if (quote) {
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === quote) quote = "";
    continue;
  }
  if (char === '"' || char === "'") { quote = char; continue; }
  if (char === "{") depth += 1;
  else if (char === "}" && --depth === 0) { objectEnd = i + 1; break; }
}
if (objectEnd < 0 || quote) throw new Error("Could not find the end of the translations object");

function compactObject(objectSource) {
  let result = "";
  let stringQuote = "";
  let stringEscaped = false;
  let pendingSpace = false;

  for (let i = 0; i < objectSource.length; i += 1) {
    const char = objectSource[i];
    if (stringQuote) {
      result += char;
      if (stringEscaped) stringEscaped = false;
      else if (char === "\\") stringEscaped = true;
      else if (char === stringQuote) stringQuote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      const previous = result.at(-1) || "";
      if (pendingSpace && /[\w$]/.test(previous)) result += " ";
      pendingSpace = false;
      stringQuote = char;
      result += char;
      continue;
    }
    if (/\s/.test(char)) { pendingSpace = true; continue; }
    if (pendingSpace && /[\w$]/.test(result.at(-1) || "") && /[\w$]/.test(char)) result += " ";
    pendingSpace = false;
    result += char;
  }

  if (stringQuote) throw new Error("Unclosed string in translations object");
  return result;
}

const minified = source.slice(0, objectStart) + compactObject(source.slice(objectStart, objectEnd)) + source.slice(objectEnd);
fs.writeFileSync(outputPath, minified, "utf8");

const report = (label, value) => `${label}: ${Buffer.byteLength(value)} bytes; Brotli ${zlib.brotliCompressSync(value).length} bytes`;
console.log(report("Source", source));
console.log(report("Built", minified));
