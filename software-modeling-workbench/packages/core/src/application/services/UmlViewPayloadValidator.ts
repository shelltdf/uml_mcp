import type { MvViewKind } from '../../types.js';
import { UmlDiagramTypePolicy } from '../../domain/uml/UmlDiagramTypePolicy.js';

export type ValidationResult = { ok: true } | { ok: false; message: string };

export class UmlViewPayloadValidator {
  public constructor(private readonly policy = new UmlDiagramTypePolicy()) {}

  public validate(kind: MvViewKind, payload: unknown): ValidationResult {
    if (!this.policy.isUmlKind(kind)) return { ok: true };
    if (payload === undefined || payload === null) return { ok: true };

    if (typeof payload === 'string') {
      const s = payload.trim();
      if (!s) return { ok: true };
      let parsed: unknown;
      try {
        parsed = JSON.parse(s);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, message: `smw-view: ${kind} payload must be valid JSON (${msg})` };
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, message: `smw-view: ${kind} payload must be a JSON object` };
      }
      return this.validateObject(kind, parsed as Record<string, unknown>);
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, message: `smw-view: ${kind} payload must be a JSON object or JSON string` };
    }
    return this.validateObject(kind, payload as Record<string, unknown>);
  }

  private validateObject(kind: MvViewKind, payload: Record<string, unknown>): ValidationResult {
    const expectedDiagramType = this.policy.expectedDiagramType(kind);
    if (!expectedDiagramType) return { ok: true };

    if (payload.schema !== 'smw-uml/v1') {
      return { ok: false, message: `smw-view: ${kind} payload.schema must be "smw-uml/v1"` };
    }
    if (payload.diagramType !== expectedDiagramType) {
      return { ok: false, message: `smw-view: ${kind} payload.diagramType must be "${expectedDiagramType}"` };
    }

    if (kind === 'uml-class') {
      const classesCheck = this.validateClassEntities(payload);
      if (!classesCheck.ok) return classesCheck;
      const relationCheck = this.validateClassRelations(payload);
      if (!relationCheck.ok) return relationCheck;
    }

    return { ok: true };
  }

  private validateClassEntities(payload: Record<string, unknown>): ValidationResult {
    if (!('classes' in payload) || payload.classes === undefined) return { ok: true };
    if (!Array.isArray(payload.classes)) {
      return { ok: false, message: 'smw-view: uml-class payload.classes must be an array when present' };
    }
    for (let i = 0; i < payload.classes.length; i++) {
      const c = payload.classes[i];
      const p = `smw-view: uml-class payload.classes[${i}]`;
      if (!c || typeof c !== 'object' || Array.isArray(c)) return { ok: false, message: `${p} must be an object` };
      const co = c as Record<string, unknown>;
      if (typeof co.id !== 'string' || !co.id.trim()) return { ok: false, message: `${p}.id must be a non-empty string` };
      if (typeof co.name !== 'string' || !co.name.trim()) return { ok: false, message: `${p}.name must be a non-empty string` };
    }
    return { ok: true };
  }

  private validateClassRelations(payload: Record<string, unknown>): ValidationResult {
    if (!('relations' in payload) || payload.relations === undefined) return { ok: true };
    if (!Array.isArray(payload.relations)) {
      return { ok: false, message: 'smw-view: uml-class payload.relations must be an array when present' };
    }
    for (let i = 0; i < payload.relations.length; i++) {
      const r = payload.relations[i];
      const p = `smw-view: uml-class payload.relations[${i}]`;
      if (!r || typeof r !== 'object' || Array.isArray(r)) return { ok: false, message: `${p} must be an object` };
      const ro = r as Record<string, unknown>;
      if (typeof ro.id !== 'string' || !ro.id.trim()) return { ok: false, message: `${p}.id must be a non-empty string` };
      if (typeof ro.from !== 'string' || !ro.from.trim()) return { ok: false, message: `${p}.from must be a non-empty string` };
      if (typeof ro.to !== 'string' || !ro.to.trim()) return { ok: false, message: `${p}.to must be a non-empty string` };
      if ('kind' in ro && ro.kind !== undefined) {
        if (typeof ro.kind !== 'string' || !new Set(['inherit', 'association', 'dependency']).has(ro.kind)) {
          return { ok: false, message: `${p}.kind must be one of: inherit, association, dependency` };
        }
      }
    }
    return { ok: true };
  }
}
