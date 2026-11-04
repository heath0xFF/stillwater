const fs = require("node:fs");
const path = require("node:path");
const { palette, serialize, serializeNeovim, serializeTern, serializeHunk, serializeOrcaTerminal, serializeOrcaApp } = require("../palette.js");

if (require.main === module) {
  const directory = path.join(__dirname, "../themes");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, palette.file), serialize(palette));
  fs.writeFileSync(path.join(__dirname, "../lua/stillwater/palette.lua"), serializeNeovim(palette));
  fs.mkdirSync(path.join(directory, "tern"), { recursive: true });
  fs.writeFileSync(path.join(directory, "tern/Stillwater.css"), serializeTern(palette));
  fs.mkdirSync(path.join(directory, "hunk"), { recursive: true });
  fs.writeFileSync(path.join(directory, "hunk/stillwater.toml"), serializeHunk(palette));
  fs.mkdirSync(path.join(directory, "orca"), { recursive: true });
  fs.writeFileSync(path.join(directory, "orca/stillwater-terminal.json"), serializeOrcaTerminal(palette));
  fs.writeFileSync(path.join(directory, "orca/stillwater-app.json"), serializeOrcaApp(palette));
}

module.exports = { serialize };
