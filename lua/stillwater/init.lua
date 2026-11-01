local M = {}

local defaults = {
  italic_comments = false,
  transparent = false,
}

M.options = vim.deepcopy(defaults)

function M.setup(options)
  M.options = vim.tbl_deep_extend("force", vim.deepcopy(defaults), options or {})
end

function M.load()
  if vim.g.colors_name then
    vim.cmd.highlight("clear")
  end
  vim.o.background = "dark"
  vim.o.termguicolors = true
  vim.g.colors_name = "stillwater"

  local colors = require("stillwater.palette")
  for group, spec in pairs(require("stillwater.highlights")(colors, M.options)) do
    vim.api.nvim_set_hl(0, group, spec)
  end
  for index = 0, 15 do
    vim.g["terminal_color_" .. index] = colors.ansi[index + 1]
  end
end

return M
