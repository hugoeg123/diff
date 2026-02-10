import React, { useEffect, useRef } from 'react';
import { Folder, FileText } from 'lucide-react';
import { FlatNode } from '../types';

interface TopicTreeProps {
  nodes: FlatNode[];
  hoveredNodeId: string | null;
  onHover: (id: string | null) => void;
  highlightedKey?: string | null;
}

const TopicTree: React.FC<TopicTreeProps> = ({ nodes, hoveredNodeId, onHover, highlightedKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to hovered node if needed (optional enhancement, kept simple for now)
  
  return (
    <div className="h-full flex flex-col bg-transparent w-full">
      <div className="h-8 bg-gray-900/50 border-b border-gray-700 flex items-center px-3 shrink-0">
        <span className="font-semibold text-[10px] text-gray-500 uppercase tracking-wider">Hierarchy</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar" ref={containerRef}>
        {nodes.map((node, index) => {
          const isContainer = node.value === '' || (nodes[index + 1] && nodes[index + 1].depth > node.depth);
          const isHovered = hoveredNodeId === node.id;
          const isKeyMatch = highlightedKey && node.key === highlightedKey;
          
          let rowClass = 'text-gray-400 hover:bg-gray-700/50 border-l-2 border-transparent';
          
          if (isHovered) {
              // Direct Hover takes precedence
              rowClass = 'bg-blue-900/40 text-blue-200 border-l-2 border-blue-500 pl-1.5';
          } else if (isKeyMatch) {
              // Key match in other docs
              rowClass = 'bg-purple-900/30 text-purple-200 border-l-2 border-purple-500/50 pl-1.5';
          }

          return (
            <div
              key={node.id}
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm transition-all ${rowClass}`}
              style={{ marginLeft: `${node.depth * 14}px` }}
              onMouseEnter={() => onHover(node.id)}
              onMouseLeave={() => onHover(null)}
            >
              <div className="flex-shrink-0">
                  {isContainer ? (
                     <Folder className={`w-3.5 h-3.5 ${isHovered ? 'text-blue-400' : (isKeyMatch ? 'text-purple-400' : 'text-yellow-600')}`} />
                  ) : (
                     <FileText className={`w-3.5 h-3.5 ${isHovered ? 'text-gray-300' : (isKeyMatch ? 'text-purple-300' : 'text-gray-600')}`} />
                  )}
              </div>
              <span className={`truncate font-mono text-xs ${isContainer ? 'font-bold' : ''}`}>
                  {node.key}
              </span>
              {(isHovered || isKeyMatch) && !isContainer && typeof node.value === 'string' && (
                  <span className={`text-[10px] ml-2 truncate opacity-50 flex-1 ${isKeyMatch ? 'text-purple-300' : 'text-gray-500'}`}>
                      {node.value}
                  </span>
              )}
            </div>
          );
        })}
        <div className="h-10" /> {/* Spacer */}
      </div>
    </div>
  );
};

export default TopicTree;