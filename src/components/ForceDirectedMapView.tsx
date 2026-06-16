import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Item, Container, Tag, ItemTag, Link, CodeStage, getStageColor, getItemBorderColor, CODE_STAGE_INDICATORS } from '../types';

interface ForceDirectedMapViewProps {
  items: Item[];
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  getTagsForItem: (itemId: string) => Tag[];
  getItemContainer: (item: Item) => Container | null;
  onItemSelect: (itemId: string) => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  item: Item;
  container: Container | null;
  tags: Tag[];
  radius: number;
}

interface Edge {
  source: string;
  target: string;
  label?: string;
}

const ForceDirectedMapView: React.FC<ForceDirectedMapViewProps> = ({
  items,
  containers,
  tags,
  itemTags,
  links,
  getTagsForItem,
  getItemContainer,
  onItemSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Convert items to nodes
  const initializeNodes = useCallback(() => {
    const newNodes: Node[] = items.map((item, index) => {
      const container = getItemContainer(item);
      const itemTags = getTagsForItem(item.id);
      
      // Position items in a circle initially
      const angle = (index / items.length) * Math.PI * 2;
      const radius = 200;
      const x = Math.cos(angle) * radius + 400;
      const y = Math.sin(angle) * radius + 300;
      
      return {
        id: item.id,
        x,
        y,
        vx: 0,
        vy: 0,
        item,
        container,
        tags: itemTags,
        radius: 30, // Base radius
      };
    });
    
    setNodes(newNodes);
  }, [items, getItemContainer, getTagsForItem]);

  // Convert links to edges
  const initializeEdges = useCallback(() => {
    const newEdges: Edge[] = links.map(link => ({
      source: link.from_item,
      target: link.to_item,
      label: link.label,
    }));
    setEdges(newEdges);
  }, [links]);

  // Initialize nodes and edges
  useEffect(() => {
    initializeNodes();
    initializeEdges();
  }, [initializeNodes, initializeEdges]);

  // Force simulation parameters
  const repulsionStrength = 1000;
  const stiffness = 0.1;
  const damping = 0.8;
  const gravity = 0.01;
  const centerX = 400;
  const centerY = 300;

  // Update node positions using force simulation
  const updatePositions = useCallback(() => {
    if (nodes.length === 0) return;
    
    const newNodes = nodes.map(node => {
      // Skip dragged node
      if (node.id === draggedNode) {
        return node;
      }
      
      let fx = 0;
      let fy = 0;
      
      // Repulsion from all other nodes
      nodes.forEach(other => {
        if (other.id === node.id) return;
        
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Avoid division by zero and very close nodes
        if (distance < 10) {
          distance = 10;
        }
        
        // Repulsion force (inverse square law)
        const repulsion = repulsionStrength / (distance * distance);
        fx -= (dx / distance) * repulsion;
        fy -= (dy / distance) * repulsion;
      });
      
      // Attraction from connected nodes (spring force)
      const connectedNodes = edges.filter(e => 
        e.source === node.id || e.target === node.id
      );
      
      connectedNodes.forEach(edge => {
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const otherNode = nodes.find(n => n.id === otherId);
        if (!otherNode) return;
        
        const dx = otherNode.x - node.x;
        const dy = otherNode.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Spring force (Hooke's law)
        const springForce = stiffness * (distance - 200);
        fx += (dx / distance) * springForce;
        fy += (dy / distance) * springForce;
      });
      
      // Gravity towards center
      fx -= (node.x - centerX) * gravity;
      fy -= (node.y - centerY) * gravity;
      
      // Update velocity
      const newVx = node.vx * damping + fx * 0.1;
      const newVy = node.vy * damping + fy * 0.1;
      
      // Update position
      const newX = node.x + newVx;
      const newY = node.y + newVy;
      
      return {
        ...node,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
      };
    });
    
    setNodes(newNodes);
  }, [nodes, edges, draggedNode]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      updatePositions();
      drawCanvas();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updatePositions]);

  // Draw on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges first (so they appear behind nodes)
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw arrowhead
      const angle = Math.atan2(
        targetNode.y - sourceNode.y,
        targetNode.x - sourceNode.x
      );
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      
      ctx.beginPath();
      ctx.moveTo(targetNode.x, targetNode.y);
      ctx.lineTo(
        targetNode.x - Math.cos(angle - arrowAngle) * arrowLength,
        targetNode.y - Math.sin(angle - arrowAngle) * arrowLength
      );
      ctx.lineTo(
        targetNode.x - Math.cos(angle + arrowAngle) * arrowLength,
        targetNode.y - Math.sin(angle + arrowAngle) * arrowLength
      );
      ctx.closePath();
      ctx.fillStyle = '#999999';
      ctx.fill();
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;
      const isDragged = draggedNode === node.id;
      
      // Determine node color based on stage
      const stage = node.item.stage as CodeStage;
      const stageColor = getStageColor(stage);
      const borderColor = getItemBorderColor(node.item, tags, itemTags);
      
      // Draw node background
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * (isHovered ? 1.2 : 1), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Draw node border
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * (isHovered ? 1.2 : 1), 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? '#4A6FA5' : borderColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw CODE stage indicator
      const stageIndicator = CODE_STAGE_INDICATORS[stage];
      ctx.fillStyle = stageColor;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stageIndicator, node.x, node.y + node.radius + 15);
      
      // Draw item title
      const title = node.item.title || 'Untitled';
      ctx.fillStyle = '#1A1A1A';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      
      // Truncate title if too long
      const maxWidth = node.radius * 4;
      let displayTitle = title;
      if (ctx.measureText(displayTitle).width > maxWidth) {
        displayTitle = title.slice(0, 10) + '...';
      }
      ctx.fillText(displayTitle, node.x, node.y + node.radius + 30);
      
      // Draw container name if available
      if (node.container) {
        ctx.fillStyle = '#666666';
        ctx.font = '10px sans-serif';
        ctx.fillText(node.container.name, node.x, node.y + node.radius + 45);
      }
    });
  }, [nodes, edges, hoveredNode, selectedNode, draggedNode, tags, itemTags]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a node
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );
      return distance <= node.radius * (hoveredNode === node.id ? 1.2 : 1);
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      onItemSelect(clickedNode.id);
    } else {
      setSelectedNode(null);
    }
  }, [nodes, hoveredNode, onItemSelect]);

  // Handle canvas mouse move
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if hovering over a node
    const hovered = nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );
      return distance <= node.radius * 1.2;
    });
    
    setHoveredNode(hovered?.id || null);
    
    // Handle node dragging
    if (draggedNode) {
      const newNodes = nodes.map(node => {
        if (node.id === draggedNode) {
          return {
            ...node,
            x,
            y,
            vx: 0,
            vy: 0,
          };
        }
        return node;
      });
      setNodes(newNodes);
    }
  }, [nodes, draggedNode]);

  // Handle canvas mouse down
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a node
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );
      return distance <= node.radius * (hoveredNode === node.id ? 1.2 : 1);
    });
    
    if (clickedNode) {
      setDraggedNode(clickedNode.id);
    }
  }, [nodes, hoveredNode]);

  // Handle canvas mouse up
  const handleCanvasMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Handle canvas mouse leave
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // Handle double click to create new item
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create new node at click position
    // This would need to be handled by parent component
    console.log('Double click at:', x, y);
  }, []);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div
      className="force-directed-map"
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseLeave}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <canvas
        ref={canvasRef}
        className="force-directed-canvas"
      />
      
      {/* Controls */}
      <div className="map-controls">
        <button 
          className="btn btn-sm"
          onClick={() => {
            // Reset view
            initializeNodes();
          }}
        >
          Reset Layout
        </button>
      </div>
    </div>
  );
};

export default ForceDirectedMapView;
