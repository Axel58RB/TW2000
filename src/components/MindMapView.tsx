import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Panel,
} from 'react-flow-renderer';
import { Item, Container, Tag, ItemTag, Link, getStageColor, CODE_STAGE_INDICATORS } from '../types';

interface MindMapViewProps {
  items: Item[];
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  getTagsForItem: (itemId: string) => Tag[];
  getItemContainer: (item: Item) => Container | null;
  onItemSelect: (itemId: string) => void;
}

// Custom node component
const CustomNode: React.FC<{ data: any }> = ({ data }) => {
  const stageColor = getStageColor(data.stage as CodeStage);
  const stageIndicator = CODE_STAGE_INDICATORS[data.stage as CodeStage];

  return (
    <div 
      style={{
        padding: '12px',
        background: 'white',
        borderRadius: '8px',
        border: `2px solid ${stageColor}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minWidth: '200px',
      }}
      onClick={() => data.onSelect?.(data.itemId)}
    >
      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
        {data.label}
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: stageColor,
        marginBottom: '4px',
      }}>
        {stageIndicator}
      </div>
      {data.container && (
        <div style={{
          fontSize: '11px',
          padding: '2px 6px',
          backgroundColor: data.containerColour ? `${data.containerColour}20` : '#e0e0e0',
          color: data.containerColour || '#666',
          borderRadius: '4px',
          display: 'inline-block',
        }}>
          {data.container}
        </div>
      )}
      {data.tags && data.tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginTop: '6px',
        }}>
          {data.tags.map((tag: any) => (
            <span 
              key={tag.id}
              style={{
                fontSize: '10px',
                padding: '2px 4px',
                backgroundColor: tag.colour ? `${tag.colour}20` : '#e0e0e0',
                color: tag.colour || '#666',
                borderRadius: '4px',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const MindMapView: React.FC<MindMapViewProps> = ({
  items,
  containers,
  tags,
  itemTags,
  links,
  getTagsForItem,
  getItemContainer,
  onItemSelect,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Convert items to nodes
  const convertItemsToNodes = useCallback(() => {
    const nodeList: Node[] = [];
    
    items.forEach((item, index) => {
      const container = getItemContainer(item);
      const itemTags = getTagsForItem(item.id);
      
      nodeList.push({
        id: item.id,
        type: 'custom',
        data: {
          label: item.title || 'Untitled',
          itemId: item.id,
          stage: item.stage,
          container: container?.name,
          containerColour: container?.colour,
          tags: itemTags,
          onSelect: onItemSelect,
        },
        position: { x: item.map_x, y: item.map_y },
      });
    });
    
    return nodeList;
  }, [items, getTagsForItem, getItemContainer, onItemSelect]);

  // Convert links to edges
  const convertLinksToEdges = useCallback(() => {
    const edgeList: Edge[] = [];
    
    links.forEach((link) => {
      edgeList.push({
        id: `${link.from_item}-${link.to_item}`,
        source: link.from_item,
        target: link.to_item,
        label: link.label || '',
        labelStyle: { fill: '#666', fontSize: 12 },
        style: { stroke: '#999', strokeWidth: 2 },
        animated: false,
        arrowHeadType: 'arrowclosed',
      });
    });
    
    return edgeList;
  }, [links]);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(convertItemsToNodes());
    setEdges(convertLinksToEdges());
  }, [convertItemsToNodes, convertLinksToEdges]);

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.data?.itemId) {
      onItemSelect(node.data.itemId);
    }
  }, [onItemSelect]);

  // Handle connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ 
        ...params, 
        id: `${params.source}-${params.target}`,
        animated: false,
        style: { stroke: '#999', strokeWidth: 2 },
        arrowHeadType: 'arrowclosed',
      }, eds));
    },
    [setEdges]
  );

  // Fit view on load
  useEffect(() => {
    if (nodes.length > 0 && reactFlowWrapper.current) {
      const { fitView } = reactFlowWrapper.current;
      fitView({ padding: 0.5 });
    }
  }, [nodes]);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🧠</div>
        <div className="empty-state-title">No items in mind map</div>
        <div className="empty-state-description">
          Create items and links to visualize connections
        </div>
      </div>
    );
  }

  return (
    <div 
      className="mindmap-container"
      ref={reactFlowWrapper}
      style={{ height: '100%' }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.5 }}
        >
          <Background color="#f8f8f8" gap={16} />
          <Controls />
          <Panel position="top-left">
            <div style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
              {nodes.length} items • {edges.length} connections
            </div>
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default MindMapView;
