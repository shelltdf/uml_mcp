import { computed, reactive } from 'vue';
import { SEED_FILES } from '../demo/seedFiles';
import type { FileKind } from '../lib/formats';
import { detectKindFromPath } from '../lib/formats';

export interface Tab {
  id: string;
  path: string;
  content: string;
  kind: FileKind;
  isDirty: boolean;
}

let idSeq = 0;
function nextId() {
  idSeq += 1;
  return `t-${idSeq}`;
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
    });
  }
  state.activeTabId = state.tabs[0]?.id ?? '';
}

seed();

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
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return;
    tab.content = content;
    tab.kind = detectKindFromPath(tab.path);
    tab.isDirty = true;
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
      });
    }
    state.activeTabId = state.tabs[0]?.id ?? '';
  },
};
