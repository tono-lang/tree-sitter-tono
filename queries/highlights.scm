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
