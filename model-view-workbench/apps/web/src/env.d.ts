/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

export interface MvwbElectronAPI {
  pickWorkspace(): Promise<{ root: string; files: Record<string, string> } | null>;
  readWorkspaceFile(rel: string): Promise<string>;
  writeWorkspaceFile(rel: string, text: string): Promise<boolean>;
  openBlockEditor(rel: string, blockId: string): void;
  /** 打开独立窗口：画布可视化编辑（`?mvwb_canvas=1`） */
  openBlockCanvas(rel: string, blockId: string): void;
}

declare global {
  interface Window {
    electronAPI?: MvwbElectronAPI;
  }
}
export {};
