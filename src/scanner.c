// The frontend parser decides which item a trait belongs to by layout: a
// trait opening a line of its own belongs to the declaration or body item
// after it, a trait continuing a line belongs to that line. tree-sitter's
// own lexer skips whitespace before it sees "@", so the distinction is made
// here, where the line breaks are still visible: "@" lexes as one of two
// tokens, and the grammar allows each where the frontend does.
#include "tree_sitter/parser.h"

enum TokenType { INLINE_AT, OWN_LINE_AT };

void *tree_sitter_tono_external_scanner_create(void) { return NULL; }

void tree_sitter_tono_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_tono_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_tono_external_scanner_deserialize(void *payload, const char *buffer,
                                                   unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_tono_external_scanner_scan(void *payload, TSLexer *lexer,
                                            const bool *valid_symbols) {
  (void)payload;
  if (!valid_symbols[INLINE_AT] && !valid_symbols[OWN_LINE_AT]) return false;
  // The scanner runs before any whitespace is skipped, so a line break on the
  // way to "@" is seen here. The first token of the file opens its line too.
  bool own_line = lexer->get_column(lexer) == 0;
  for (;;) {
    int32_t c = lexer->lookahead;
    if (c == '\n') {
      own_line = true;
      lexer->advance(lexer, true);
    } else if (c == ' ' || c == '\t' || c == '\r') {
      lexer->advance(lexer, true);
    } else {
      break;
    }
  }
  // A comment is a token of its own (an extra), so it is left to the regular
  // lexer; the scanner runs again after it, at the line break that ends it.
  if (lexer->lookahead != '@') return false;
  lexer->advance(lexer, false);
  lexer->mark_end(lexer);
  if (own_line) {
    if (!valid_symbols[OWN_LINE_AT]) return false;
    lexer->result_symbol = OWN_LINE_AT;
  } else {
    if (!valid_symbols[INLINE_AT]) return false;
    lexer->result_symbol = INLINE_AT;
  }
  return true;
}
