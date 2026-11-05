const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function strip(file, patterns) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) {
    return;
  }
  const source = fs.readFileSync(target, "utf8");
  const next = patterns.reduce((current, pattern) => current.replace(pattern, ""), source);
  if (next !== source) {
    fs.writeFileSync(target, next);
  }
}

strip("node_modules/react-native-css-interop/dist/runtime/components.js", [
  /\(0, api_1\.remapProps\)\(react_native_1\.ImageBackground, \{\n    className: "style",\n    imageClassName: "imageStyle",\n\}\);\n/,
]);

strip("node_modules/react-native-css-interop/src/runtime/components.ts", [
  /\n  ImageBackground,/,
  /remapProps\(ImageBackground, \{\n  className: "style",\n  imageClassName: "imageStyle",\n\}\);\n/,
]);
