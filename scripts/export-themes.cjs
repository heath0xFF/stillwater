const fs = require("node:fs");
const path = require("node:path");
const { palette, serialize } = require("../palette.js");

if (require.main === module) {
  const directory = path.join(__dirname, "../themes");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, palette.file), serialize(palette));
}

module.exports = { serialize };
