/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// The foreign-library surface: `ext <name> { ... }` blocks with per-language
// module paths, foreign structs and opaque handles (both `struct`), and `op`
// bindings, plus the library-call forms the rest of the language reuses (an
// entry field's `= ns.fn(...)` source, an op's `impl` body, a trait argument).
// Split out of grammar.js only to keep each file readable; the rules are
// merged into the same grammar and reference the core rules through `$`.
//
// Two rules carry the block: a foreign spelling is `#(...)`, a raw region
// up to the matching parenthesis (`foreign_spelling` in grammar.js), never
// a string; and everything specific to one language lives in that
// language's block, at every level (the header, a struct, a field, an op).

import { commaSep, commaSep1, modifiers } from './common.js';

/** Rules for `ext <name> { ... }` and library calls, spread into `rules`. */
export const libraryRules = {
  // ── Foreign libraries (ext <name> { ... }) ──────────────────────────

  // library ::= trait* "pub"? "ext" name "{" item* "}"
  // The library form is told apart from the legacy "ext kind name" form by
  // what follows the first word: a "{" opens a library body, another word
  // is the legacy kind. Items are the per-language module paths (a
  // language block with only the head), the foreign structs and handles,
  // and the free ops.
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
          $.language_block,
          $.foreign_struct,
          $.extern_declaration,
          ',',
        ),
      ),
      '}',
    ),

  // lang_block ::= lang "{" spelling (name ":" spelling)* "}"
  // The first element is positional and names the foreign thing; what it is
  // depends on where the block sits: the module path in the ext header, the
  // foreign type of a foreign form, the whole storage type of an opaque
  // handle, the sentinel (or error type) of an error struct. The keyed
  // entries name a tono field and give its foreign spelling.
  language_block: ($) =>
    seq(
      field('language', alias($.identifier, $.language_name)),
      '{',
      field('head', $.foreign_spelling),
      repeat(choice($.language_block_field, ',')),
      '}',
    ),

  language_block_field: ($) =>
    seq(
      field('name', alias($.identifier, $.foreign_field_name)),
      ':',
      field('spelling', $.foreign_spelling),
    ),

  // struct ::= "struct" name "{" (field | lang_block | trait* op)* "}"
  // One grammar for both shapes the block declares: fields make it a
  // foreign form (data the target reads), their absence makes it an opaque
  // handle (a thing the target calls, its ops methods with an implicit
  // receiver). Each language block spells the type as that target holds it.
  foreign_struct: ($) =>
    seq(
      'struct',
      field('name', alias($.identifier, $.foreign_type_name)),
      field('body', $.foreign_struct_body),
    ),

  foreign_struct_body: ($) =>
    seq(
      '{',
      repeat(
        choice(
          $.foreign_field,
          $.language_block,
          $.extern_declaration,
          ',',
        ),
      ),
      '}',
    ),

  foreign_field: ($) =>
    seq(
      field('name', alias($.identifier, $.foreign_field_name)),
      ':',
      field('type', $._type),
    ),

  // op ::= trait* "op" name "(" (param ":" type),* ")" ":" type
  //        "{" lang_block* "}"
  // The logical signature, in tono types; each language block below binds
  // it to the real call. The traits are the ones the rest of the language
  // already has: @async listing the targets where the foreign call is
  // asynchronous, @errors, @doc.
  extern_declaration: ($) =>
    seq(
      repeat($.trait),
      'op',
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

  // lang_block ::= lang "{" (call | yields | returns)* "}"
  // Anything the target needs beyond these three lines is a foreign
  // spelling inside them; the convention itself is never written down.
  extern_language_block: ($) =>
    seq(
      field('language', alias($.identifier, $.language_name)),
      '{',
      repeat(
        choice($.call_binding, $.yields_binding, $.returns_binding, ','),
      ),
      '}',
    ),

  // call ::= "call" ":" spelling "(" call_arg,* ")"
  // The callee is one foreign spelling, verbatim: a function, a generic
  // instantiation (#(FromConstant[float64])), a class under new
  // (#(new ConstantCalculator)), a static method on a type
  // (#(FormulaCalculator::parse)).
  call_binding: ($) =>
    seq(
      'call',
      ':',
      field('symbol', $.foreign_spelling),
      field('arguments', $.library_call_arguments),
    ),

  // yields ::= "yields" ":" "(" (name ":" (type | "error" | spelling)),+ ")"
  // Names what the foreign call returns so "returns:" can project from it;
  // "error" is the reserved sentinel for the error position and exists
  // nowhere else in the grammar; a spelling declares what the call really
  // returns, for the target to coerce into the declared logical type.
  yields_binding: ($) =>
    seq('yields', ':', '(', commaSep1($.yields_position), ')'),

  yields_position: ($) =>
    seq(
      field('name', $.identifier),
      ':',
      field('type', choice($.error_sentinel, $.foreign_spelling, $._type)),
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

  // call_arg ::= ref | literal | name | name ":" spelling | spelling
  //            | spelling "(" call_arg,* ")" | name "{" field ":" value,* "}"
  //            | "[" call_arg,* "]"
  // A bare name is the caller's own parameter (or, in a call: line, a
  // declared handle passed as a class reference; the checker tells them
  // apart); "name: #(...)" is the parameter under the foreign spelling it
  // crosses as (values: #(Vec<f64>), calcs: #(...Calculator[float64]));
  // a bare spelling is a position the target binds itself
  // (#(ctx context.Context)); a spelling immediately followed by "(" is a
  // nested foreign call (#(WithPrecision)(precision)); the struct literal
  // maps the arguments into a foreign form (the counterpart of "returns:");
  // a "[" ... "]" list feeds a collection parameter at its call site.
  _call_argument: ($) =>
    choice(
      $.field_reference,
      $.nested_call,
      $.spelled_parameter,
      $.foreign_spelling,
      $.call_argument_list,
      $.string,
      $.integer,
      $.float_literal,
      $.struct_literal,
      alias($.identifier, $.parameter_name),
    ),

  spelled_parameter: ($) =>
    seq(
      field('name', alias($.identifier, $.parameter_name)),
      ':',
      field('spelling', $.foreign_spelling),
    ),

  nested_call: ($) =>
    seq(
      field('symbol', $.foreign_spelling),
      field('arguments', $.library_call_arguments),
    ),

  call_argument_list: ($) => seq('[', commaSep($._call_argument), ']'),

  struct_literal: ($) =>
    seq(field('type', alias($.identifier, $.type_identifier)), field('body', $.struct_literal_body)),

  struct_literal_body: ($) => seq('{', commaSep($.struct_literal_field), '}'),

  struct_literal_field: ($) =>
    seq(field('name', $.identifier), ':', field('value', $._trait_value)),
};
