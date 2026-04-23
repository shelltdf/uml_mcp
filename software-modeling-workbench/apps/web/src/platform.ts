export type ShellKind = 'browser' | 'electron' | 'vscode';

export function detectShell(): ShellKind {
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="software-modeling-workbench-shell"]');
    if (meta?.getAttribute('content') === 'vscode') return 'vscode';
  }
  if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: unknown }).electronAPI) {
    return 'electron';
  }
  return 'browser';
}
