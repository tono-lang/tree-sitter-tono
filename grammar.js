/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// tree-sitter grammar for the Tono interface language.
//
// This is a highlight-only grammar kept in sync with the frontend's
// hand-written recursive-descent parser: it accepts the same surface so
// editors (Neovim/Zed/Helix) and GitHub can highlight and incrementally
// parse `.tono` without depending on the compiler. The source of truth for
// the accepted surface is the OCaml parser, not this file.

/** A comma-separated list of `rule` with an optional trailing comma. */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/** A non-empty comma-separated list of `rule` with an optional trailing comma. */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

// Leading declaration modifiers shared by every declaration: any number of
// traits written before the keyword, then an optional `pub`.
const modifiers = ($) => [repeat($.trait), optional($.visibility)];

export default grammar({
  name: 'tono',

  word: ($) => $.identifier,

  extras: ($) => [/\s/, $.comment],

  rules: {
    source_file: ($) => repeat($._definition),

    _definition: ($) =>
      choice(
        $.import_declaration,
        $.struct_declaration,
        $.enum_declaration,
        $.union_declaration,
        $.operation_declaration,
        $.extension_declaration,
      ),

    // ── Imports ─────────────────────────────────────────────────────────

    // import ::= "import" segment ("." segment)* ( "as" alias )?
    import_declaration: ($) =>
      seq(
        'import',
        field('path', $.module_path),
        optional(seq('as', field('alias', $.identifier))),
      ),

    module_path: ($) =>
      seq(
        alias($.identifier, $.module_segment),
        repeat(seq('.', alias($.identifier, $.module_segment))),
      ),

    // ── Declarations ────────────────────────────────────────────────────

    // struct ::= trait* "pub"? "struct" name generics? "{" member* "}"
    struct_declaration: ($) =>
      seq(
        ...modifiers($),
        'struct',
        field('name', $.identifier),
        optional($.type_parameters),
        field('body', $.struct_body),
      ),

    // enum ::= trait* "pub"? "enum" name "{" case* "}"
    enum_declaration: ($) =>
      seq(
        ...modifiers($),
        'enum',
        field('name', $.identifier),
        field('body', $.enum_body),
      ),

    // union ::= trait* "pub"? "union" name generics? trait* "{" variant* "}"
    // Traits after the name (e.g. @discriminator) join the shape-level traits.
    union_declaration: ($) =>
      seq(
        ...modifiers($),
        'union',
        field('name', $.identifier),
        optional($.type_parameters),
        repeat($.trait),
        field('body', $.union_body),
      ),

    // op ::= trait* "pub"? "op" name "(" type? ")" ( ":" type )? trait*
    // Trailing traits bind greedily to the operation (mirrors the hand-written
    // parser), so a "@" after the signature never starts the next declaration.
    operation_declaration: ($) =>
      prec.right(
        seq(
          ...modifiers($),
          'op',
          field('name', $.identifier),
          '(',
          field('input', optional($._type)),
          ')',
          optional(seq(':', field('output', $._type))),
          repeat($.trait),
        ),
      ),

    // ext ::= trait* "pub"? "ext" kind name signature? "{" binding* "}"
    // The kind word (hook | contract | constraint) is a contextual identifier,
    // not a reserved keyword, so it stays usable as an ordinary name elsewhere.
    extension_declaration: ($) =>
      seq(
        ...modifiers($),
        'ext',
        field('kind', alias($.identifier, $.extension_kind)),
        field('name', $.identifier),
        optional($.extension_signature),
        field('body', $.extension_body),
      ),

    // signature ::= "(" type ")" "->" type
    extension_signature: ($) =>
      seq('(', field('input', $._type), ')', '->', field('output', $._type)),

    extension_body: ($) => seq('{', repeat($.extension_binding), '}'),

    // binding ::= key ":" string, where key is a language tag or "conformance".
    extension_binding: ($) =>
      seq(
        field('key', $.identifier),
        ':',
        field('value', choice($.string, $.multiline_string)),
      ),

    visibility: ($) => 'pub',

    // generics ::= "[" name ("," name)* "]"
    type_parameters: ($) =>
      seq('[', commaSep1(alias($.identifier, $.type_parameter)), ']'),

    // ── Bodies ──────────────────────────────────────────────────────────

    // Members are whitespace-separated; stray commas between them are tolerated
    // to match the hand-written parser, which skips commas in a shape body.
    struct_body: ($) => seq('{', repeat(choice($.member, ',')), '}'),

    // member ::= name ":" type trait*
    member: ($) =>
      seq(
        field('name', $.identifier),
        ':',
        field('type', $._type),
        repeat($.trait),
      ),

    enum_body: ($) => seq('{', commaSep($.enum_case), '}'),

    // case ::= name ("=" int)? trait*
    enum_case: ($) =>
      seq(
        field('name', $.identifier),
        optional(seq('=', field('value', $.integer))),
        repeat($.trait),
      ),

    union_body: ($) => seq('{', commaSep($.variant), '}'),

    // variant ::= name ( "(" type ")" )? trait*
    variant: ($) =>
      seq(
        field('name', $.identifier),
        optional($.variant_payload),
        repeat($.trait),
      ),

    variant_payload: ($) => seq('(', field('type', $._type), ')'),

    // ── Types ───────────────────────────────────────────────────────────

    // type ::= base "?"? (the "?" binds to the whole preceding base type).
    _type: ($) => seq($._base_type, optional($.nullable)),

    nullable: ($) => '?',

    _base_type: ($) =>
      choice($.primitive_type, $.list_type, $.map_type, $.named_type),

    // []T, where the element is a base type; a trailing "?" binds to the list.
    list_type: ($) => seq('[', ']', field('element', $._base_type)),

    // map[K]V, where the key is a full type and the value a base type.
    map_type: ($) =>
      seq(
        'map',
        '[',
        field('key', $._type),
        ']',
        field('value', $._base_type),
      ),

    // Name, qualifier.Name, or either with a [args] generic application.
    named_type: ($) =>
      seq($._type_name, optional($.type_arguments)),

    _type_name: ($) =>
      choice(alias($.identifier, $.type_identifier), $.qualified_type),

    // A cross-module reference: the qualifier is an import alias or module name.
    qualified_type: ($) =>
      seq(
        field('module', alias($.identifier, $.module_qualifier)),
        '.',
        alias($.identifier, $.type_identifier),
      ),

    type_arguments: ($) => seq('[', commaSep1($._type), ']'),

    primitive_type: ($) =>
      choice(
        'bool',
        'string',
        'bytes',
        'i8',
        'i16',
        'i32',
        'i64',
        'u8',
        'u16',
        'u32',
        'u64',
        'float',
        'timestamp',
        'date',
        'duration',
        'uuid',
      ),

    // ── Traits ──────────────────────────────────────────────────────────

    // trait ::= "@" name ( "(" arg ("," arg)* ")" )?
    trait: ($) =>
      seq(
        '@',
        field('name', alias(choice($.identifier, $.primitive_type), $.trait_name)),
        optional($.trait_arguments),
      ),

    trait_arguments: ($) => seq('(', commaSep($.trait_argument), ')'),

    // arg ::= key ":" value | value
    trait_argument: ($) => choice($.key_value, $._trait_value),

    key_value: ($) =>
      seq(field('key', $.identifier), ':', field('value', $._trait_value)),

    _trait_value: ($) =>
      choice(
        $.string,
        $.multiline_string,
        $.integer,
        $.float_literal,
        $.identifier,
      ),

    // ── Literals and lexical ────────────────────────────────────────────

    string: ($) =>
      seq('"', repeat(choice($._string_content, $.escape_sequence)), '"'),

    _string_content: ($) => token.immediate(prec(1, /[^"\\\n]+/)),

    escape_sequence: ($) => token.immediate(/\\./),

    // Triple-quoted raw string: content runs to the next closing triple quote.
    multiline_string: ($) =>
      token(seq('"""', /([^"]|"[^"]|""[^"])*/, '"""')),

    integer: ($) => /-?\d+/,

    // Named "float_literal" to avoid colliding with the "float" primitive_type
    // keyword, which would otherwise produce two node types both named "float".
    float_literal: ($) => /-?\d+\.\d+/,

    identifier: ($) => /[A-Za-z_][A-Za-z0-9_]*/,

    comment: ($) => token(seq('//', /.*/)),
  },
});
