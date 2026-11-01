const fs = require("node:fs");
const path = require("node:path");
const { palette, serialize, serializeNeovim } = require("../palette.js");

if (require.main === module) {
  const directory = path.join(__dirname, "../themes");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, palette.file), serialize(palette));
  fs.writeFileSync(path.join(__dirname, "../lua/stillwater/palette.lua"), serializeNeovim(palette));
}

module.exports = { serialize };
