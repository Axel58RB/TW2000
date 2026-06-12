import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, ExcalidrawImperativeAPI, ExcalidrawElement } from '@excalidraw/excalidraw';
import { Container, Item, Tag, ItemTag, Link, getStageColor, getItemBorderColor, CODE_STAGE_INDICATORS } from '../types';

interface CanvasViewProps {
  items: Item[];
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  getTagsForItem: (itemId: string) => Tag[];
  getItemContainer: (item: Item) => Container | null;
  onItemSelect: (itemId: string) => void;
  onDoubleClick: (x: number, y: number) => void;
  onItemMove: (itemId: string, x: number, y: number) => void;
  canvasName: string;
  onCanvasNameChange: (name: string) => void;
}

const CanvasView: React.FC<CanvasViewProps> = ({
  items,
  containers,
  tags,
  itemTags,
  links,
  getTagsForItem,
  getItemContainer,
  onItemSelect,
  onDoubleClick,
  onItemMove,
  canvasName,
  onCanvasNameChange,
}) => {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);
  const [excalidrawElements, setExcalidrawElements] = useState<ExcalidrawElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Convert items to Excalidraw elements
  const convertItemsToElements = useCallback(() => {
    const elements: ExcalidrawElement[] = [];
    
    // Create elements for items
    items.forEach((item) => {
      const container = getItemContainer(item);
      const itemTags = getTagsForItem(item.id);
      const borderColor = getItemBorderColor(item, tags, itemTags);
      const stageColor = getStageColor(item.stage as CodeStage);
      
      // Create a rectangle element for each item
      const element: ExcalidrawElement = {
        id: `item-${item.id}`,
        type: 'rectangle',
        x: item.map_x,
        y: item.map_y,
        width: 200,
        height: 120,
        angle: 0,
        strokeColor: borderColor,
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        strokeSharpness: 'sharp',
        roundness: {
          type: 2,
        },
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        customData: {
          itemId: item.id,
          itemType: item.kind,
          stage: item.stage,
        },
        text: '',
      };
      
      elements.push(element);
      
      // Add text element for title
      if (item.title) {
        const textElement: ExcalidrawElement = {
          id: `text-${item.id}`,
          type: 'text',
          x: item.map_x + 10,
          y: item.map_y + 10,
          width: 180,
          height: 20,
          angle: 0,
          strokeColor: '#000000',
          backgroundColor: '#ffffff',
          fillStyle: 'solid',
          strokeWidth: 0,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [`item-${item.id}`],
          strokeSharpness: 'sharp',
          roundness: null,
          seed: Math.floor(Math.random() * 1000000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          customData: {
            itemId: item.id,
          },
          text: item.title,
          fontSize: 16,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 15,
        };
        
        elements.push(textElement);
      }
      
      // Add text element for CODE stage indicator
      const stageIndicator = CODE_STAGE_INDICATORS[item.stage as CodeStage];
      const stageTextElement: ExcalidrawElement = {
        id: `stage-${item.id}`,
        type: 'text',
        x: item.map_x + 10,
        y: item.map_y + 40,
        width: 100,
        height: 20,
        angle: 0,
        strokeColor: stageColor,
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 0,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [`item-${item.id}`],
        strokeSharpness: 'sharp',
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        customData: {
          itemId: item.id,
          stage: item.stage,
        },
        text: stageIndicator,
        fontSize: 14,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        baseline: 13,
      };
      
      elements.push(stageTextElement);
      
      // Add text element for body preview (truncated)
      if (item.body) {
        const bodyPreview = item.body.length > 60 ? item.body.slice(0, 60) + '...' : item.body;
        const bodyTextElement: ExcalidrawElement = {
          id: `body-${item.id}`,
          type: 'text',
          x: item.map_x + 10,
          y: item.map_y + 70,
          width: 180,
          height: 40,
          angle: 0,
          strokeColor: '#666666',
          backgroundColor: '#ffffff',
          fillStyle: 'solid',
          strokeWidth: 0,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [`item-${item.id}`],
          strokeSharpness: 'sharp',
          roundness: null,
          seed: Math.floor(Math.random() * 1000000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          customData: {
            itemId: item.id,
          },
          text: bodyPreview,
          fontSize: 12,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 11,
        };
        
        elements.push(bodyTextElement);
      }
    });
    
    // Create elements for links between items
    links.forEach((link) => {
      const fromItem = items.find(i => i.id === link.from_item);
      const toItem = items.find(i => i.id === link.to_item);
      
      if (fromItem && toItem) {
        const arrowElement: ExcalidrawElement = {
          id: `link-${link.from_item}-${link.to_item}`,
          type: 'arrow',
          x: fromItem.map_x + 200,
          y: fromItem.map_y + 60,
          width: 0,
          height: 0,
          angle: 0,
          strokeColor: '#999999',
          backgroundColor: '#ffffff',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          strokeSharpness: 'sharp',
          roundness: {
            type: 2,
          },
          seed: Math.floor(Math.random() * 1000000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          customData: {
            linkId: `${link.from_item}-${link.to_item}`,
            fromItem: link.from_item,
            toItem: link.to_item,
            label: link.label,
          },
          startBinding: {
            elementId: `item-${link.from_item}`,
            gap: 1,
            focus: 0,
          },
          endBinding: {
            elementId: `item-${link.to_item}`,
            gap: 1,
            focus: 0,
          },
          startArrowhead: null,
          endArrowhead: 'arrow',
          points: [
            [fromItem.map_x + 200, fromItem.map_y + 60],
            [toItem.map_x, toItem.map_y],
          ],
        };
        
        elements.push(arrowElement);
      }
    });
    
    return elements;
  }, [items, containers, tags, itemTags, links, getTagsForItem, getItemContainer]);

  // Update elements when items change
  useEffect(() => {
    const elements = convertItemsToElements();
    setExcalidrawElements(elements);
  }, [convertItemsToElements]);

  // Handle element selection
  const handleElementSelect = useCallback((element: ExcalidrawElement | null) => {
    if (element && element.customData?.itemId) {
      setSelectedElementId(element.id);
      onItemSelect(element.customData.itemId);
    } else {
      setSelectedElementId(null);
    }
  }, [onItemSelect]);

  // Handle pointer down on canvas
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (event.detail === 2) {
      // Double click
      const excalidraw = excalidrawRef.current;
      if (excalidraw) {
        const { x, y } = excalidraw.getPointerPosition();
        onDoubleClick(x, y);
      }
    }
  }, [onDoubleClick]);

  // Handle element move
  const handleElementMove = useCallback((elements: ExcalidrawElement[]) => {
    elements.forEach((element) => {
      if (element.customData?.itemId && element.type === 'rectangle') {
        const itemId = element.customData.itemId;
        onItemMove(itemId, element.x, element.y);
      }
    });
  }, [onItemMove]);

  // Handle element delete
  const handleElementDelete = useCallback((elements: ExcalidrawElement[]) => {
    elements.forEach((element) => {
      if (element.customData?.itemId) {
        // Would need to delete the item from database
        console.log('Delete item:', element.customData.itemId);
      }
    });
  }, []);

  // Excalidraw configuration
  const excalidrawConfig = {
    excalidraw: {
      // Disable freehand drawing (mouse/keyboard only)
      UIOptions: {
        canvasActions: {
          changeViewBackgroundColor: true,
          clearCanvas: false,
          export: false,
          load: false,
          save: false,
        },
      },
    },
  };

  return (
    <div className="canvas-view">
      <div 
        className="canvas-header" 
        style={{
          padding: '12px 16px',
          backgroundColor: '#f8f8f8',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={canvasName}
          onChange={(e) => onCanvasNameChange(e.target.value)}
          style={{
            fontSize: '16px',
            fontWeight: '500',
            border: 'none',
            background: 'transparent',
            padding: '4px 0',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-sm"
            onClick={() => {
              // Zoom to fit
              excalidrawRef.current?.zoomToFit();
            }}
          >
            Zoom to Fit
          </button>
        </div>
      </div>
      
      <div 
        className="excalidraw-container"
        onPointerDown={handlePointerDown}
      >
        <Excalidraw
          ref={excalidrawRef}
          initialData={{
            elements: excalidrawElements,
            appState: {
              gridSize: null,
              viewBackgroundColor: '#ffffff',
            },
          }}
          onChange={(elements) => {
            setExcalidrawElements(elements);
            handleElementMove(elements);
          }}
          onDelete={(elements) => handleElementDelete(elements)}
          onPointerUpdate={(payload) => {
            if (payload.isDragging && payload.lastCommittedPoint) {
              // Handle drag
            }
          }}
          onSelectionChange={(elements) => {
            if (elements.length > 0) {
              handleElementSelect(elements[0]);
            } else {
              handleElementSelect(null);
            }
          }}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: false,
              export: false,
              load: false,
              save: false,
            },
          }}
        />
      </div>
    </div>
  );
};

export default CanvasView;
