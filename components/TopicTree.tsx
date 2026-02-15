import React, { useState, useMemo, useRef } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { FlatNode } from '../types';

interface TopicTreeProps {
  nodes: FlatNode[];
  hoveredNodeId: string | null;
  onHover: (id: string | null) => void;
  highlightedKey?: string | null;
}

const TopicTree: React.FC<TopicTreeProps> = ({ nodes, hoveredNodeId, onHover, highlightedKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(collapsedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setCollapsedIds(newSet);
  };

  // Filter nodes based on collapsed state
  // Logic: Iterate linearly. If we encounter a collapsed node, mark its depth.
  // Skip all subsequent nodes that have depth > collapsed depth.
  const visibleNodes = useMemo(() => {
    const result: FlatNode[] = [];
    let hiddenUntilDepth = -1;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (hiddenUntilDepth !== -1) {
            if (node.depth > hiddenUntilDepth) {
                // This is a child of a collapsed node, skip it
                continue;
            } else {
                // We reached a sibling or higher level, reset visibility
                hiddenUntilDepth = -1;
            }
        }

        result.push(node);

        // If this node is collapsed, set the hidden threshold
        if (collapsedIds.has(node.id)) {
            hiddenUntilDepth = node.depth;
        }
    }
    return result;
  }, [nodes, collapsedIds]);

  return (
    <div className="h-full flex flex-col bg-transparent w-full">
      <div className="h-8 bg-gray-900/50 border-b border-gray-700 flex items-center px-3 shrink-0">
        <span className="font-semibold text-[10px] text-gray-500 uppercase tracking-wider">Hierarchy</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar" ref={containerRef}>
        {visibleNodes.map((node, index) => {
          // Check original array for next sibling to determine if it's a container
          // We must find the index in original 'nodes' array to check next node
          const originalIndex = nodes.findIndex(n => n.id === node.id);
          const isContainer = node.value === '' || (nodes[originalIndex + 1] && nodes[originalIndex + 1].depth > node.depth);
          
          const isHovered = hoveredNodeId === node.id;
          const isKeyMatch = highlightedKey && node.key === highlightedKey;
          const isCollapsed = collapsedIds.has(node.id);
          
          let rowClass = 'text-gray-400 hover:bg-gray-700/50 border-l-2 border-transparent';
          
          if (isHovered) {
              rowClass = 'bg-blue-900/40 text-blue-200 border-l-2 border-blue-500 pl-1.5';
          } else if (isKeyMatch) {
              rowClass = 'bg-purple-900/30 text-purple-200 border-l-2 border-purple-500/50 pl-1.5';
          }

          return (
            <div
              key={node.id}
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm transition-all ${rowClass}`}
              style={{ marginLeft: `${node.depth * 14}px` }}
              onMouseEnter={() => onHover(node.id)}
              onMouseLeave={() => onHover(null)}
              onClick={(e) => isContainer ? toggleCollapse(node.id, e) : null}
            >
              <div className="flex-shrink-0 relative flex items-center justify-center w-4 h-4">
                  {isContainer && (
                      <div className="absolute -left-3 text-gray-500 hover:text-white">
                          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                  )}
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