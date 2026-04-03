/**
 * 浏览器内打开 / 保存文本文件（优先 File System Access API，否则下载兜底）。
 */

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

export interface OpenFileResult {
  name: string;
  pathLabel: string;
  content: string;
  handle?: FileSystemFileHandle;
}

/** `umlSync`：优先选 uml.sync 契约（仍为 .md，与「打开」区分说明文案） */
export type OpenTextFileIntent = 'any' | 'umlSync';

/** 打开单个文本文件（用户取消返回 null） */
export async function openTextFile(intent: OpenTextFileIntent = 'any'): Promise<OpenFileResult | null> {
  if (!supportsFileSystemAccess()) {
    return legacyOpenFileInput(intent);
  }
  try {
    const pick = window.showOpenFilePicker;
    if (!pick) return legacyOpenFileInput(intent);
    const types =
      intent === 'umlSync'
        ? [
            {
              description: 'uml.sync.md',
              accept: {
                'text/markdown': ['.md', '.markdown'],
              },
            },
          ]
        : [
            {
              description: 'Markdown / UML',
              accept: {
                'text/markdown': ['.md', '.uml.md', '.markdown'],
                'text/plain': ['.txt'],
              },
            },
          ];
    const [handle] = await pick({
      multiple: false,
      types,
    });
    const file = await handle.getFile();
    const content = await file.text();
    return {
      name: file.name,
      pathLabel: file.name,
      content,
      handle,
    };
  } catch (e) {
    if (isAbortError(e)) return null;
    throw e;
  }
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** 无 FS API 时用 input[type=file] */
function legacyOpenFileInput(intent: OpenTextFileIntent): Promise<OpenFileResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      intent === 'umlSync' ? '.md,.markdown,uml.sync.md,text/markdown' : '.md,.uml.md,.markdown,.txt,text/markdown';
    input.style.display = 'none';
    const done = (v: OpenFileResult | null) => {
      input.remove();
      resolve(v);
    };
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) {
        done(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : '';
        done({ name: f.name, pathLabel: f.name, content });
      };
      reader.onerror = () => done(null);
      reader.readAsText(f, 'UTF-8');
    };
    input.oncancel = () => done(null);
    document.body.appendChild(input);
    input.click();
  });
}

export interface SaveAsOptions {
  suggestedName: string;
  content: string;
}

export type SaveTextAsResult =
  | { status: 'saved'; handle: FileSystemFileHandle }
  | { status: 'downloaded' }
  | { status: 'cancelled' };

/** 另存为：优先系统保存对话框；不支持时用下载兜底（仍视为已导出） */
export async function saveTextAs(opts: SaveAsOptions): Promise<SaveTextAsResult> {
  const { suggestedName, content } = opts;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

  if (!supportsShowSavePicker()) {
    triggerDownload(blob, suggestedName);
    return { status: 'downloaded' };
  }

  try {
    const save = window.showSaveFilePicker;
    if (!save) {
      triggerDownload(blob, suggestedName);
      return { status: 'downloaded' };
    }
    const handle = await save({
      suggestedName,
      types: [
        {
          description: 'UML Markdown',
          accept: { 'text/markdown': ['.uml.md', '.md'] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { status: 'saved', handle };
  } catch (e) {
    if (isAbortError(e)) return { status: 'cancelled' };
    throw e;
  }
}

function supportsShowSavePicker(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 写入已有句柄（「保存」） */
export async function writeToHandle(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}
