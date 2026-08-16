; Keywords
[
  "struct"
  "enum"
  "union"
  "op"
  "map"
  "ext"
] @keyword

[
  "import"
  "as"
] @keyword.import

(visibility) @keyword.modifier

; The extension kind word (hook | contract | constraint | impl) and the "raw"
; marker after an impl name read as keywords.
(extension_kind) @keyword
(extension_raw) @keyword

; The selection table reads as a conditional: it is the only branching form.
(match_keyword) @keyword.conditional

; Foreign libraries. "extern" and "type" are keywords only inside an ext
; body, the binding words only inside a language block, "impl" only after an
; op's traits; everywhere else they lex as ordinary identifiers.
[
  "extern"
  "type"
  "impl"
] @keyword

[
  "call"
  "yields"
  "returns"
  "errors"
] @keyword

; The convention markers name a departure from the target's own calling
; convention, so they read as modifiers, like "pub".
(sync_marker) @keyword.modifier
(infallible_marker) @keyword.modifier

; The reserved error position in a yields list is a builtin, not a tono type.
(error_sentinel) @type.builtin

; Test declarations. "test" only exists as a token in top-level position, and
; "stub"/"expect" only inside a test body, so the same words highlight as
; ordinary identifiers everywhere else.
[
  "test"
  "stub"
  "expect"
] @keyword

; Declaration names
(struct_declaration name: (identifier) @type.definition)
(enum_declaration name: (identifier) @type.definition)
(union_declaration name: (identifier) @type.definition)
(operation_declaration name: (identifier) @function)
(extension_declaration name: (identifier) @function)
(qualified_operation operation: (identifier) @function)
(entry_name) @type

; A library is a namespace: its name reads as a module wherever it appears
; (declaration, call, stub target). Foreign shapes and handles are types; the
; per-language block is keyed by the target name, which reads as a property
; like the legacy "ts:" binding key does.
(library_name) @module
(language_name) @property
(foreign_type_name) @type
(foreign_field_name) @property
(extern_declaration name: (identifier) @function)
(extern_parameter name: (identifier) @variable.parameter)
(yields_position name: (identifier) @variable)
(returns_field name: (identifier) @property)
(error_mapping type: (type_identifier) @type)
(library_call function: (identifier) @function.call)
(parameter_name) @variable.parameter
(struct_literal_field name: (identifier) @property)
(stub_target function: (identifier) @function)

; The foreign symbol is a string literal by design: the origin of a call must
; be visible, so it must never take the color of a tono identifier. It gets
; the special-string reading rather than the plain one.
(foreign_symbol) @string.special

(type_parameter) @type.parameter

; Modules
(module_segment) @module
(module_qualifier) @module
(import_declaration alias: (identifier) @module)

; Members, cases, variants, bindings
(member name: (identifier) @property)
(enum_case name: (identifier) @constant)
(variant name: (identifier) @constructor)
(extension_binding key: (identifier) @property)

; A field reference names a sibling field of the entry, so it reads like the
; member it points at. The wildcard arm is the one pattern that is not a value.
(field_name) @property

; The last segment of an impl target is the handle method being called; the
; ones before it are the receiver fields. This must follow the field_name
; capture above so the method reading wins.
(operation_impl target: (field_reference (field_name) @function.call .))

(match_pattern_name) @constant

((match_pattern_name) @character.special
  (#eq? @character.special "_"))

; Test bindings and their uses read as variables; the pieces of a stub target
; keep the reading of what they name (the op, the dependency field). The ctor
; type name is already covered by the type captures below.
(test_binding name: (identifier) @variable)
(stub_declaration binding: (identifier) @variable)
(stub_target binding: (identifier) @variable)
(stub_target operation: (identifier) @function)
(stub_target dependency: (identifier) @property)
(expect_declaration subject: (identifier) @variable)
(value_path base: (identifier) @variable)
(call_expression receiver: (identifier) @variable)
(call_expression function: (identifier) @function.call)
(constructor_field name: (identifier) @property)
(field_pattern name: (identifier) @property)
(map_key) @property
(boolean) @boolean

; Pattern marks: "any" is the value wildcard (like the "_" arm), "None" the
; builtin absence constant, ".." releases the unlisted fields.
(any_pattern) @character.special
(none_pattern) @constant.builtin
(rest_pattern) @punctuation.special

; Types
(primitive_type) @type.builtin
(type_identifier) @type
(nullable) @punctuation.special

; Traits (attributes)
(trait "@" @attribute)
(trait_name) @attribute
(key_value key: (identifier) @property)

; Literals
(string) @string
(multiline_string) @string
(escape_sequence) @string.escape
(field_placeholder) @string.special
(input_placeholder) @string.special
(integer) @number
(float_literal) @number.float

; Comments
(comment) @comment @spell

; Punctuation
[
  "{"
  "}"
] @punctuation.bracket

[
  "["
  "]"
] @punctuation.bracket

[
  "("
  ")"
] @punctuation.bracket

[
  "->"
  "=>"
] @operator

[
  ":"
  ","
  "="
  "."
] @punctuation.delimiter
