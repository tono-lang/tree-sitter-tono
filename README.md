# tree-sitter-tono

tree-sitter grammar for `.tono`: highlighting and incremental parsing in editors
(Neovim, Zed, Helix) and on GitHub.

This is a highlight-only grammar. The source of truth for the accepted surface is
the frontend's hand-written recursive-descent parser; this grammar tracks it so
editors get fast, incremental highlighting without depending on the compiler.
When the parser's surface changes, update `grammar.js` and the corpus to match.

The grammar is a deliberate superset: it already recognizes modules (`import`,
qualified type references) and extensions (`ext`), which live in in-progress
frontend work and are not yet accepted by the released parser. Highlighting a
slightly broader surface is intentional; it never rejects valid `.tono`.

## Layout

- `grammar.js`: the grammar definition.
- `queries/highlights.scm`: highlight captures.
- `tree-sitter.json`: grammar metadata (scope, file types, query paths).
- `src/`: the generated parser (`parser.c`, `grammar.json`, `node-types.json`).
- `bindings/`: language bindings (node, rust, c).
- `test/corpus/`: parse tests (input plus expected syntax tree).
- `test/highlight/`: highlight assertions.

## Publishing

Bump the version first, then tag:

```sh
tree-sitter version X.Y.Z   # updates tree-sitter.json, package.json, Cargo.toml together
git commit -am "Release vX.Y.Z"
git tag vX.Y.Z && git push --tags
```

The bump is not optional. npm and crates.io publish whatever version the
manifests declare, not what the tag says, so tagging without bumping either
republishes an existing version (which both registries reject) or ships the
wrong number.

The tag runs `.github/workflows/release.yml`, which publishes a GitHub Release
and the Node (npm) and Rust (crates.io) bindings automatically, via the shared
[tree-sitter/workflows](https://github.com/tree-sitter/workflows) reusable
workflows. This repo's `NPM_TOKEN` and `CARGO_REGISTRY_TOKEN` secrets must be
configured for the npm/crates.io jobs to succeed.

## Update

- npm: `npm update tree-sitter-tono`
- Cargo: `cargo update -p tree-sitter-tono`

## Development

Requires the [tree-sitter CLI](https://tree-sitter.github.io/tree-sitter/).

```sh
tree-sitter generate        # regenerate src/ from grammar.js
tree-sitter test            # run corpus and highlight tests
tree-sitter parse file.tono # inspect the parse tree for a file
```

After editing `grammar.js`, run `tree-sitter generate` and commit the updated
`src/` alongside it.

## Bindings

The generated parser is consumable from several ecosystems:

```sh
tree-sitter build   # build a shared library from src/parser.c
cargo build         # build the Rust binding
npm install         # build the Node binding
```

## Language surface

Declarations: `struct`, `enum`, `union`, `op`, and `ext`, each optionally `pub`
and preceded by traits (`@name(args)`). Structs and unions may carry generic type
parameters.

Types cover primitives, named and generic types, cross-module references
(`module.Name`), lists (`[]T`), maps (`map[K]V`), and nullables (`T?`).

Modules use `import path.segments as alias`, referenced through a qualifier on
type names.

Extensions bind bespoke behavior: `ext hook name(input) -> output { lang: "file#symbol" }`,
with `contract` and `constraint` kinds and a reserved `conformance` key.

Strings are single-line (with escapes) or triple-quoted (multi-line).
