// tree-sitter grammar for the Tono language (initial placeholder).
module.exports = grammar({
  name: 'tono',
  extras: $ => [/\s/, $.comment],
  rules: {
    source_file: $ => repeat($._definition),
    _definition: $ => $.comment,
    comment: $ => token(seq('//', /.*/)),
  },
});
