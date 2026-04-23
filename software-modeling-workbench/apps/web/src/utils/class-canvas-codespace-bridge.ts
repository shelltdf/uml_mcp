export {
  findCodespaceClassifierForMermaidClass as findCodespaceClassifierForClassCanvas,
  getFirstCodespaceRefForMermaidClass as getFirstCodespaceRefForClassCanvas,
  listCodespaceClassesForMermaidClass as listCodespaceClassesForClassCanvas,
  listOneHopRelatedClassifierIdsForDiagramClass,
  resolveDiagramClassToCodespaceClassId,
} from './mermaid-codespace-bridge';

export type { CodespaceClassTreeItem } from './mermaid-codespace-bridge';
