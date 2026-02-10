import React, { useMemo } from 'react';
import { DocumentData, FlatNode } from '../types';
import { getHashTags, nestJson, checkMatch } from '../utils';
import { Copy, Eye, FileText } from 'lucide-react';

interface FocusPanelProps {
  doc: DocumentData | null;
  nodeId: string | null;
  onUpdate: (docId: string, updatedNodes: FlatNode[]) => void;
  onClose?: () => void;
}

const FocusPanel: React.FC<FocusPanelProps> = ({ doc, nodeId, onUpdate, onClose }) => {
  if (!doc || !nodeId) {
    return (
      <div className="h-48 bg-gray-900 border-t border-gray-700 flex flex-col items-center justify-center text-gray-500">
        <Eye className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Hover over a node in any tree to inspect details</p>
      </div>
    );
  }

  const activeNode = doc.flatNodes.find((n) => n.id === nodeId);

  if (!activeNode) return null;

  // --- Helpers ---

  const handleRowChange = (value: string, type: 'structure' | 'key' | 'value') => {
    const newNodes = doc.flatNodes.map((node) => {
      if (node.id !== nodeId) return node;

      if (type === 'structure') {
        const match = value.match(/^(#+)/);
        const depth = match ? match[1].length - 1 : 0;
        return { ...node, depth };
      } else if (type === 'key') {
        return { ...node, key: value };
      } else {
        const isMatch = checkMatch(value, doc.sourceText);
        return { ...node, value: value, isMatch };
      }
    });
    onUpdate(doc.id, newNodes);
  };

  const renderSourceSnippet = () => {
    if (!doc.sourceText) return <div className="text-gray-500 italic text-xs">No source text loaded.</div>;
    if (!activeNode.value || typeof activeNode.value !== 'string') {
      return <div className="text-gray-500 italic text-xs">Node has no string value to match.</div>;
    }

    const val = String(activeNode.value).trim();
    if (val.length === 0) return <div className="text-gray-500 italic text-xs">Empty value.</div>;

    const index = doc.sourceText.indexOf(val);
    if (index === -1) return <div className="text-red-400 italic text-xs">Value not found in source.</div>;

    const start = Math.max(0, index - 80);
    const end = Math.min(doc.sourceText.length, index + val.length + 80);
    const pre = doc.sourceText.substring(start, index);
    const match = doc.sourceText.substring(index, index + val.length);
    const post = doc.sourceText.substring(index + val.length, end);

    return (
      <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-gray-400">
        ...{pre}
        <span className="bg-yellow-500/30 text-yellow-200 font-bold border-b border-yellow-500/50">
          {match}
        </span>
        {post}...
      </div>
    );
  };

  const jsonPreview = useMemo(() => {
     // Construct a partial JSON for preview just to show context
     // A full reconstruction might be heavy, but utils.nestJson is fast enough for small docs
     const fullObj = nestJson(doc.flatNodes);
     // We try to find the path or just show the whole thing highlighted?
     // For this view, let's show a snippet logic similar to the editor
     return JSON.stringify(fullObj, null, 2);
  }, [doc.flatNodes]);

  const renderJsonSnippet = () => {
      const keyStr = `"${activeNode.key}":`;
      const parts = jsonPreview.split(keyStr);
      
      if(parts.length < 2) return <div className="text-green-400/50 text-xs truncate">{jsonPreview.substring(0, 200)}...</div>;

      return (
        <div className="text-xs font-mono text-gray-400 whitespace-pre-wrap">
            <span className="text-green-400/50">...</span>
            <span className="bg-blue-900/50 text-blue-200 font-bold px-1">{keyStr}</span>
            <span className="text-green-300">{parts[1].substring(0, 300)}...</span>
        </div>
      )
  }

  return (
    <div className="h-64 bg-gray-900 border-t border-gray-700 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-20">
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-3 h-3" /> Focus Context
            </span>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-xs text-gray-300 font-mono">{doc.name}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden divide-x divide-gray-700">
        {/* COL 1: Source Context */}
        <div className="w-1/3 p-3 overflow-y-auto custom-scrollbar bg-gray-900">
           <div className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex items-center gap-2">
             <FileText className="w-3 h-3"/> Original Source Match
           </div>
           <div className="p-2 bg-gray-950 rounded border border-gray-800 min-h-[60px]">
             {renderSourceSnippet()}
           </div>
        </div>

        {/* COL 2: Editor Inputs */}
        <div className="w-1/3 p-3 bg-gray-800/30 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Node Editor</div>
          <div className="space-y-3">
             <div className="flex gap-2">
                <div className="w-16">
                    <label className="text-[10px] text-gray-600 block mb-1">Depth</label>
                    <input
                        className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-blue-400 font-mono text-xs"
                        value={getHashTags(activeNode.depth)}
                        onChange={(e) => handleRowChange(e.target.value, 'structure')}
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] text-gray-600 block mb-1">Key</label>
                    <input
                        className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-white font-bold text-xs"
                        value={activeNode.key}
                        onChange={(e) => handleRowChange(e.target.value, 'key')}
                    />
                </div>
            </div>
            <div>
                <label className="text-[10px] text-gray-600 block mb-1">Value</label>
                <textarea
                    className={`w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs h-20 resize-none focus:outline-none focus:border-blue-500 transition-colors ${
                        activeNode.isMatch === false ? 'text-red-300' : 'text-green-300'
                    }`}
                    value={typeof activeNode.value === 'string' ? activeNode.value : ''}
                    placeholder="Empty value"
                    onChange={(e) => handleRowChange(e.target.value, 'value')}
                />
            </div>
          </div>
        </div>

        {/* COL 3: JSON Output */}
        <div className="w-1/3 p-3 bg-gray-900 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex justify-between">
                <span>Structure Preview</span>
            </div>
            <div className="font-mono text-[10px] bg-gray-950 p-2 rounded border border-gray-800">
                {renderJsonSnippet()}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FocusPanel;