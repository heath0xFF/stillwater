-- Loads the colorscheme in headless Neovim and writes its resolved highlights as JSON.
local ok, failure = pcall(vim.cmd.colorscheme, "stillwater")
local result = { ok = ok, error = ok and vim.NIL or tostring(failure), colors_name = vim.g.colors_name, groups = {} }

if ok then
  local definitions = require("stillwater.highlights")(require("stillwater.palette"), require("stillwater").options)
  for group in pairs(definitions) do
    local resolved = vim.api.nvim_get_hl(0, { name = group, link = false })
    result.groups[group] = {
      fg = resolved.fg and string.format("#%06x", resolved.fg) or vim.NIL,
      bg = resolved.bg and string.format("#%06x", resolved.bg) or vim.NIL,
    }
  end
  local lualine_ok, lualine = pcall(require, "lualine.themes.stillwater")
  result.lualine = lualine_ok and lualine or vim.NIL
  result.terminal_color_1 = vim.g.terminal_color_1
  result.terminal_color_15 = vim.g.terminal_color_15

  require("stillwater").setup({ transparent = true })
  vim.cmd.colorscheme("stillwater")
  local normal = vim.api.nvim_get_hl(0, { name = "Normal", link = false })
  result.transparent_bg = normal.bg and string.format("#%06x", normal.bg) or vim.NIL
end

local file = assert(io.open(arg[1], "w"))
file:write(vim.json.encode(result))
file:close()
