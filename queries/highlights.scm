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

; The extension kind word (hook | contract | constraint) reads as a keyword.
(extension_kind) @keyword

; Declaration names
(struct_declaration name: (identifier) @type.definition)
(enum_declaration name: (identifier) @type.definition)
(union_declaration name: (identifier) @type.definition)
(operation_declaration name: (identifier) @function)
(extension_declaration name: (identifier) @function)

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

"->" @operator

[
  ":"
  ","
  "="
  "."
] @punctuation.delimiter
