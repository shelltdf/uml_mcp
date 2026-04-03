/// <reference types="vite/client" />

/** File System Access（部分环境 TS lib 未声明 window 上的方法） */
interface Window {
  showOpenFilePicker?: (
    options?: {
      multiple?: boolean;
      excludeAcceptAllOption?: boolean;
      types?: { description?: string; accept: Record<string, string[]> }[];
    },
  ) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle>;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module '*.json' {
  const value: { version?: string; name?: string };
  export default value;
}
