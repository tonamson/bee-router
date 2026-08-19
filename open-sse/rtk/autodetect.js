// Content-only detect. No tool-name list.
// High-confidence dumps only. Path lists / JSON / file reads → null (agy ListDir, Read).
// Detection order: git-log → git-diff → git-status → build-output → grep → tree → ls → search-list
import { DETECT_WINDOW } from "./constants.js";
import { gitDiff } from "./filters/gitDiff.js";
import { gitStatus } from "./filters/gitStatus.js";
import { gitLog } from "./filters/gitLog.js";
import { buildOutput } from "./filters/buildOutput.js";
import { grep } from "./filters/grep.js";
import { ls } from "./filters/ls.js";
import { tree } from "./filters/tree.js";
import { searchList, SEARCH_LIST_HEADER_RE } from "./filters/searchList.js";

const RE_GIT_DIFF = /^diff --git /m;
const RE_GIT_DIFF_HUNK = /^@@ /m;
const RE_GIT_STATUS = /^On branch |^nothing to commit|^Changes (not |to be )|^Untracked files:/m;
const RE_GIT_LOG = /^[*|/\\ ]*commit [0-9a-f]{7,40}$/m;
const RE_PORCELAIN = /^[ MADRCU?!][ MADRCU?!] \S/m;
const RE_BUILD_OUTPUT = /^(npm (warn|error|ERR!)|yarn (warn|error)|\s*Compiling\s+\S+|\s*Downloading\s+\S+|added \d+ package|\[ERROR\]|BUILD (SUCCESS|FAILED)|\s*Finished\s+|Successfully (installed|built)|ERROR:)/im;
const RE_TREE_GLYPH = /[├└]──|│  /;
const RE_LS_ROW = /^[-dlbcps][rwx-]{9}/m;
const RE_LS_TOTAL = /^total \d+$/m;

export function autoDetectFilter(text) {
  if (typeof text !== "string" || !text) return null;
  const trimmed = text.trim();
  // ListDir / tool JSON is not a shell dump.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return null;

  // Rust: floor_char_boundary to avoid UTF-8 split — JS .slice() by char is safe
  const head = text.length > DETECT_WINDOW ? text.slice(0, DETECT_WINDOW) : text;

  if (RE_GIT_LOG.test(head)) return gitLog;
  if (RE_GIT_DIFF.test(head) || RE_GIT_DIFF_HUNK.test(head)) return gitDiff;
  if (RE_GIT_STATUS.test(head)) return gitStatus;

  // Build output BEFORE porcelain check: prevents cargo "Compiling" misdetection as git-status
  if (RE_BUILD_OUTPUT.test(head)) return buildOutput;

  if (isMostlyPorcelain(head)) return gitStatus;

  const lines = head.split("\n");
  const nonEmpty = lines.filter(l => l.trim().length > 0);

  // Rust grep rule: first 5 non-empty lines, ANY matches "file:number:content"
  const first5 = nonEmpty.slice(0, 5);
  if (first5.some(isGrepLine)) return grep;

  // Tree: contains box-drawing glyphs typical of `tree` command
  if (RE_TREE_GLYPH.test(head)) return tree;

  // ls -la: has "total N" header or >=3 rows starting with perms string
  if (RE_LS_TOTAL.test(head) || countMatches(head, RE_LS_ROW) >= 3) return ls;

  // Cursor Glob search list header
  if (SEARCH_LIST_HEADER_RE.test(head)) return searchList;

  return null;
}

function isGrepLine(line) {
  // Skip Windows `C:` so `C:\path\a.js:10:text` still counts as file:line:content.
  let from = 0;
  if (/^[A-Za-z]:[\\/]/.test(line)) from = 2;
  const first = line.indexOf(":", from);
  if (first === -1) return false;
  const second = line.indexOf(":", first + 1);
  if (second === -1) return false;
  const lineno = line.slice(first + 1, second);
  return /^\d+$/.test(lineno);
}

function isMostlyPorcelain(head) {
  const lines = head.split("\n").filter(l => l.trim());
  if (lines.length < 3) return false;
  const hits = lines.filter(l => RE_PORCELAIN.test(l)).length;
  return hits / lines.length >= 0.6;
}

function countMatches(text, re) {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return (text.match(g) || []).length;
}
