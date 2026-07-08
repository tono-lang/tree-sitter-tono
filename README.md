# tree-sitter-tono

tree-sitter grammar for `.tono`: highlighting and incremental parsing in editors
(Neovim, Zed, Helix) and on GitHub.

This is a highlight-only grammar. The source of truth for the accepted surface
is the frontend's hand-written recursive-descent parser; this grammar mirrors it
so editors get fast, incremental highlighting without depending on the compiler.
When the parser's surface changes, update `grammar.js` and the corpus to match.

## Layout

- `grammar.js` — the grammar definition.
- `queries/highlights.scm` — highlight captures.
- `tree-sitter.json` — grammar metadata (scope, file types, query paths).
- `src/` — the generated parser (`parser.c`, `grammar.json`, `node-types.json`).
- `test/corpus/` — parse tests (input plus expected syntax tree).
- `test/highlight/` — highlight assertions.

## Development

Requires the [tree-sitter CLI](https://tree-sitter.github.io/tree-sitter/).

```sh
tree-sitter generate        # regenerate src/ from grammar.js
tree-sitter test            # run corpus and highlight tests
tree-sitter parse file.tono # inspect the parse tree for a file
```

After editing `grammar.js`, run `tree-sitter generate` and commit the updated
`src/` alongside it.

## Language surface

Declarations: `struct`, `enum`, `union`, `op`, each optionally `pub` and preceded
by traits (`@name(args)`). Structs and unions may carry generic type parameters.
Types cover primitives, named and generic types, lists (`[]T`), maps (`map[K]V`),
and nullables (`T?`). Strings are single-line (with escapes) or triple-quoted
(multi-line).
