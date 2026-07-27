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
