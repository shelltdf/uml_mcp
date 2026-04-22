import { describe, expect, it } from 'vitest';
import {
  buildClassDiagramViewPayload,
  extractClassDiagramSourceFromPayload,
  parseViewPayloadClassDiagram,
  serializeClassDiagramBody,
} from '../src/classDiagramModel.js';

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

  it('buildClassDiagramViewPayload returns plain mermaid body only', () => {
    const prev = `classDiagram
  class A
`;
    const { state, positions, folded, edgeVisibility } = parseViewPayloadClassDiagram(prev);
    const next = buildClassDiagramViewPayload(prev, state, positions, folded, edgeVisibility);
    expect(next.trimStart().startsWith('classDiagram')).toBe(true);
    expect(next).not.toContain('<!-- uml-class-diagram-layout:');
    const again = parseViewPayloadClassDiagram(next);
    expect(again.state.classes.length).toBe(state.classes.length);
  });

  it('serializeClassDiagramBody starts with classDiagram', () => {
    const { state } = parseViewPayloadClassDiagram('');
    const body = serializeClassDiagramBody(state);
    expect(body.trimStart().startsWith('classDiagram')).toBe(true);
  });

  it('serializeClassDiagramBody does not emit class member bodies', () => {
    const src = `classDiagram
  class Foo {
    +int id
    +getName()
  }
`;
    const { state } = parseViewPayloadClassDiagram(src);
    const body = serializeClassDiagramBody(state);
    expect(body).toContain('class Foo');
    expect(body).not.toContain('{');
    expect(body).not.toContain('+int id');
    expect(body).not.toContain('+getName()');
  });

  it('old payload with member body is compatible but saved payload is minimized', () => {
    const oldPayload = `classDiagram
  class Order {
    -id: string
    +create()
  }
`;
    const parsed = parseViewPayloadClassDiagram(oldPayload);
    expect(parsed.state.classes[0]?.attributes.length).toBeGreaterThan(0);
    expect(parsed.state.classes[0]?.methods.length).toBeGreaterThan(0);
    const next = buildClassDiagramViewPayload(
      oldPayload,
      parsed.state,
      parsed.positions,
      parsed.folded,
      parsed.edgeVisibility,
    );
    expect(next).toContain('class Order');
    expect(next).not.toContain('{');
    expect(next).not.toContain('-id: string');
    expect(next).not.toContain('+create()');
  });
});
