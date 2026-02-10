import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { DocumentData, FlatNode } from '../types';

interface TreeAnalystProps {
    document: DocumentData;
}

/**
 * A D3 visualization of the document structure depth/complexity.
 * This satisfies the library requirement and provides a "Macro" view.
 */
const TreeAnalyst: React.FC<TreeAnalystProps> = ({ document }) => {
    const d3Container = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (document && d3Container.current) {
            const svg = d3.select(d3Container.current);
            svg.selectAll("*").remove();

            const width = 300;
            const height = 200;
            const margin = { top: 20, right: 20, bottom: 20, left: 40 };

            // Simple bar chart of node depths
            const data = document.flatNodes.map((n, i) => ({ 
                index: i, 
                depth: n.depth,
                isMatch: n.isMatch 
            }));

            const x = d3.scaleLinear()
                .domain([0, data.length])
                .range([margin.left, width - margin.right]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.depth) || 5])
                .range([height - margin.bottom, margin.top]);

            // Draw area
            const area = d3.area<{index: number, depth: number}>()
                .x(d => x(d.index))
                .y0(height - margin.bottom)
                .y1(d => y(d.depth))
                .curve(d3.curveStepAfter);

            svg.append("path")
                .datum(data)
                .attr("fill", "#3b82f6")
                .attr("fill-opacity", 0.3)
                .attr("stroke", "#2563eb")
                .attr("stroke-width", 1.5)
                .attr("d", area);
            
            // Highlight mismatched nodes as red dots
            svg.selectAll("circle")
                .data(data.filter(d => d.isMatch === false))
                .enter()
                .append("circle")
                .attr("cx", d => x(d.index))
                .attr("cy", d => y(d.depth))
                .attr("r", 2)
                .attr("fill", "#ef4444");

            // Axes
            svg.append("g")
                .attr("transform", `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
                .attr("color", "#9ca3af");

            svg.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(y).ticks(5))
                .attr("color", "#9ca3af");
        }
    }, [document]);

    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm h-full flex flex-col">
            <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Structure Density</h3>
            <svg 
                className="w-full h-full" 
                ref={d3Container}
                viewBox="0 0 300 200"
                preserveAspectRatio="xMidYMid meet"
            />
        </div>
    );
};

export default TreeAnalyst;