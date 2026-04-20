import { describe, expect, it } from 'vitest';
import {
  buildClassDiagramViewPayload,
  extractClassDiagramSourceFromPayload,
  parseViewPayloadClassDiagram,
  serializeClassDiagramBody,
} from '../src/mermaid/classDiagramModel.js';

describe('parseViewPayloadClassDiagram', () => {
  it('parses bare classDiagram body', () => {
    const src = `classDiagram
  class Foo {
    +int x
  }
`;
    const { state } = parseViewPayloadClassDiagram(src);
    expect(state.classes.some((c) => c.name === 'Foo')).toBe(true);
  });

  it('extracts body from fenced mermaid in payload', () => {
    const payload = 'Intro\n\n```mermaid\nclassDiagram\n  class Bar\n```\n';
    expect(extractClassDiagramSourceFromPayload(payload)?.trim()).toMatch(/^classDiagram/);
  });

  it('round-trips layout comment via buildClassDiagramViewPayload', () => {
    const prev = `classDiagram
  class A
`;
    const { state, positions, folded, edgeVisibility } = parseViewPayloadClassDiagram(prev);
    const next = buildClassDiagramViewPayload(prev, state, positions, folded, edgeVisibility);
    expect(next).toContain('<!-- uml-class-diagram-layout:');
    const again = parseViewPayloadClassDiagram(next);
    expect(again.state.classes.length).toBe(state.classes.length);
  });

  it('serializeClassDiagramBody starts with classDiagram', () => {
    const { state } = parseViewPayloadClassDiagram('');
    const body = serializeClassDiagramBody(state);
    expect(body.trimStart().startsWith('classDiagram')).toBe(true);
  });
});
