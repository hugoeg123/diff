import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import OntologyEditor from './components/OntologyEditor';
import TreeAnalyst from './components/TreeAnalyst';
import TopicTree from './components/TopicTree';
import FocusPanel from './components/FocusPanel';
import { DocumentData, FlatNode } from './types';
import { flattenJson, checkMatch } from './utils';
import { Columns, Square, Plus, X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  
  // Modes: 'edit' (Single Doc) | 'compare' (Multi Doc)
  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit');
  
  // Comparison State
  const [compareDocIds, setCompareDocIds] = useState<string[]>([]);
  const [isAddTreeOpen, setIsAddTreeOpen] = useState(false);
  
  // Global Hover State for Comparison Mode
  const [hoveredNode, setHoveredNode] = useState<{ docId: string; nodeId: string } | null>(null);
  // New: Global Key Highlight State
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const handleUpload = async (files: FileList) => {
    const jsonFiles: File[] = [];
    const textFiles: File[] = [];

    Array.from(files).forEach(f => {
        if (f.name.endsWith('.json') || f.type.includes('json')) {
            jsonFiles.push(f);
        } else if (f.name.endsWith('.txt') || f.name.endsWith('.md') || f.type.startsWith('text/')) {
            textFiles.push(f);
        }
    });

    const newDocs: DocumentData[] = [];

    for (const jsonFile of jsonFiles) {
        const text = await jsonFile.text();
        try {
            const jsonContent = JSON.parse(text);
            const name = jsonFile.name.replace('.json', '');
            
            let textContent = '';
            let pairedFile: File | undefined;

            if (jsonFiles.length === 1 && textFiles.length === 1) {
                pairedFile = textFiles[0];
            } else {
                pairedFile = textFiles.find(f => f.name.startsWith(name));
            }
            
            if (pairedFile) {
                textContent = await pairedFile.text();
            }

            const flatNodes = flattenJson(jsonContent);
            
            flatNodes.forEach(node => {
                node.isMatch = checkMatch(node.value, textContent);
            });

            newDocs.push({
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                rawJson: jsonContent,
                sourceText: textContent,
                flatNodes: flatNodes
            });

        } catch (e) {
            console.error("Invalid JSON", e);
            alert(`Error parsing ${jsonFile.name}`);
        }
    }

    if (newDocs.length > 0) {
        setDocuments(prev => [...prev, ...newDocs]);
        if (!activeDocId) {
             setActiveDocId(newDocs[0].id);
             setCompareDocIds([newDocs[0].id]);
        }
    }
  };

  const handleDocUpdate = (id: string, updatedNodes: FlatNode[]) => {
      setDocuments(prev => prev.map(doc => {
          if (doc.id === id) {
              return { ...doc, flatNodes: updatedNodes };
          }
          return doc;
      }));
  };

  const handleSourceUpdate = (docId: string, newText: string) => {
    setDocuments(prev => prev.map(doc => {
        if (doc.id !== docId) return doc;
        
        const updatedNodes = doc.flatNodes.map(node => ({
            ...node,
            isMatch: checkMatch(node.value, newText)
        }));

        return { 
            ...doc, 
            sourceText: newText,
            flatNodes: updatedNodes
        };
    }));
  };

  const addToComparison = (docId: string) => {
    if (!compareDocIds.includes(docId)) {
        setCompareDocIds([...compareDocIds, docId]);
    }
    setIsAddTreeOpen(false);
  };

  const removeFromComparison = (docId: string) => {
      setCompareDocIds(prev => prev.filter(id => id !== docId));
  };

  const moveTree = (index: number, direction: 'left' | 'right') => {
      if (direction === 'left' && index > 0) {
          const newIds = [...compareDocIds];
          [newIds[index], newIds[index - 1]] = [newIds[index - 1], newIds[index]];
          setCompareDocIds(newIds);
      } else if (direction === 'right' && index < compareDocIds.length - 1) {
          const newIds = [...compareDocIds];
          [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
          setCompareDocIds(newIds);
      }
  };

  const handleNodeHover = (docId: string, nodeId: string | null) => {
      if (nodeId) {
          setHoveredNode({ docId, nodeId });
          const doc = documents.find(d => d.id === docId);
          const node = doc?.flatNodes.find(n => n.id === nodeId);
          if (node) setHoveredKey(node.key);
      } else {
          setHoveredNode(null);
          setHoveredKey(null);
      }
  };

  // Get active document objects
  const activeDoc = documents.find(d => d.id === activeDocId);
  const hoveredDoc = hoveredNode ? documents.find(d => d.id === hoveredNode.docId) || null : null;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      <Sidebar 
        documents={documents}
        activeDocId={activeDocId}
        onSelect={(id) => {
            setActiveDocId(id);
        }}
        onRemove={(id) => {
            setDocuments(prev => prev.filter(d => d.id !== id));
            if (activeDocId === id) setActiveDocId(null);
            setCompareDocIds(prev => prev.filter(cid => cid !== id));
        }}
        onUpload={handleUpload}
        onKeyHover={(key) => setHoveredKey(key)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Header */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-gray-100 truncate">
                    {viewMode === 'edit' 
                        ? (activeDoc ? activeDoc.name : 'Dashboard') 
                        : 'Tree Comparator'}
                </h2>
                {viewMode === 'edit' && activeDoc && (
                   <div className="h-8 w-32 opacity-80">
                      <TreeAnalyst document={activeDoc} />
                   </div>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button 
                        onClick={() => setViewMode('edit')}
                        className={`p-1.5 rounded flex items-center gap-2 text-xs font-medium ${viewMode === 'edit' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Square className="w-4 h-4" /> Edit
                    </button>
                    <button 
                        onClick={() => {
                            setViewMode('compare');
                            if (activeDocId && compareDocIds.length === 0) {
                                setCompareDocIds([activeDocId]);
                            }
                        }}
                        className={`p-1.5 rounded flex items-center gap-2 text-xs font-medium ${viewMode === 'compare' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Columns className="w-4 h-4" /> Compare
                    </button>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative bg-gray-900">
            
            {/* MODE: EDIT (Single Document) */}
            {viewMode === 'edit' && (
                <div className="w-full h-full flex flex-col">
                    {activeDoc ? (
                        <OntologyEditor 
                            doc={activeDoc} 
                            onUpdate={(nodes) => handleDocUpdate(activeDoc.id, nodes)} 
                            onSourceUpdate={(text) => handleSourceUpdate(activeDoc.id, text)}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-600">
                            <p>Select a document from the sidebar</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODE: COMPARE (Multi-Tree) */}
            {viewMode === 'compare' && (
                <div className="w-full h-full flex flex-col">
                    {/* Top Bar for Comparison Controls */}
                    <div className="h-10 bg-gray-800/50 border-b border-gray-700 flex items-center px-4 gap-4 shrink-0">
                        <div className="relative">
                             <button 
                                onClick={() => setIsAddTreeOpen(!isAddTreeOpen)}
                                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-colors"
                             >
                                <Plus className="w-3 h-3" /> Add Tree
                             </button>
                             
                             {/* Backdrop to close dropdown */}
                             {isAddTreeOpen && (
                                <div className="fixed inset-0 z-40" onClick={() => setIsAddTreeOpen(false)}></div>
                             )}

                             {/* Dropdown Menu */}
                             {isAddTreeOpen && (
                                 <div className="absolute left-0 top-full mt-2 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-1">
                                    {documents.filter(d => !compareDocIds.includes(d.id)).length === 0 && (
                                        <div className="p-2 text-xs text-gray-500 text-center">No other documents available</div>
                                    )}
                                    {documents.filter(d => !compareDocIds.includes(d.id)).map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => addToComparison(doc.id)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-gray-200 text-xs rounded truncate flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            {doc.name}
                                        </button>
                                    ))}
                                 </div>
                             )}
                        </div>
                        <span className="text-xs text-gray-500">
                            {compareDocIds.length} documents visible
                        </span>
                    </div>

                    {/* Comparison Grid (Horizontal Scroll) */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-900/50 p-2 flex gap-2">
                        {compareDocIds.map((docId, index) => {
                            const doc = documents.find(d => d.id === docId);
                            if (!doc) return null;
                            return (
                                <div 
                                    key={doc.id} 
                                    className="flex flex-col bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden min-w-[300px] w-[350px] resize-x relative group"
                                    style={{ maxWidth: '800px' }}
                                >
                                    <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3 shrink-0 handle">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {/* Reorder Controls */}
                                            <div className="flex gap-0.5">
                                                <button 
                                                    onClick={() => moveTree(index, 'left')}
                                                    disabled={index === 0}
                                                    className="p-0.5 hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronLeft className="w-3 h-3 text-gray-400" />
                                                </button>
                                                <button 
                                                    onClick={() => moveTree(index, 'right')}
                                                    disabled={index === compareDocIds.length - 1}
                                                    className="p-0.5 hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                                </button>
                                            </div>
                                            <span className="text-xs font-bold text-gray-300 truncate" title={doc.name}>{doc.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => removeFromComparison(doc.id)}
                                            className="text-gray-500 hover:text-red-400 p-1 rounded"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <TopicTree 
                                            nodes={doc.flatNodes} 
                                            hoveredNodeId={hoveredNode?.docId === doc.id ? hoveredNode.nodeId : null}
                                            onHover={(nodeId) => handleNodeHover(doc.id, nodeId)}
                                            highlightedKey={hoveredKey}
                                        />
                                    </div>
                                    {/* Resize Handle Indicator */}
                                    <div className="absolute bottom-1 right-1 pointer-events-none opacity-0 group-hover:opacity-50">
                                        <Maximize2 className="w-3 h-3 text-gray-500 rotate-90" />
                                    </div>
                                </div>
                            );
                        })}
                        
                        {compareDocIds.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl m-4">
                                <p>Add documents to start comparing</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Focus Panel (Shared) */}
                    <FocusPanel 
                        doc={hoveredDoc}
                        nodeId={hoveredNode?.nodeId || null}
                        onUpdate={handleDocUpdate}
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
}