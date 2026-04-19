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
  /** 在工作区根目录下选择并打开一个 .md（须已打开磁盘工作区） */
  openMarkdownInWorkspace(): Promise<
    | { relPath: string; text: string }
    | { error: 'no_workspace' | 'outside_workspace' }
    | null
  >;
  /** 在工作区内「另存为」；返回新相对路径（可与当前不同） */
  saveFileAs(curRelPath: string, text: string): Promise<
    { relPath: string } | { error: 'no_workspace' | 'outside_workspace' } | null
  >;
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
