import { FlatNode } from './types';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Flattens a nested JSON object into a list of nodes with depth.
 */
export const flattenJson = (data: any, depth = 0, parentKey = ''): FlatNode[] => {
  let nodes: FlatNode[] = [];

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
        // Handle Arrays as list of values if primitive, or recursing if objects
        data.forEach((item, index) => {
            if (typeof item === 'object') {
                 // Represents a grouping node in array
                 nodes.push({
                    id: generateId(),
                    key: `[${index}]`,
                    value: '',
                    depth: depth
                 })
                 nodes = nodes.concat(flattenJson(item, depth + 1));
            } else {
                 nodes.push({
                    id: generateId(),
                    key: `[${index}]`,
                    value: item,
                    depth: depth
                 });
            }
        })
    } else {
        // Handle Objects
        Object.keys(data).forEach((key) => {
            const value = data[key];
            if (typeof value === 'object' && value !== null) {
                // It's a parent node (topic/folder)
                nodes.push({
                    id: generateId(),
                    key: key,
                    value: '', // No direct value, it's a container
                    depth: depth
                });
                nodes = nodes.concat(flattenJson(value, depth + 1));
            } else {
                // It's a leaf node
                nodes.push({
                    id: generateId(),
                    key: key,
                    value: value,
                    depth: depth
                });
            }
        });
    }
  }
  return nodes;
};

/**
 * Reconstructs a nested JSON object from the flat list based on depth.
 */
export const nestJson = (nodes: FlatNode[]): any => {
    if (nodes.length === 0) return {};

    const root: any = {};
    const stack: { obj: any; depth: number }[] = [{ obj: root, depth: -1 }];

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Adjust stack based on depth
        // Ensure we don't pop the root
        while (stack.length > 1 && stack[stack.length - 1].depth >= node.depth) {
            stack.pop();
        }

        const parent = stack[stack.length - 1].obj;
        
        // Determine if next node is a child (deeper)
        const nextNode = nodes[i + 1];
        const isParent = nextNode && nextNode.depth > node.depth;

        if (isParent) {
            // Create a new container (Object for now, logic could be enhanced for Arrays)
            const newObj = {};
            // If parent is array, push. If object, assign key.
            if (Array.isArray(parent)) {
                parent.push(newObj); // This simplifies array handling for visual editor
            } else {
                parent[node.key] = newObj;
            }
            stack.push({ obj: newObj, depth: node.depth });
        } else {
            // Leaf node
             if (Array.isArray(parent)) {
                 // Very simplified array handling for this specific hashtag editor logic
                parent.push(node.value);
            } else {
                parent[node.key] = node.value;
            }
        }
    }

    return root;
};

/**
 * Checks if a string exists in the source text.
 */
export const checkMatch = (value: any, source: string): boolean => {
    if (!value || typeof value !== 'string') return true; // Ignore non-strings or empty
    // Normalize slightly (remove excess whitespace)
    const normalizedValue = String(value).trim();
    if (normalizedValue.length === 0) return true;
    return source.includes(normalizedValue);
};

/**
 * Generate standard hashtag string from depth
 */
export const getHashTags = (depth: number): string => {
    return '#'.repeat(depth + 1);
}