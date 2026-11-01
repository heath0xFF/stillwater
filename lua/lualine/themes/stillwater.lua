local c = require("stillwater.palette")

local function mode(color)
  return {
    a = { fg = c.bg, bg = color, gui = "bold" },
    b = { fg = c.fg, bg = c.selection },
    c = { fg = c.white, bg = c.surface },
  }
end

return {
  normal = mode(c.blue),
  insert = mode(c.green),
  visual = mode(c.magenta),
  replace = mode(c.red),
  command = mode(c.yellow),
  terminal = mode(c.cyan),
  inactive = {
    a = { fg = c.comment, bg = c.surface },
    b = { fg = c.comment, bg = c.surface },
    c = { fg = c.comment, bg = c.surface },
  },
}
