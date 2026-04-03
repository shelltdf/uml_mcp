import { computed, reactive } from 'vue';
import { SEED_FILES } from '../demo/seedFiles';
import type { DiagramTypeId } from '../lib/diagramTemplates';
import { buildNewUmlMarkdown } from '../lib/diagramTemplates';
import type { FileKind } from '../lib/formats';
import { detectKindFromPath } from '../lib/formats';
import { openTextFile, saveTextAs, writeToHandle } from '../lib/fileAccess';
import type { OpenTextFileIntent } from '../lib/fileAccess';

export interface Tab {
  id: string;
  /** 显示用路径（未保存磁盘时为 untitled 名） */
  path: string;
  content: string;
  kind: FileKind;
  isDirty: boolean;
  /** 若从磁盘打开或另存为成功，可非空以便「保存」覆写 */
  fileHandle?: FileSystemFileHandle;
  /** 上次成功打开/保存时的快照，用于「还原」 */
  lastPersistedContent: string;
}

let idSeq = 0;
let untitledSeq = 0;
function nextId() {
  idSeq += 1;
  return `t-${idSeq}`;
}

function nextUntitledName() {
  untitledSeq += 1;
  return untitledSeq === 1 ? 'untitled.uml.md' : `untitled-${untitledSeq}.uml.md`;
}

function nextUmlSyncPath(): string {
  const basenames = state.tabs.map((t) => t.path.split(/[/\\]/).pop() ?? '');
  const set = new Set(basenames);
  if (!set.has('uml.sync.md')) return 'uml.sync.md';
  let n = 2;
  while (set.has(`uml.sync (${n}).md`)) n += 1;
  return `uml.sync (${n}).md`;
}

const state = reactive({
  tabs: [] as Tab[],
  activeTabId: '' as string,
});

function seed() {
  if (state.tabs.length > 0) return;
  for (const f of SEED_FILES) {
    const id = nextId();
    state.tabs.push({
      id,
      path: f.path,
      content: f.content,
      kind: f.kind,
      isDirty: false,
      lastPersistedContent: f.content,
    });
  }
  state.activeTabId = state.tabs[0]?.id ?? '';
}

seed();

function tabById(id: string): Tab | undefined {
  return state.tabs.find((t) => t.id === id);
}

function persistSnapshot(tab: Tab) {
  tab.lastPersistedContent = tab.content;
}

