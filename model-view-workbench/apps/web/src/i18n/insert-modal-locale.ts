import {
  MV_MAP_CANVAS_TITLE,
  MV_MODEL_INTERFACE_CANVAS_TITLE,
  MV_MODEL_KV_CANVAS_TITLE,
  MV_MODEL_SQL_CANVAS_TITLE,
  MV_MODEL_STRUCT_CANVAS_TITLE,
  type MvViewKind,
} from '@mvwb/core';
import type { InsertCodeBlockKind } from '../utils/code-block-insert';
import type { AppLocale } from './app-locale';
import { mvViewKindStrings } from './mv-view-kind-locale';
import { shellChromeMessages } from './shell-chrome-messages';

export function insertModalTitle(locale: AppLocale): string {
  return locale === 'en' ? 'Insert fence block' : '插入代码块';
}

export function insertModalTocAria(locale: AppLocale): string {
  return locale === 'en' ? 'Type outline' : '类型大纲';
}

export function insertModalTocHeading(locale: AppLocale): string {
  return locale === 'en' ? 'Outline' : '大纲';
}

export function insertModalCancel(locale: AppLocale): string {
  return locale === 'en' ? 'Cancel' : '取消';
}

export function insertModalCloseTitle(locale: AppLocale): string {
  return locale === 'en' ? 'Close — no global shortcut' : '关闭 — 无全局快捷键';
}

export function insertModalJumpGroupTitle(locale: AppLocale, groupTitle: string): string {
  return locale === 'en'
    ? `Jump to “${groupTitle}” — no global shortcut`
    : `跳转到「${groupTitle}」— 无全局快捷键`;
}

export function insertModalPickCardTitle(locale: AppLocale, cardTitle: string): string {
  return locale === 'en'
    ? `Insert “${cardTitle}” fence block — no global shortcut`
    : `插入「${cardTitle}」围栏代码块 — 无全局快捷键`;
}

export function insertModalLeadHtml(locale: AppLocale): string {
  if (locale === 'en') {
    return `Model and View are stored in Markdown as <strong>fenced code blocks</strong> (languages include <code>mv-model-sql</code> / <code>mv-model-kv</code> /
            <code>mv-model-struct</code> / <code>mv-model-codespace</code> / <code>mv-model-interface</code> / <code>mv-view</code>); the inner body may be
            <strong>JSON</strong>, <strong>XML</strong>, or <strong>plain text</strong>, depending on the type. Pick a type below to insert a full fence at the caret; then select the block in the left outline and open the <strong>block canvas</strong> for structured or WYSIWYG editing (Rich or Source mode only).`;
  }
  return `Model 与 View 在 Markdown 中以<strong>围栏代码块</strong>落盘（围栏语言含 <code>mv-model-sql</code> / <code>mv-model-kv</code> /
            <code>mv-model-struct</code> / <code>mv-model-codespace</code> / <code>mv-model-interface</code> / <code>mv-view</code>）；块内正文可为
            <strong>JSON</strong>、<strong>XML</strong> 或<strong>纯文本</strong>等，由对应类型解释。选择下方类型后，将在光标处插入一整段围栏；插入后可在左侧代码块大纲选中块，并打开<strong>代码块画布</strong>做结构化或所见即所得编辑（须为「富文本」或「原始文本」模式）。`;
}

function canvasTitleForInsertCard(kind: InsertCodeBlockKind, locale: AppLocale): string {
  if (kind === 'mv-model-sql') return MV_MODEL_SQL_CANVAS_TITLE;
  if (kind === 'mv-model-kv') return MV_MODEL_KV_CANVAS_TITLE;
  if (kind === 'mv-model-struct') return MV_MODEL_STRUCT_CANVAS_TITLE;
  if (kind === 'mv-model-codespace') return shellChromeMessages[locale].canvasTitleMvModelCodespace;
  if (kind === 'mv-model-interface') return MV_MODEL_INTERFACE_CANVAS_TITLE;
  return mvViewKindStrings(kind as MvViewKind, locale).canvasTitle;
}

