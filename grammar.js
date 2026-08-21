/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { commaSep, commaSep1, inlineTrait, modifiers } from './grammar/common.js';
import { libraryRules } from './grammar/libraries.js';

// tree-sitter grammar for the Tono interface language.
//
// This is a highlight-only grammar kept in sync with the frontend's
// hand-written recursive-descent parser: it accepts the same surface so
// editors (Neovim/Zed/Helix) and GitHub can highlight and incrementally
// parse `.tono` without depending on the compiler. The source of truth for
// the accepted surface is the OCaml parser, not this file.

export default grammar({
  name: 'tono',

  word: ($) => $.identifier,

  extras: ($) => [/\s/, $.comment],

  // The "@" that opens a trait comes from src/scanner.c as one of two tokens,
  // decided by layout: a trait on a line of its own belongs to the item after
  // it, a trait continuing a line belongs to that line. The grammar allows
  // each where the frontend parser does; the tree shows one `trait` node
  // either way.
  externals: ($) => [$._inline_at, $._own_line_at],

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
        $.library_declaration,
        $.test_declaration,
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

    // union ::= trait* "pub"? "union" name generics? inline_trait* "{" variant* "}"
    // Traits on the name's line (e.g. @discriminator) join the shape-level
    // traits.
    union_declaration: ($) =>
      seq(
        ...modifiers($),
        'union',
        field('name', $.identifier),
        optional($.type_parameters),
        repeat(inlineTrait($)),
        field('body', $.union_body),
      ),

    // op ::= trait* "pub"? "op" name "(" (param ":")? type? ")" ( ":" type )?
    //        inline_trait* impl?
    // Traits above the op belong to it, like any declaration's; only a trait
    // continuing the signature line binds after it, so a "@" on the next line
    // always starts the next declaration.
    operation_declaration: ($) => seq(...modifiers($), $._operation_core),

    // The op inside an entry body: its traits above it, no "pub". Aliased to
    // operation_declaration by struct_body so both positions get one node.
    _entry_operation: ($) => seq(repeat($.trait), $._operation_core),

    // The signature and its inline traits, without the leading modifiers. The
    // input may be named ("ref: note_ref"), which gives ".ref" references
    // their provenance; the bare type form is kept for the older sources.
    _operation_core: ($) =>
      prec.right(
        seq(
          'op',
          field('name', $.identifier),
          '(',
          optional(
            seq(
              optional(seq(field('parameter', $.identifier), ':')),
              field('input', $._type),
            ),
          ),
          ')',
          optional(seq(':', field('output', $._type))),
          repeat(inlineTrait($)),
          optional(field('body', $.operation_impl)),
        ),
      ),

    // impl ::= "impl" handle_call — the op's own body: a call into a
    // declared opaque handle's method. "impl" is a keyword only in this
    // position, after the op's traits, so a member named impl elsewhere is
    // still an ordinary identifier.
    operation_impl: ($) =>
      seq('impl', field('call', $.handle_method_call)),

    // handle_call ::= ref "(" call_arg* ")" — a call into a declared opaque
    // handle's method. The reference names the receiver field and the method
    // (".bus.send"). Shared by an op's impl body and a member's "= .h.m(...)"
    // value source, so the same syntax gets the same tree in both positions.
    handle_method_call: ($) =>
      seq(
        field('target', $.field_reference),
        field('arguments', $.library_call_arguments),
      ),

    // ext ::= trait* "pub"? "ext" kind name "raw"? signature? "{" binding* "}"
    // The kind word (hook | contract | constraint | impl) and the "raw" marker
    // are contextual identifiers, not reserved keywords, so they stay usable as
    // ordinary names elsewhere. An impl names the operation it implements, and
    // spells it "entry.op" when two entries share an operation name.
    extension_declaration: ($) =>
      seq(
        ...modifiers($),
        'ext',
        field('kind', alias($.identifier, $.extension_kind)),
        field('name', choice($.identifier, $.qualified_operation)),
        optional(field('raw', alias($.identifier, $.extension_raw))),
        optional($.extension_signature),
        field('body', $.extension_body),
      ),

    qualified_operation: ($) =>
      seq(
        field('entry', alias($.identifier, $.entry_name)),
        '.',
        field('operation', $.identifier),
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

    // ── Foreign libraries: see grammar/libraries.js ─────────────────────

    // ── Tests ───────────────────────────────────────────────────────────

    // test ::= "test" string "{" statement* "}"
    // "test" is a keyword only in top-level position: keyword extraction via
    // the `word` rule means the token exists only where a declaration may
    // start, so the same word keeps working as an ordinary name (member,
    // type, op) everywhere else. "stub", "expect", "any" and "None" below
    // are contextual the same way: their tokens are valid only inside a test
    // body, so outside one they lex as plain identifiers.
    test_declaration: ($) =>
      seq('test', field('name', $.string), field('body', $.test_body)),

    test_body: ($) => seq('{', repeat($._test_statement), '}'),

    _test_statement: ($) =>
      choice($.test_binding, $.stub_declaration, $.expect_declaration),

    // binding ::= name ":" value — a construction (ctor of an entry), an op
    // call, a literal, or dataflow out of a previous binding.
    test_binding: ($) =>
      seq(field('name', $.identifier), ':', field('value', $._test_value)),

    // stub ::= (name ":")? "stub" target ":" value
    // The value replaces the op's declared dependency on that instance. A
    // list is a sequence: each call consumes the next response, the last
    // repeats. The optional binding records what crossed the dependency
    // (s.requests).
    stub_declaration: ($) =>
      seq(
        optional(seq(field('binding', $.identifier), ':')),
        'stub',
        field('target', $.stub_target),
        ':',
        field('value', $._test_value),
      ),

    // target ::= binding "." op "." dependency (e.g. c.get_user.http)
    //          | library "." function          (e.g. configlib.load)
    //          | library "." type "." method   (e.g. bus.publisher.send)
    // The three-segment form is either an op's dependency on a bound entry or
    // a handle method; the two are told apart at typecheck, so both share the
    // same fields here.
    stub_target: ($) =>
      choice(
        seq(
          field('binding', $.identifier),
          '.',
          field('operation', $.identifier),
          '.',
          field('dependency', $.identifier),
        ),
        seq(
          field('library', alias($.identifier, $.library_name)),
          '.',
          field('function', $.identifier),
        ),
      ),

    // expect ::= "expect" subject ":" pattern — the subject is a previous
    // binding or a projection out of one (s.requests).
    expect_declaration: ($) =>
      seq(
        'expect',
        field('subject', choice($.identifier, $.value_path)),
        ':',
        field('pattern', $._test_pattern),
      ),

    // ── Test values ─────────────────────────────────────────────────────

    // The value grammar is the calculus subset the tests reuse: literals,
    // ctor (possibly qualified, http.response { ... }), list, field access,
    // and an op call. No new expressive power.
    _test_value: ($) =>
      choice(
        $.string,
        $.multiline_string,
        $.integer,
        $.float_literal,
        $.boolean,
        $.map_expression,
        $.constructor_expression,
        $.list_expression,
        $.call_expression,
        $.value_path,
        $.identifier,
      ),

    // ctor ::= type "{" (field ":" value)* "}" — the type name resolves like
    // any other type reference, so a qualified ctor reuses qualified_type.
    constructor_expression: ($) =>
      seq(field('type', $._type_name), field('body', $.constructor_body)),

    constructor_body: ($) => seq('{', commaSep($.constructor_field), '}'),

    constructor_field: ($) =>
      seq(field('name', $.identifier), ':', field('value', $._test_value)),

    list_expression: ($) => seq('[', commaSep($._test_value), ']'),

    // map ::= "{" (key ":" value),* "}" — a headless brace in value position
    // is a string-keyed map (headers); the key may be written bare or quoted.
    map_expression: ($) => seq('{', commaSep($.map_entry), '}'),

    map_entry: ($) =>
      seq(
        field('key', choice($.string, alias($.identifier, $.map_key))),
        ':',
        field('value', $._test_value),
      ),

    boolean: ($) => choice('true', 'false'),

    // call ::= (receiver ".")? name "(" value? ")" — the receiver form calls
    // an op on a constructed entry binding; the bare form calls a contract
    // declaration, which belongs to no entry.
    call_expression: ($) =>
      seq(
        optional(seq(field('receiver', $.identifier), '.')),
        field('function', $.identifier),
        field('arguments', $.call_arguments),
      ),

    call_arguments: ($) => seq('(', commaSep($._test_value), ')'),

    // path ::= base "." field+ — dataflow between bindings (saved.id) or a
    // stub projection (s.requests).
    value_path: ($) =>
      seq(
        field('base', $.identifier),
        repeat1(seq('.', alias($.identifier, $.field_name))),
      ),

    // ── Test patterns ───────────────────────────────────────────────────

    // A pattern is the ctor form plus three marks in value position: ".."
    // (unlisted fields are unchecked; last element of a body), "any" (field
    // present, value free) and "None" (field absent). Literals, paths and a
    // bare name (ok) are also patterns.
    _test_pattern: ($) =>
      choice(
        $.string,
        $.multiline_string,
        $.integer,
        $.float_literal,
        $.boolean,
        $.constructor_pattern,
        $.map_pattern,
        $.list_pattern,
        $.any_pattern,
        $.none_pattern,
        $.value_path,
        $.identifier,
      ),

    constructor_pattern: ($) =>
      seq(
        field('type', $._type_name),
        field('body', $.constructor_pattern_body),
      ),

    constructor_pattern_body: ($) =>
      seq(
        '{',
        optional(
          choice(
            seq(
              commaSep1($.field_pattern),
              optional(seq($.rest_pattern, optional(','))),
            ),
            seq($.rest_pattern, optional(',')),
          ),
        ),
        '}',
      ),

    field_pattern: ($) =>
      seq(field('name', $.identifier), ':', field('value', $._test_pattern)),

    rest_pattern: ($) => '..',

    any_pattern: ($) => 'any',

    none_pattern: ($) => 'None',

    list_pattern: ($) => seq('[', commaSep($._test_pattern), ']'),

    // A headless brace in pattern position is a map subset (a header map):
    // ".." is tolerated anywhere, since a map pattern is a subset by name
    // either way.
    map_pattern: ($) =>
      seq('{', repeat(choice($.map_entry_pattern, $.rest_pattern, ',')), '}'),

    map_entry_pattern: ($) =>
      seq(
        field('key', choice($.string, alias($.identifier, $.map_key))),
        ':',
        field('value', $._test_pattern),
      ),

    visibility: ($) => 'pub',

    // generics ::= "[" name ("," name)* "]"
    type_parameters: ($) =>
      seq('[', commaSep1(alias($.identifier, $.type_parameter)), ']'),

    // ── Bodies ──────────────────────────────────────────────────────────

    // Members are whitespace-separated; stray commas between them are tolerated
    // to match the hand-written parser, which skips commas in a shape body.
    // A struct that declares operations in its body is an entry: the role comes
    // from the content, not from a keyword.
    struct_body: ($) =>
      seq(
        '{',
        repeat(
          choice($.member, alias($._entry_operation, $.operation_declaration), ','),
        ),
        '}',
      ),

    // member ::= trait* name ":" type ( inline_trait | "=" (match | call | handle_call) )*
    // Traits above the member belong to it. On its line, the value is a
    // selection table, a library call ("= ns.fn(...)") or a handle method
    // call ("= .provider.get()"); a trait may sit before or after it
    // ("@with = ns.fn(...)" reads as well as "= ns.fn(...) @with"), which is
    // why the two interleave here. prec.right keeps an inline "@" after the
    // type on this member rather than opening the next one.
    member: ($) =>
      prec.right(
        seq(
          repeat($.trait),
          field('name', $.identifier),
          ':',
          field('type', $._type),
          repeat(choice(inlineTrait($), $._member_value)),
        ),
      ),

    _member_value: ($) =>
      seq(
        '=',
        field(
          'value',
          choice($.match_expression, $.library_call, $.handle_method_call),
        ),
      ),

    // match ::= "match" (ref | ref "[" ref "]") "{" (pattern "=>" value)* "}"
    // — the selection table of an entry or config field. "match" is a
    // contextual identifier for the same reason the extension kind is: the
    // lexer does not reserve it. The subject may also be a map field indexed
    // by another in-scope field ("by_segment[.seg]"), which resolves to an
    // optional value; "null" (a bare match_pattern_name, nothing new at the
    // grammar level) is then the arm required for the absent case, and "._"
    // (an ordinary field_reference naming "_") is the arm value referring
    // back to the subject.
    match_expression: ($) =>
      seq(
        alias($.identifier, $.match_keyword),
        field('subject', $._match_subject),
        field('body', $.match_body),
      ),

    _match_subject: ($) => choice($.field_reference, $.indexed_field_reference),

    // "base[key]": a map field indexed by another field's value. Only valid
    // in match-subject position — this alternative does not widen where an
    // ordinary field_reference is accepted elsewhere in the grammar.
    indexed_field_reference: ($) =>
      seq(field('base', $.field_reference), '[', field('key', $.field_reference), ']'),

    match_body: ($) => seq('{', repeat(choice($.match_arm, ',')), '}'),

    // arm ::= pattern "=>" (ref | literal | source traits)
    match_arm: ($) =>
      seq(field('pattern', $._match_pattern), '=>', field('value', $._match_value)),

    _match_pattern: ($) =>
      choice($.string, $.integer, alias($.identifier, $.match_pattern_name)),

    _match_value: ($) =>
      choice($.field_reference, $.string, $.integer, $.identifier, repeat1($.trait)),

    // ref ::= "." name ("." name)* — a field reference, possibly a path into a
    // structured field.
    field_reference: ($) =>
      seq('.', alias($.identifier, $.field_name), repeat(seq('.', alias($.identifier, $.field_name)))),

    // Cases and variants are whitespace-separated like members; commas are
    // tolerated the way the hand-written parser skips them.
    enum_body: ($) => seq('{', repeat(choice($.enum_case, ',')), '}'),

    // case ::= trait* name ("=" int)? inline_trait*
    enum_case: ($) =>
      prec.right(
        seq(
          repeat($.trait),
          field('name', $.identifier),
          optional(seq('=', field('value', $.integer))),
          repeat(inlineTrait($)),
        ),
      ),

    union_body: ($) => seq('{', repeat(choice($.variant, ',')), '}'),

    // variant ::= trait* name ( "(" type ")" )? inline_trait*
    variant: ($) =>
      prec.right(
        seq(
          repeat($.trait),
          field('name', $.identifier),
          optional($.variant_payload),
          repeat(inlineTrait($)),
        ),
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

    // trait ::= "@" name ("::" name)* ( "(" arg ("," arg)* ")" )?
    // The "::" segments name a builtin catalog entry (e.g. @str::trim). The
    // frontend keeps the separator inside the trait id, so the whole path is one
    // token here too. A leading position (before a declaration or a body
    // item) takes a trait on either kind of line; an inline position (after a
    // signature, a member, a case, a variant, or a union head) takes only the
    // `_inline_trait` form, through `inlineTrait`.
    trait: ($) => choice($._own_line_trait, $._inline_trait),

    _own_line_trait: ($) =>
      seq(
        alias($._own_line_at, '@'),
        field('name', $.trait_name),
        optional($.trait_arguments),
      ),

    _inline_trait: ($) =>
      seq(
        alias($._inline_at, '@'),
        field('name', $.trait_name),
        optional($.trait_arguments),
      ),

    trait_name: ($) =>
      token(seq(/[A-Za-z_][A-Za-z0-9_]*/, repeat(seq('::', /[A-Za-z_][A-Za-z0-9_]*/)))),

    trait_arguments: ($) => seq('(', commaSep($.trait_argument), ')'),

    // arg ::= key ":" value | value
    trait_argument: ($) => choice($.key_value, $._trait_value),

    key_value: ($) =>
      seq(field('key', $.identifier), ':', field('value', $._trait_value)),

    // A value position accepts a literal, a field reference, a struct literal
    // (@body(note_body { title: .x })), a library call (auth.sign(.request))
    // or (inside a string) a template of references: the rule belongs to the
    // language, not to any single trait.
    _trait_value: ($) =>
      choice(
        $.string,
        $.multiline_string,
        $.integer,
        $.float_literal,
        $.identifier,
        $.field_reference,
        $.struct_literal,
        $.library_call,
      ),

    // ── Literals and lexical ────────────────────────────────────────────

    string: ($) =>
      seq(
        '"',
        repeat(
          choice(
            $._string_content,
            $.escape_sequence,
            $.field_placeholder,
            $.input_placeholder,
          ),
        ),
        '"',
      ),

    // "{.field}" resolves against the entry at construction; "{member}" against
    // the operation input on each call. Two scopes, one template.
    field_placeholder: ($) =>
      token.immediate(
        prec(2, /\{\.[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*\}/),
      ),

    input_placeholder: ($) =>
      token.immediate(prec(2, /\{[A-Za-z_][A-Za-z0-9_]*\}/)),

    // Stops before "{" so a placeholder can start there; a brace that opens no
    // placeholder is ordinary content.
    _string_content: ($) => token.immediate(prec(1, /[^"\\\n{]+|\{/)),

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

    ...libraryRules,
  },
});
