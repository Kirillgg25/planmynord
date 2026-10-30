const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const publicDir = path.join(__dirname, "..", "public");
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(publicDir, "style.css");
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : path.join(publicDir, "style.min.css");
const source = fs.readFileSync(sourcePath, "utf8");

function minifyCss(css) {
  let output = "";
  let pendingSpace = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];
    const next = css[i + 1];

    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }

    if ((char === "'" || char === '"')) {
      if (pendingSpace && output && !/[{;}]$/.test(output)) output += " ";
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) throw new Error("Unclosed CSS comment");
      if (css[i + 2] === "!") {
        if (pendingSpace && output && !/[{;}]$/.test(output)) output += " ";
        output += css.slice(i, end + 2);
      } else {
        pendingSpace = true;
      }
      i = end + 1;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if (pendingSpace && output && !/[{;,:]$/.test(output) && !/[{;},]/.test(char)) {
      output += " ";
    }
    pendingSpace = false;
    output += char;
  }

  if (quote) throw new Error("Unclosed CSS string");
  return output.trim();
}

const minified = minifyCss(source);
fs.writeFileSync(outputPath, minified, "utf8");

const sourceBytes = Buffer.byteLength(source);
const outputBytes = Buffer.byteLength(minified);
const sourceBrotliBytes = zlib.brotliCompressSync(source).length;
const outputBrotliBytes = zlib.brotliCompressSync(minified).length;
console.log(`CSS: ${sourceBytes} -> ${outputBytes} bytes`);
console.log(`Brotli estimate: ${sourceBrotliBytes} -> ${outputBrotliBytes} bytes (${Math.max(0, sourceBrotliBytes - outputBrotliBytes)} bytes saved)`);