export function insertCardTitle(kind: InsertCodeBlockKind, locale: AppLocale): string {
  const en = locale === 'en';
  if (kind === 'mv-model-sql') return en ? 'SQL model' : 'SQL数据库';
  if (kind === 'mv-model-kv') return en ? 'KV store' : 'KV数据库';
  if (kind === 'mv-model-struct') return en ? 'Structured data' : '结构化数据库';
  if (kind === 'mv-model-codespace') return en ? 'Codespace' : '代码空间';
  if (kind === 'mv-model-interface') return en ? 'Interface' : '接口图';
  const raw = canvasTitleForInsertCard(kind, locale);
  let s = raw
    .replace(/\s*画布（/, '（')
    .replace(/画布$/, '')
    .replace(/\s*canvas\s*\(/i, ' (')
    .replace(/\s*canvas$/i, '')
    .trim();
  if (kind === 'uml-diagram' && !s.endsWith(en ? ' diagram' : '图')) {
    s = en ? `${s} diagram` : `${s}图`;
  }
  return s;
}

export function insertCardDesc(kind: InsertCodeBlockKind, locale: AppLocale): string {
  const en = locale === 'en';
  if (kind === 'mv-model-sql') {
    return en
      ? 'Insert ```mv-model-sql```: a **Model** group with multiple SQL-style tables (JSON); edit rows/columns in the canvas.'
      : '插入 ```mv-model-sql``` 围栏：**Model** 组，内含多张 SQL 风格表（JSON）；画布内可对子表增删改查，并编辑列与行。';
  }
  if (kind === 'mv-model-kv') {
    return en
      ? 'Insert ```mv-model-kv```: document collection (Mongo-like); edit JSON objects per row in the KV canvas.'
      : '插入 ```mv-model-kv``` 围栏：文档型集合（类比 MongoDB），每条为自由键的 JSON 对象；在 KV 数据表画布中编辑。';
  }
  if (kind === 'mv-model-struct') {
    return en
      ? 'Insert ```mv-model-struct```: recursive groups/datasets (HDF5-like); edit JSON in the struct canvas.'
      : '插入 ```mv-model-struct``` 围栏：根下递归「组 / 数据集」（类比 HDF5）；在结构化层次画布中编辑 JSON。';
  }
  if (kind === 'mv-model-codespace') {
    return en
      ? 'Insert ```mv-model-codespace```: workspace root and **modules[]** (optional namespaces, classifiers, etc.); edit in the codespace canvas.'
      : '插入 ```mv-model-codespace``` 围栏：工作区根与 **modules[]**（可选递归 **namespaces**、Classifier、bases、associations、变量/函数/宏，UML 风格示意）；在块画布的代码空间模型画布视图中编辑 JSON。';
  }
  if (kind === 'mv-model-interface') {
    return en
      ? 'Insert ```mv-model-interface```: **endpoints[]** for API sketch; edit in the interface canvas.'
      : '插入 ```mv-model-interface``` 围栏：**endpoints[]** 描述接口/端点（方法、路径、说明，文档示意）；在接口图模型画布中编辑 JSON。';
  }
  if (typeof kind === 'string' && kind.startsWith('uml-')) {
    const umlBase = mvViewKindStrings(kind as MvViewKind, locale).description;
    return en
      ? `${umlBase} This is an independent UML view kind with its own record format; Mermaid/@startuml are optional plugin capabilities.`
      : `${umlBase} 该类型属于独立 UML 视图，使用独立记录格式；Mermaid/@startuml 仅作为可选插件能力。`;
  }
  const base = mvViewKindStrings(kind as MvViewKind, locale).description;
  if (typeof kind === 'string' && kind.startsWith('mermaid-')) {
    return en
      ? `${base} After insert, a standard \`\`\`mermaid\`\`\` mirror fence follows the mv-view block so GitHub-style renderers can draw the diagram.`
      : `${base} 插入后在 mv-view 围栏之后附带标准 mermaid 围栏镜像段，正文与 JSON 内 payload 一致，便于 GitHub 等仅识别 Mermaid 的编辑器出图。`;
  }
  return base;
}

/**
 * 代码块画布顶栏 `<strong>` 文案：随 `locale` 切换；围栏语言名由旁侧 `<code>{{ block.kind }}</code>` 单独展示。
 */
export function blockCanvasSurfaceTitle(
  kind: 'mv-model-sql' | 'mv-model-kv' | 'mv-model-struct' | 'mv-model-interface' | 'mv-map',
  locale: AppLocale,
): string {
  const en = locale === 'en';
  if (kind === 'mv-model-sql') return en ? 'Model · multi-table' : MV_MODEL_SQL_CANVAS_TITLE;
  if (kind === 'mv-model-kv') return en ? 'KV document collection' : MV_MODEL_KV_CANVAS_TITLE;
  if (kind === 'mv-model-struct') return en ? 'Structured hierarchy' : MV_MODEL_STRUCT_CANVAS_TITLE;
  if (kind === 'mv-model-interface') return en ? 'Interface diagram (sketch)' : MV_MODEL_INTERFACE_CANVAS_TITLE;
  if (kind === 'mv-map') return en ? 'Mapping rules' : MV_MAP_CANVAS_TITLE;
  return '';
}

export function getInsertGroups(
  locale: AppLocale,
  mermaidUmlKinds: InsertCodeBlockKind[],
  mermaidOtherKinds: InsertCodeBlockKind[],
): { title: string; kinds: InsertCodeBlockKind[] }[] {
  const en = locale === 'en';
  return [
    { title: en ? 'Design' : '设计', kinds: ['mindmap-ui', 'ui-design'] },
    {
      title: en ? 'Database (Model)' : '数据库模型（Model）',
      kinds: ['mv-model-sql', 'mv-model-kv', 'mv-model-struct'],
    },
    { title: en ? 'Interface (Model)' : '接口模型（Model）', kinds: ['mv-model-interface'] },
    { title: en ? 'Software (Model)' : '软件模型（Model）', kinds: ['mv-model-codespace'] },
    {
      title: en ? 'Structure Diagrams (UML)' : '结构图（UML）',
      kinds: [
        'uml-class',
        'uml-object',
        'uml-package',
        'uml-composite-structure',
        'uml-component',
        'uml-deployment',
        'uml-profile',
      ],
    },
    {
      title: en ? 'Behavioral Diagrams (UML)' : '行为图（UML）',
      kinds: ['uml-usecase', 'uml-activity', 'uml-state-machine'],
    },
    {
      title: en ? 'Interaction Diagrams (UML)' : '交互图（UML）',
      kinds: ['uml-sequence', 'uml-communication', 'uml-timing', 'uml-interaction-overview', 'uml-diagram'],
    },
    { title: en ? 'Mermaid UML' : 'Mermaid UML', kinds: mermaidUmlKinds },
    { title: en ? 'Mermaid (other)' : 'Mermaid 其他', kinds: mermaidOtherKinds },
  ];
}
