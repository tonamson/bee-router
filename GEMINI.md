<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

This repo may expose `code-review-graph` MCP tools. Use them **only if
that exact tool name is in your available tool list**. If the call
fails or the tool is missing, immediately use native file tools.
Never invent MCP names. Never invent Claude Code / Cursor tool names.

### Antigravity CLI (`agy`) — native tools only

agy does not have `ListDir`, `Bash`, `Grep`, `Read`, `Glob`, `Edit`,
or `Write`. Calling those shows empty `ListDir()` / hung `Bash()`.

| Job | Call this | Args |
|-----|-----------|------|
| list dir | `list_dir` | `uri` = `file:///absolute/path` |
| read file | `view_file` | path / uri as the schema requires |
| search | `grep_search` | query + path |
| shell | `run_command` | `command` (string) |
| edit | `replace_file_content` / `write_to_file` | per schema |
| subagent | `invoke_subagent` | `Subagents` = `[{ TypeName, Prompt, Role, Workspace }]` (`self` / `research`) |

### When graph tools exist

- Explore: `semantic_search_nodes` or `query_graph`
- Impact: `get_impact_radius`
- Review: `detect_changes` + `get_review_context`
- Architecture: `get_architecture_overview` + `list_communities`

Fall back to native tools the first time a graph tool is unavailable.
