import type { ParseMdResult } from '../../types.js';
import { parseMarkdownBlocks as parseMarkdownBlocksLegacy } from '../../parse/blocks.js';

export class MarkdownBlockParser {
  public parse(source: string): ParseMdResult {
    return parseMarkdownBlocksLegacy(source);
  }
}
