/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Helpers shared by the grammar files.

/** A comma-separated list of `rule` with an optional trailing comma. */
export function commaSep(rule) {
  return optional(commaSep1(rule));
}

/** A non-empty comma-separated list of `rule` with an optional trailing comma. */
export function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

// Leading declaration modifiers shared by every declaration: any number of
// traits written before the keyword, then an optional `pub`.
export const modifiers = ($) => [repeat($.trait), optional($.visibility)];
