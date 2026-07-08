; Keywords
[
  "struct"
  "enum"
  "union"
  "op"
  "map"
] @keyword

(visibility) @keyword.modifier

; Declaration names
(struct_declaration name: (identifier) @type.definition)
(enum_declaration name: (identifier) @type.definition)
(union_declaration name: (identifier) @type.definition)
(operation_declaration name: (identifier) @function)

(type_parameter) @type.parameter

; Members, cases, variants
(member name: (identifier) @property)
(enum_case name: (identifier) @constant)
(variant name: (identifier) @constructor)

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
(integer) @number
(float) @number.float

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
  ":"
  ","
  "="
] @punctuation.delimiter
