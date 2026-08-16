/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// The foreign-library surface: `ext <name> { ... }` blocks with per-language
// module paths, foreign structs, opaque handle types and `extern` bindings,
// plus the library-call forms the rest of the language reuses (an entry
// field's `= ns.fn(...)` source, an op's `impl` body, a trait argument).
// Split out of grammar.js only to keep each file readable; the rules are
// merged into the same grammar and reference the core rules through `$`.

import { commaSep, commaSep1, modifiers } from './common.js';

/** Rules for `ext <name> { ... }` and library calls, spread into `rules`. */
export const libraryRules = {
  // ── Foreign libraries (ext <name> { ... }) ──────────────────────────

  // library ::= trait* "pub"? "ext" name "{" item* "}"
  // The library form is told apart from the legacy "ext kind name" form by
  // what follows the first word: a "{" opens a library body, another word
  // is the legacy kind. Items are the per-language module paths, the
  // foreign structs, the opaque handle types and the free externs.
  library_declaration: ($) =>
    seq(
      ...modifiers($),
      'ext',
      field('name', alias($.identifier, $.library_name)),
      field('body', $.library_body),
    ),

  library_body: ($) =>
    seq(
      '{',
      repeat(
        choice(
          $.library_path,
          $.foreign_struct,
          $.opaque_type,
          $.extern_declaration,
          ',',
        ),
      ),
      '}',
    ),

  // path ::= lang ":" string — where the library lives in that target.
  library_path: ($) =>
    seq(
      field('language', alias($.identifier, $.language_name)),
      ':',
      field('path', $.string),
    ),

  // struct ::= "struct" name "{" (field ",")* "}" — a foreign shape, its
  // field names kept verbatim (never normalized). Never a top-level shape.
  foreign_struct: ($) =>
    seq(
      'struct',
      field('name', alias($.identifier, $.foreign_type_name)),
      field('body', $.foreign_struct_body),
    ),

  foreign_struct_body: ($) =>
    seq('{', repeat(choice($.foreign_field, ',')), '}'),

  foreign_field: ($) =>
    seq(
      field('name', alias($.identifier, $.foreign_field_name)),
      ':',
      field('type', $._type),
    ),

  // type ::= "type" name "{" extern* "}" — an opaque handle: called, never
  // read, never on the wire. Its externs are methods with an implicit
  // receiver.
  opaque_type: ($) =>
    seq(
      'type',
      field('name', alias($.identifier, $.foreign_type_name)),
      field('body', $.opaque_type_body),
    ),

  opaque_type_body: ($) =>
    seq('{', repeat(choice($.extern_declaration, ',')), '}'),

  // extern ::= "extern" name "(" (param ":" type),* ")" ":" type
  //            "{" lang_block* "}"
  // The logical signature, in tono types; each language block below binds
  // it to the real call.
  extern_declaration: ($) =>
    seq(
      'extern',
      field('name', $.identifier),
      field('parameters', $.extern_parameters),
      ':',
      field('return', $._type),
      field('body', $.extern_body),
    ),

  extern_parameters: ($) => seq('(', commaSep($.extern_parameter), ')'),

  extern_parameter: ($) =>
    seq(field('name', $.identifier), ':', field('type', $._type)),

  extern_body: ($) => seq('{', repeat(choice($.extern_language_block, ',')), '}'),

  // lang_block ::= lang "{" (call | yields | returns | errors | sync |
  //                          infallible)* "}"
  // "sync" and "infallible" mark a call that steps out of the target's
  // convention (a blocking Rust call, a Go call with no error return); the
  // convention itself is never written down.
  extern_language_block: ($) =>
    seq(
      field('language', alias($.identifier, $.language_name)),
      '{',
      repeat(
        choice(
          $.call_binding,
          $.yields_binding,
          $.returns_binding,
          $.errors_binding,
          $.sync_marker,
          $.infallible_marker,
          ',',
        ),
      ),
      '}',
    ),

  // call ::= "call" ":" string "(" call_arg,* ")"
  // The foreign name is a string literal by design (the origin must be
  // visible), so it gets its own node and never reads as a tono name.
  call_binding: ($) =>
    seq(
      'call',
      ':',
      field('symbol', alias($.string, $.foreign_symbol)),
      field('arguments', $.library_call_arguments),
    ),

  // yields ::= "yields" ":" "(" (name ":" (type | "error")),+ ")"
  // Names what the foreign call returns so "returns:" can project from it;
  // "error" is the reserved sentinel for the error position and exists
  // nowhere else in the grammar.
  yields_binding: ($) =>
    seq('yields', ':', '(', commaSep1($.yields_position), ')'),

  yields_position: ($) =>
    seq(
      field('name', $.identifier),
      ':',
      field('type', choice($.error_sentinel, $._type)),
    ),

  error_sentinel: ($) => 'error',

  // returns ::= "returns" ":" type "{" (field ":" (ref | match)),* "}"
  // Constructs the logical type from the yields-bound names, the same way
  // "Type { field: value }" reads everywhere else in the language.
  returns_binding: ($) =>
    seq(
      'returns',
      ':',
      field('type', $._type),
      field('body', $.returns_body),
    ),

  returns_body: ($) => seq('{', repeat(choice($.returns_field, ',')), '}'),

  returns_field: ($) =>
    seq(
      field('name', $.identifier),
      ':',
      field('value', choice($.field_reference, $.match_expression)),
    ),

  // errors ::= "errors" ":" "{" (string "=>" name),* "}" — a foreign
  // sentinel mapped onto a declared error shape, per language.
  errors_binding: ($) => seq('errors', ':', field('body', $.errors_body)),

  errors_body: ($) => seq('{', repeat(choice($.error_mapping, ',')), '}'),

  error_mapping: ($) =>
    seq(
      field('sentinel', $.string),
      '=>',
      field('type', alias($.identifier, $.type_identifier)),
    ),

  sync_marker: ($) => 'sync',

  infallible_marker: ($) => 'infallible',

  // ── Library calls ───────────────────────────────────────────────────

  // call ::= ns "." fn "(" call_arg,* ")" — a call into a declared library
  // (an entry field's "= ns.fn(...)" source, or a value bound to a trait
  // argument, e.g. @header("K", auth.sign(.request))).
  library_call: ($) =>
    seq(
      field('library', alias($.identifier, $.library_name)),
      '.',
      field('function', $.identifier),
      field('arguments', $.library_call_arguments),
    ),

  library_call_arguments: ($) =>
    seq('(', commaSep($._call_argument), ')'),

  // call_arg ::= ref | literal | name | name "{" field ":" value,* "}"
  // A bare name is the caller's own parameter; the struct literal maps the
  // arguments into a foreign shape (the counterpart of "returns:").
  _call_argument: ($) =>
    choice(
      $.field_reference,
      $.string,
      $.integer,
      $.float_literal,
      $.struct_literal,
      alias($.identifier, $.parameter_name),
    ),

  struct_literal: ($) =>
    seq(field('type', alias($.identifier, $.type_identifier)), field('body', $.struct_literal_body)),

  struct_literal_body: ($) => seq('{', commaSep($.struct_literal_field), '}'),

  struct_literal_field: ($) =>
    seq(field('name', $.identifier), ':', field('value', $._trait_value)),
};
