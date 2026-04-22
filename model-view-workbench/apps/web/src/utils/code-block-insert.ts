import type { MvModelSqlPayload, MvViewKind, MvViewPayload } from '@mvwb/core';
import { MV_UML_KIND_DIAGRAM_TYPE, isMermaidViewKind, parseMarkdownBlocks, resolveRefPath } from '@mvwb/core';
import type { AppLocale } from '../i18n/app-locale';
import {
  defaultInterfaceModelGroupTitle,
  defaultKvModelGroupTitle,
  defaultSqlModelGroupTitle,
  defaultSqlPrimaryTableTitle,
  defaultStructModelGroupTitle,
} from '../i18n/model-block-insert-defaults';
import { mvViewKindDefaultBlockTitle, mvViewKindStrings } from '../i18n/mv-view-kind-locale';

/** 可通过「插入代码块」对话框插入的围栏类型（各 mv-model* 或各 mv-view kind） */
export type InsertCodeBlockKind =
  | MvViewKind
  | 'mv-model-sql'
  | 'mv-model-kv'
  | 'mv-model-struct'
  | 'mv-model-codespace'
  | 'mv-model-interface';

export interface InsertFenceContext {
  /** 当前 view 将写入的 .md 工作区相对路径（用于生成 ref: 示例路径） */
  currentFileRel: string;
  /** 当前文档全文（用于探测同文件已有 mv-model-sql） */
  currentMarkdown: string;
  /** 影响插入的 mv-view 默认 title / payload 占位等；缺省为 zh */
  locale?: AppLocale;
}

function newBlockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildUmlDefaultPayload(kind: MvViewKind): Record<string, unknown> | null {
  const diagramType = MV_UML_KIND_DIAGRAM_TYPE[kind];
  if (!diagramType) return null;
  const base: Record<string, unknown> = {
    schema: 'mvwb-uml/v1',
    diagramType,
  };
  if (kind === 'uml-class') {
    base.classes = [{ id: 'ClassA', name: 'ClassA' }];
    base.relations = [];
  }
  return base;
}

/** 为新建 mv-view 推断默认 modelRefs：优先同文件首个 mv-model-sql 的首张表（块id#表id）；否则 ref: 模板 */
export function inferDefaultModelRefs(ctx: InsertFenceContext): string[] {
  const { blocks } = parseMarkdownBlocks(ctx.currentMarkdown);
  for (const b of blocks) {
    if (b.kind === 'mv-model-sql') {
      const p = b.payload as MvModelSqlPayload;
      const t0 = p.tables[0];
      if (t0) return [`${p.id}#${t0.id}`];
    }
  }
  const rel = ctx.currentFileRel.replace(/\\/g, '/');
  const targetRel = resolveRefPath(rel, 'models.md');
  return [`ref:${targetRel}#YOUR_MODEL_BLOCK_ID#YOUR_TABLE_ID`];
}

/** 在光标处插入的围栏 Markdown（前后各留空行，便于解析） */
export function buildFenceMarkdownForInsert(kind: InsertCodeBlockKind, ctx: InsertFenceContext): string {
  const loc = ctx.locale ?? 'zh';
  if (kind === 'mv-model-sql') {
    const id = newBlockId('sql');
    const body = {
      id,
      title: defaultSqlModelGroupTitle(loc),
      tables: [
        {
          id: 'main',
          title: defaultSqlPrimaryTableTitle(loc),
          columns: [{ name: 'id', type: 'string', primaryKey: true, nullable: false }],
          rows: [{ id: '1' }],
        },
      ],
    };
    return `\n\n\`\`\`mv-model-sql\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  if (kind === 'mv-model-kv') {
    const id = newBlockId('kv');
    const body = {
      id,
      title: defaultKvModelGroupTitle(loc),
      documents: [{ _id: '1', note: '示例文档，键可自由增删' }],
    };
    return `\n\n\`\`\`mv-model-kv\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  if (kind === 'mv-model-struct') {
    const id = newBlockId('st');
    const body = {
      id,
      title: defaultStructModelGroupTitle(loc),
      root: {
        name: '/',
        attributes: { format: 'mv-model-struct v1' },
        groups: [{ name: 'run0', datasets: [{ name: 'values', dtype: 'float64', data: [1, 2, 3] }] }],
      },
    };
    return `\n\n\`\`\`mv-model-struct\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  if (kind === 'mv-model-codespace') {
    const id = newBlockId('cs');
    const body = {
      id,
      title: 'New codespace model',
      workspaceRoot: '.',
      modules: [
        {
          id: 'core',
          name: 'CoreLib',
          path: 'packages/core',
          role: 'lib',
          notes: 'Parser and types (sample)',
          namespaces: [
            {
              id: 'ns-core-root',
              name: 'Core',
              classes: [
                {
                  id: 'cls-service',
                  name: 'Service',
                  kind: 'class',
                  members: [],
                  methods: [{ name: 'run', visibility: 'public', virtual: true, signature: 'void run()' }],
                },
              ],
            },
          ],
        },
        {
          id: 'web',
          name: 'WebShell',
          path: 'apps/web',
          role: 'app',
          notes: 'Workbench frontend (sample)',
        },
      ],
    };
    return `\n\n\`\`\`mv-model-codespace\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  if (kind === 'mv-model-interface') {
    const id = newBlockId('if');
    const body = {
      id,
      title: defaultInterfaceModelGroupTitle(loc),
      endpoints: [
        {
          id: 'health',
          name: '健康检查',
          method: 'GET',
          path: '/health',
          notes: '存活探针（示意）',
        },
        {
          id: 'users',
          name: '用户列表',
          method: 'GET',
          path: '/api/users',
          notes: '分页查询（示意）',
        },
      ],
    };
    return `\n\n\`\`\`mv-model-interface\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  const id = newBlockId('v');
  const meta = mvViewKindStrings(kind, loc);
  const ph = meta.payloadPlaceholder;
  const skipPayload = ph.startsWith('（');
  const title = mvViewKindDefaultBlockTitle(kind, loc);

  const obj: MvViewPayload = {
    id,
    kind,
    modelRefs: kind === 'mindmap-ui' ? [] : inferDefaultModelRefs(ctx),
    title,
  };
  /** `mermaid-*`：JSON 内不写正文，仅紧随的 `` ```mermaid `` 承载源码（解析器会回填 `payload`）。 */
  let mermaidMirrorBody = '';
  if (isMermaidViewKind(kind)) {
    obj.payload = '';
    if (!skipPayload && ph && !ph.startsWith('（')) {
      mermaidMirrorBody = ph;
    }
  } else {
    const umlPayload = buildUmlDefaultPayload(kind);
    if (umlPayload) {
      obj.payload = umlPayload;
    } else if (kind === 'mindmap-ui') {
      obj.payload = {
        format: 'mv-mindmap-v0',
        nodes: [
          { id: 'root', label: 'Root' },
          { id: 'topic_1', label: 'Topic 1', parentId: 'root' },
        ],
      };
    } else if (!skipPayload && ph && !ph.startsWith('（')) {
      obj.payload = ph;
    }
  }
  const inner = JSON.stringify(obj, null, 2);
  const mvFence = `\n\n\`\`\`mv-view\n${inner}\n\`\`\`\n\n`;
  if (isMermaidViewKind(kind)) {
    return `${mvFence}\`\`\`mermaid\n${mermaidMirrorBody}\n\`\`\`\n\n`;
  }
  return mvFence;
}
