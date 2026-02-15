import React, { useMemo } from 'react';
import { Upload, FileJson, FileText, X, Hash, Copy, FileSpreadsheet, Download } from 'lucide-react';
import { DocumentData } from '../types';
import { getHashTags } from '../utils';

interface SidebarProps {
  documents: DocumentData[];
  activeDocId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpload: (files: FileList) => void;
  onKeyHover?: (key: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ documents, activeDocId, onSelect, onRemove, onUpload, onKeyHover }) => {
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
    }
  };

  // Calculate common keys across all documents
  const commonKeys = useMemo(() => {
    if (documents.length < 2) return [];

    const keyCounts: Record<string, number> = {};

    documents.forEach(doc => {
        // Use Set to ensure we count each key only once per document
        const uniqueKeysInDoc = new Set<string>(doc.flatNodes.map(n => n.key));
        uniqueKeysInDoc.forEach((key) => {
            keyCounts[key] = (keyCounts[key] || 0) + 1;
        });
    });

    // Convert to array, filter for > 1 occurance, and sort by frequency
    return Object.entries(keyCounts)
        .filter(([key, count]) => count > 1 && key.trim() !== '' && !key.startsWith('['))
        .sort((a, b) => b[1] - a[1]);
  }, [documents]);

  // --- Report Generation Logic ---

  const generateAnalysisData = () => {
    // 1. repeated keys details
    const analysis = commonKeys.map(([key, count]) => {
        const occurrences = documents
            .filter(d => d.flatNodes.some(n => n.key === key))
            .map(d => {
                const node = d.flatNodes.find(n => n.key === key);
                return {
                    docName: d.name,
                    depth: node ? node.depth : 0,
                    structure: node ? getHashTags(node.depth) : ''
                };
            });
        return { key, count, occurrences };
    });

    // 2. Full structure summary
    const structures = documents.map(doc => ({
        docName: doc.name,
        nodes: doc.flatNodes.map(n => ({
            key: n.key,
            depth: n.depth,
            structure: getHashTags(n.depth),
            type: n.value === '' ? 'Container' : 'Leaf'
        }))
    }));

    return { analysis, structures };
  };

  const handleCopyJsonReport = () => {
    const data = generateAnalysisData();
    const jsonStr = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonStr);
    alert("Analysis JSON copied to clipboard!");
  };

  const handleDownloadCsvReport = () => {
    const { analysis, structures } = generateAnalysisData();
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Section 1: Repeated Keys Analysis
    csvContent += "SECTION 1: REPEATED KEYS ANALYSIS\n";
    csvContent += "Key,Total Frequency,Document Name,Indentation Level (Structure),Is Subcategory?\n";
    
    analysis.forEach(item => {
        item.occurrences.forEach(occ => {
             // CSV Escape logic
             const safeKey = item.key.includes(',') ? `"${item.key}"` : item.key;
             csvContent += `${safeKey},${item.count},${occ.docName},${occ.structure} ${safeKey},${occ.depth > 0 ? 'Yes' : 'No'}\n`;
        });
    });

    csvContent += "\n\nSECTION 2: FULL DOCUMENT STRUCTURES\n";
    csvContent += "Document,Indentation,Key,Type\n";

    structures.forEach(doc => {
        doc.nodes.forEach(node => {
             const safeKey = node.key.includes(',') ? `"${node.key}"` : node.key;
             csvContent += `${doc.docName},${node.structure},${safeKey},${node.type}\n`;
        });
        csvContent += "\n"; // Spacer between docs
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tree_diff_analysis_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
           <FileText className="w-6 h-6" /> Tree Diff Studio
        </h1>
        <p className="text-xs text-gray-400 mt-1">Ontology & Structure Analyst</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 flex flex-col">
        {documents.length === 0 && (
            <div className="text-center text-gray-500 mt-10 text-sm">
                No documents loaded. Drag & drop JSON/TXT files here.
            </div>
        )}
        
        {/* Document List */}
        <div className="space-y-1">
            {documents.length > 0 && <div className="px-2 text-[10px] text-gray-500 font-bold uppercase mb-1">Documents</div>}
            {documents.map((doc) => (
            <div
                key={doc.id}
                onClick={() => onSelect(doc.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                activeDocId === doc.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                <FileJson className="w-4 h-4 flex-shrink-0" />
                <div className="flex flex-col truncate">
                    <span className="text-sm font-medium truncate">{doc.name}</span>
                    <span className="text-[10px] opacity-70 truncate">
                        {doc.flatNodes.length} nodes
                    </span>
                </div>
                </div>
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(doc.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity"
                >
                <X className="w-4 h-4" />
                </button>
            </div>
            ))}
        </div>

        {/* Common Keys Analysis */}
        {commonKeys.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col min-h-0 flex-1">
                <div className="px-2 mb-2 flex items-center justify-between">
                     <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                        <Hash className="w-3 h-3" /> Repeated Keys
                     </span>
                     <div className="flex gap-1">
                        <button 
                            onClick={handleCopyJsonReport} 
                            title="Copy JSON Report"
                            className="text-gray-500 hover:text-white transition-colors p-1"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button 
                            onClick={handleDownloadCsvReport} 
                            title="Download CSV Report"
                            className="text-gray-500 hover:text-green-400 transition-colors p-1"
                        >
                            <FileSpreadsheet className="w-3 h-3" />
                        </button>
                     </div>
                </div>
                <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar flex-1">
                    {commonKeys.map(([key, count]) => (
                        <div 
                            key={key} 
                            className="flex items-center justify-between px-3 py-1.5 bg-gray-700/50 hover:bg-purple-900/30 rounded text-xs text-gray-300 cursor-pointer transition-colors group"
                            onMouseEnter={() => onKeyHover && onKeyHover(key)}
                            onMouseLeave={() => onKeyHover && onKeyHover(null)}
                        >
                            <span className="truncate font-mono mr-2 group-hover:text-purple-300">{key}</span>
                            <span className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[20px] text-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div 
        className="p-4 border-t border-gray-700 bg-gray-800/50 shrink-0"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-6 h-6 mb-2 text-gray-400" />
            <p className="text-xs text-gray-400">Drag files or click to add</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            multiple 
            accept=".json,.txt,.md"
            onChange={handleFileInput}
          />
        </label>
      </div>
    </div>
  );
};

export default Sidebar;