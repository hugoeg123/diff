import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FlatNode, DocumentData } from '../types';
import { getHashTags, nestJson, checkMatch } from '../utils';
import { AlertCircle, Check, Copy, Edit2, Save, Upload, FileText, ChevronRight, Eye } from 'lucide-react';
import TopicTree from './TopicTree';

interface OntologyEditorProps {
  doc: DocumentData;
  onUpdate: (updatedNodes: FlatNode[]) => void;
  onSourceUpdate: (newText: string) => void;
  isCompact?: boolean;
}

const OntologyEditor: React.FC<OntologyEditorProps> = ({ doc, onUpdate, onSourceUpdate, isCompact = false }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [localSourceText, setLocalSourceText] = useState(doc.sourceText);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when doc changes
  useEffect(() => {
    setLocalSourceText(doc.sourceText);
    setIsEditingSource(false);
  }, [doc.id, doc.sourceText]);

  // Handle text input for a row (hashtag or content change)
  const handleRowChange = (id: string, value: string, type: 'structure' | 'key' | 'value') => {
    const newNodes = doc.flatNodes.map((node) => {
      if (node.id !== id) return node;

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
    onUpdate(newNodes);
  };

  const handleExport = () => {
      const json = nestJson(doc.flatNodes);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `ontology_${doc.name}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  }

  const handleSaveSource = () => {
      onSourceUpdate(localSourceText);
      setIsEditingSource(false);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
          alert("PDF support is currently in development.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      try {
        const text = await file.text();
        onSourceUpdate(text);
        setLocalSourceText(text); 
      } catch (err) {
          console.error("Failed to read file", err);
          alert("Failed to read file");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        try {
          const text = await file.text();
          onSourceUpdate(text);
          setLocalSourceText(text);
        } catch (err) {
            console.error("Failed to read file", err);
        }
    }
  };

  // --- RENDERING HELPERS ---

  const liveJson = useMemo(() => nestJson(doc.flatNodes), [doc.flatNodes]);

  const renderHighlightedJson = (nodeId: string | null, full: boolean) => {
      const jsonStr = JSON.stringify(liveJson, null, 2);
      
      // If full view, render everything
      if (full) {
          if (!nodeId) return <span className="text-green-400">{jsonStr}</span>;
          const activeNode = doc.flatNodes.find(n => n.id === nodeId);
          if (!activeNode) return <span className="text-green-400">{jsonStr}</span>;
          
          const keyStr = `"${activeNode.key}":`;
          const parts = jsonStr.split(keyStr);
          if(parts.length < 2) return <span className="text-green-400">{jsonStr}</span>;

          return (
              <>
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        <span className="text-green-400">{part}</span>
                        {i < parts.length - 1 && (
                            <span className="bg-blue-900/50 text-blue-200 font-bold px-1">{keyStr}</span>
                        )}
                    </React.Fragment>
                ))}
              </>
          )
      }

      // Compact view: Snippet only
      if (!nodeId) return <span className="text-gray-500 italic">Hover a node to see JSON</span>;
      const activeNode = doc.flatNodes.find(n => n.id === nodeId);
      if (!activeNode) return null;

      return (
          <div className="text-green-400">
              <span className="text-blue-300">"{activeNode.key}"</span>: 
              {typeof activeNode.value === 'string' ? ` "${activeNode.value}"` : ' { ... }'}
          </div>
      );
  };

  const renderSourceSnippet = (nodeId: string | null) => {
      if (!doc.sourceText) return <div className="text-gray-500 italic">No source text loaded.</div>;
      if (!nodeId) return <div className="text-gray-500 italic">Hover a node to see source context.</div>;

      const activeNode = doc.flatNodes.find(n => n.id === nodeId);
      if (!activeNode || !activeNode.value || typeof activeNode.value !== 'string') {
          return <div className="text-gray-500 italic">Node has no string value to match.</div>;
      }

      const val = String(activeNode.value).trim();
      if (val.length === 0) return <div className="text-gray-500 italic">Empty value.</div>;

      const index = doc.sourceText.indexOf(val);
      if (index === -1) return <div className="text-red-400 italic">Value not found in source.</div>;

      // Extract context (approx 100 chars before and after)
      const start = Math.max(0, index - 100);
      const end = Math.min(doc.sourceText.length, index + val.length + 100);
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

  const FullSourceView = useMemo(() => {
    if (!doc.sourceText) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center space-y-4">
                <div 
                    className="cursor-pointer hover:bg-gray-800/50 p-4 rounded-xl transition-all border-2 border-dashed border-gray-700 hover:border-blue-500 group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-blue-400" />
                    <p className="font-semibold text-gray-300 text-xs">Upload Source</p>
                </div>
            </div>
        );
    }
    
    const activeNode = doc.flatNodes.find(n => n.id === hoveredNodeId);
    
    if (!activeNode || !activeNode.value || typeof activeNode.value !== 'string') {
        return <pre className="whitespace-pre-wrap font-mono text-xs text-gray-400 p-4 custom-scrollbar leading-relaxed">{doc.sourceText}</pre>;
    }

    const val = String(activeNode.value).trim();
    if (val.length < 3) return <pre className="whitespace-pre-wrap font-mono text-xs text-gray-400 p-4 custom-scrollbar leading-relaxed">{doc.sourceText}</pre>;

    const parts = doc.sourceText.split(val);
    if (parts.length === 1) return <pre className="whitespace-pre-wrap font-mono text-xs text-gray-400 p-4 custom-scrollbar leading-relaxed">{doc.sourceText}</pre>;

    return (
        <pre className="whitespace-pre-wrap font-mono text-xs text-gray-400 p-4 custom-scrollbar leading-relaxed">
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                        <span className="bg-yellow-500/30 text-yellow-200 font-bold border-b border-yellow-500/50 px-1 rounded-sm">
                            {val}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </pre>
    );
  }, [doc.sourceText, hoveredNodeId, doc.flatNodes]);


  // --- LAYOUTS ---

  if (isCompact) {
      // COMPACT "LENS" LAYOUT
      return (
        <div className="flex flex-1 h-full overflow-hidden border-t border-gray-700">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.json,.pdf" />
            
            {/* 1. TOPIC TREE (Primary Focus) */}
            <div className="w-[60%] h-full border-r border-gray-700 flex flex-col">
                 <TopicTree nodes={doc.flatNodes} hoveredNodeId={hoveredNodeId} onHover={setHoveredNodeId} />
            </div>

            {/* 2. CONTEXT BEAM (Lens) */}
            <div className="w-[40%] h-full bg-gray-900 flex flex-col">
                <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3 shrink-0">
                    <span className="font-semibold text-xs text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        <Eye className="w-3 h-3" /> Focus Context
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0 divide-y divide-gray-800">
                    {/* SECTION A: SOURCE SNIPPET */}
                    <div className="p-3 bg-gray-900/50">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Source Context</div>
                        <div className="p-2 bg-gray-950 rounded border border-gray-800 min-h-[80px]">
                            {renderSourceSnippet(hoveredNodeId)}
                        </div>
                    </div>

                    {/* SECTION B: EDITOR (Only for active node) */}
                    <div className="p-3 bg-gray-800/30">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Node Editor</div>
                        {hoveredNodeId ? (
                             doc.flatNodes.filter(n => n.id === hoveredNodeId).map(node => (
                                <div key={node.id} className="space-y-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-600 block mb-1">Structure</label>
                                            <input
                                                className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-blue-400 font-mono text-xs"
                                                value={getHashTags(node.depth)}
                                                onChange={(e) => handleRowChange(node.id, e.target.value, 'structure')}
                                            />
                                        </div>
                                        <div className="flex-[2]">
                                            <label className="text-[10px] text-gray-600 block mb-1">Key</label>
                                            <input
                                                className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-white font-bold text-xs"
                                                value={node.key}
                                                onChange={(e) => handleRowChange(node.id, e.target.value, 'key')}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-600 block mb-1">Value</label>
                                        <textarea
                                            className={`w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs h-20 resize-none focus:outline-none focus:border-blue-500 transition-colors ${
                                                node.isMatch === false ? 'text-red-300' : 'text-green-300'
                                            }`}
                                            value={typeof node.value === 'string' ? node.value : ''}
                                            placeholder="Empty value"
                                            onChange={(e) => handleRowChange(node.id, e.target.value, 'value')}
                                        />
                                    </div>
                                </div>
                             ))
                        ) : (
                            <div className="text-gray-500 italic text-xs py-4 text-center">Select a node to edit</div>
                        )}
                    </div>

                    {/* SECTION C: JSON SNIPPET */}
                    <div className="p-3 bg-gray-900/50">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex justify-between">
                            <span>JSON Output</span>
                            <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={handleExport} />
                        </div>
                        <div className="font-mono text-[10px] bg-gray-950 p-2 rounded border border-gray-800">
                             {renderHighlightedJson(hoveredNodeId, false)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // STANDARD 4-COLUMN LAYOUT
  return (
    <div className="flex flex-1 h-full overflow-hidden border-t border-gray-700">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.json,.pdf" />

      {/* COLUMN 1: Topic Tree */}
      <div className="w-[18%] h-full transition-all duration-300">
         <TopicTree nodes={doc.flatNodes} hoveredNodeId={hoveredNodeId} onHover={setHoveredNodeId} />
      </div>

      {/* COLUMN 2: Original Source */}
      <div 
        className="w-[28%] border-r border-gray-700 flex flex-col bg-gray-900 relative transition-all duration-300"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3 shrink-0">
          <span className="font-semibold text-xs text-gray-400 uppercase truncate">Source</span>
          <div className="flex gap-2">
             <button onClick={() => isEditingSource ? handleSaveSource() : setIsEditingSource(true)} className="text-gray-400 hover:text-white">
                {isEditingSource ? <Save className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-white">
                <Upload className="w-3 h-3" />
             </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-900/50 custom-scrollbar">
            {isEditingSource ? (
                <textarea 
                    className="w-full h-full bg-gray-900 text-gray-300 p-4 font-mono text-xs focus:outline-none resize-none"
                    value={localSourceText}
                    onChange={(e) => setLocalSourceText(e.target.value)}
                />
            ) : FullSourceView}
        </div>
      </div>

      {/* COLUMN 3: Ontology Editor */}
      <div className="w-[30%] border-r border-gray-700 flex flex-col bg-gray-800 transition-all duration-300">
        <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3 shrink-0">
            <span className="font-semibold text-xs text-gray-400 uppercase truncate">Ontology Map</span>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-0.5 custom-scrollbar">
          {doc.flatNodes.map((node) => (
            <div 
                key={node.id} 
                className={`flex gap-2 p-1 rounded transition-colors group items-center
                    ${hoveredNodeId === node.id ? 'bg-blue-600/20 ring-1 ring-blue-500/30' : 'hover:bg-gray-700'}
                `}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Structure Input */}
              <input
                className="bg-transparent text-blue-500/70 font-mono text-[10px] w-8 text-right focus:text-blue-400 focus:outline-none"
                value={getHashTags(node.depth)}
                onChange={(e) => handleRowChange(node.id, e.target.value, 'structure')}
              />
              
              {/* Key Input */}
              <input
                className="bg-transparent text-gray-300 font-bold text-xs w-[30%] focus:text-white focus:outline-none"
                value={node.key}
                onChange={(e) => handleRowChange(node.id, e.target.value, 'key')}
              />

              {/* Value Input */}
              <div className="flex-1 relative min-w-0">
                <input
                    className={`w-full bg-transparent text-xs focus:outline-none truncate ${
                        node.isMatch === false ? 'text-red-400/80' : 'text-green-400/80'
                    }`}
                    value={typeof node.value === 'string' ? node.value : ''}
                    placeholder={typeof node.value === 'object' ? '' : 'Empty'}
                    onChange={(e) => handleRowChange(node.id, e.target.value, 'value')}
                />
              </div>
            </div>
          ))}
          <div className="h-20" />
        </div>
      </div>

      {/* COLUMN 4: Live JSON */}
      <div className="w-[24%] flex flex-col bg-gray-900 transition-all duration-300">
        <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3 shrink-0">
           <span className="font-semibold text-xs text-gray-400 uppercase truncate">Output</span>
           <button onClick={handleExport} className="hover:text-white text-gray-400"><Copy className="w-3 h-3" /></button>
        </div>
        <div className="flex-1 overflow-auto p-3 custom-scrollbar">
             <pre className="text-[10px] font-mono whitespace-pre-wrap break-all leading-tight">
                 {renderHighlightedJson(hoveredNodeId, true)}
             </pre>
        </div>
      </div>
    </div>
  );
};

export default OntologyEditor;