export const workspace = {
  state,
  activeTab: computed(() => state.tabs.find((t) => t.id === state.activeTabId) ?? null),
  anyDirty: computed(() => state.tabs.some((t) => t.isDirty)),

  selectTab(id: string) {
    if (state.tabs.some((t) => t.id === id)) {
      state.activeTabId = id;
    }
  },

  updateContent(id: string, content: string) {
    const tab = tabById(id);
    if (!tab) return;
    tab.content = content;
    tab.kind = detectKindFromPath(tab.path);
    tab.isDirty = true;
  },

  setPathAndKind(tabId: string, path: string) {
    const tab = tabById(tabId);
    if (!tab) return;
    tab.path = path;
    tab.kind = detectKindFromPath(path);
  },

  markClean(tabId: string) {
    const tab = tabById(tabId);
    if (!tab) return;
    tab.isDirty = false;
  },

  closeTab(id: string) {
    const idx = state.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    state.tabs.splice(idx, 1);
    if (state.activeTabId === id) {
      state.activeTabId = state.tabs[Math.max(0, idx - 1)]?.id ?? state.tabs[0]?.id ?? '';
    }
  },

  resetDemo() {
    state.tabs = [];
    state.activeTabId = '';
    idSeq = 0;
    for (const f of SEED_FILES) {
      const id = nextId();
      state.tabs.push({
        id,
        path: f.path,
        content: f.content,
        kind: f.kind,
        isDirty: false,
        lastPersistedContent: f.content,
      });
    }
    state.activeTabId = state.tabs[0]?.id ?? '';
  },

  /** 新建单图 UML 标签页（内容由模板生成） */
  newUmlDiagram(diagramId: DiagramTypeId) {
    const id = nextId();
    const path = nextUntitledName();
    const content = buildNewUmlMarkdown(diagramId, path.replace(/\.uml\.md$/i, '') || 'Diagram');
    const tab: Tab = {
      id,
      path,
      content,
      kind: 'uml',
      isDirty: true,
      lastPersistedContent: content,
    };
    state.tabs.push(tab);
    state.activeTabId = id;
    return tab;
  },

  /** 新建 uml.sync.md（示例模板，可编辑后保存） */
  newSyncConfig() {
    const id = nextId();
    const path = nextUmlSyncPath();
    const seed = SEED_FILES.find((f) => f.path === 'uml.sync.md');
    const content = seed?.content ?? '---\n---\n\n';
    const tab: Tab = {
      id,
      path,
      content,
      kind: 'sync',
      isDirty: true,
      lastPersistedContent: content,
    };
    state.tabs.push(tab);
    state.activeTabId = id;
    return tab;
  },

  async openFileFromDisk(intent: OpenTextFileIntent = 'any'): Promise<boolean> {
    const res = await openTextFile(intent);
    if (!res) return false;
    const id = nextId();
    const kind = detectKindFromPath(res.pathLabel);
    const tab: Tab = {
      id,
      path: res.pathLabel,
      content: res.content,
      kind,
      isDirty: false,
      fileHandle: res.handle,
      lastPersistedContent: res.content,
    };
    state.tabs.push(tab);
    state.activeTabId = id;
    return true;
  },

  /** 保存当前标签 */
  async saveActive(): Promise<'ok' | 'cancelled' | 'needSaveAs'> {
    const tab = tabById(state.activeTabId);
    if (!tab) return 'cancelled';
    if (tab.fileHandle) {
      try {
        await writeToHandle(tab.fileHandle, tab.content);
        persistSnapshot(tab);
        tab.isDirty = false;
        return 'ok';
      } catch {
        return 'needSaveAs';
      }
    }
    const name = tab.path.split(/[/\\]/).pop() || 'untitled.uml.md';
    const res = await saveTextAs({ suggestedName: name, content: tab.content });
    if (res.status === 'cancelled') return 'cancelled';
    if (res.status === 'downloaded') {
      persistSnapshot(tab);
      tab.isDirty = false;
      return 'ok';
    }
    tab.fileHandle = res.handle;
    try {
      tab.path = res.handle.name;
    } catch {
      /* older browsers */
    }
    tab.kind = detectKindFromPath(tab.path);
    persistSnapshot(tab);
    tab.isDirty = false;
    return 'ok';
  },

  async saveActiveAs(): Promise<boolean> {
    const tab = tabById(state.activeTabId);
    if (!tab) return false;
    const name = tab.path.split(/[/\\]/).pop() || 'untitled.uml.md';
    const res = await saveTextAs({ suggestedName: name, content: tab.content });
    if (res.status === 'cancelled') return false;
    if (res.status === 'downloaded') {
      persistSnapshot(tab);
      tab.isDirty = false;
      return true;
    }
    tab.fileHandle = res.handle;
    try {
      tab.path = res.handle.name;
    } catch {
      /* ignore */
    }
    tab.kind = detectKindFromPath(tab.path);
    persistSnapshot(tab);
    tab.isDirty = false;
    return true;
  },

  /**
   * 全部保存：仅对「已关联磁盘句柄」且脏的标签直接写入；无句柄的脏文件不弹窗（需用户逐个保存/另存为）。
   */
  async saveAll(): Promise<{ written: number; skippedNoHandle: number; failed: number }> {
    let written = 0;
    let skippedNoHandle = 0;
    let failed = 0;
    for (const tab of state.tabs) {
      if (!tab.isDirty) continue;
      if (!tab.fileHandle) {
        skippedNoHandle += 1;
        continue;
      }
      try {
        await writeToHandle(tab.fileHandle, tab.content);
        persistSnapshot(tab);
        tab.isDirty = false;
        written += 1;
      } catch {
        failed += 1;
      }
    }
    return { written, skippedNoHandle, failed };
  },

  /** 当前文件还原到上次成功打开/保存的内容 */
  revertActive(): boolean {
    const tab = tabById(state.activeTabId);
    if (!tab) return false;
    tab.content = tab.lastPersistedContent;
    tab.isDirty = false;
    tab.kind = detectKindFromPath(tab.path);
    return true;
  },
};
