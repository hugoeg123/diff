export interface FlatNode {
  id: string;
  key: string;
  value: any;
  depth: number;
  originalLine?: number; // Estimated line in source
  isMatch?: boolean; // Does value exist in source?
}

export interface DocumentData {
  id: string;
  name: string;
  sourceText: string;
  flatNodes: FlatNode[];
  rawJson: any;
}

export type ViewMode = 'dashboard' | 'editor';

export interface EditorSelection {
  nodeId: string | null;
}