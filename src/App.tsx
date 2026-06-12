import React, { useState, useEffect, useCallback } from 'react';
import { useDatabase, getItemTags, getContainerById } from './utils/db';
import { Container, Item, Tag, ItemTag, Link, ViewMode, ParaType, COLORS } from './types';
import Sidebar from './components/Sidebar';
import CanvasView from './components/CanvasView';
import ItemEditor from './components/ItemEditor';
import ThreadView from './components/ThreadView';
import EvidenceDashboard from './components/EvidenceDashboard';
import MindMapView from './components/MindMapView';

const App: React.FC = () => {
  const { data, refresh, ...dbActions } = useDatabase();
  const [viewMode, setViewMode] = useState<ViewMode>('freeform');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [canvasName, setCanvasName] = useState('Untitled Canvas');

  // Initialize with default containers if none exist
  useEffect(() => {
    if (data.containers.length === 0 && !data.loading) {
      const initDefaultContainers = async () => {
        const defaultContainers = [
          { name: 'Inbox', para: 'inbox' as ParaType, colour: COLORS.inbox },
          { name: 'Projects', para: 'project' as ParaType, colour: COLORS.project },
          { name: 'Areas', para: 'area' as ParaType, colour: COLORS.area },
          { name: 'Resources', para: 'resource' as ParaType, colour: COLORS.resource },
          { name: 'Archive', para: 'archive' as ParaType, colour: COLORS.archive },
        ];

        for (const container of defaultContainers) {
          await dbActions.createContainer(container.name, container.para, container.colour);
        }
        await refresh();
      };
      initDefaultContainers();
    }
  }, [data.containers.length, data.loading, dbActions, refresh]);

  // Handle container selection
  const handleContainerSelect = useCallback((containerId: string | null) => {
    setSelectedContainerId(containerId);
    setSelectedItemId(null);
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    const item = data.items.find(i => i.id === itemId);
    if (item) {
      setEditingItem(item);
      setShowItemEditor(true);
    }
  }, [data.items]);

  // Handle double-click on canvas to create new item
  const handleCanvasDoubleClick = useCallback(async (x: number, y: number) => {
    const container = getContainerById(selectedContainerId, data.containers);
    const containerId = container?.id || null;
    
    const response = await dbActions.createItem(
      containerId,
      'note',
      'Untitled Note',
      '',
      x,
      y
    );
    
    if (response.success && response.data) {
      await refresh();
      setEditingItem(response.data);
      setShowItemEditor(true);
    }
  }, [selectedContainerId, data.containers, dbActions, refresh]);

  // Handle item creation
  const handleCreateItem = useCallback(async (containerId: string | null) => {
    const response = await dbActions.createItem(
      containerId,
      'note',
      'Untitled Note',
      '',
      100,
      100
    );
    
    if (response.success && response.data) {
      await refresh();
      setEditingItem(response.data);
      setShowItemEditor(true);
    }
  }, [dbActions, refresh]);

  // Handle item save
  const handleSaveItem = useCallback(async (item: Partial<Item> & { id: string }) => {
    const updates: Record<string, any> = {};
    if (item.title !== undefined) updates.title = item.title;
    if (item.body !== undefined) updates.body = item.body;
    if (item.essence !== undefined) updates.essence = item.essence;
    if (item.kind !== undefined) updates.kind = item.kind;
    if (item.stage !== undefined) updates.stage = item.stage;
    if (item.due_date !== undefined) updates.due_date = item.due_date;
    if (item.status !== undefined) updates.status = item.status;
    
    const response = await dbActions.updateItem(item.id, updates);
    if (response.success) {
      await refresh();
      setShowItemEditor(false);
      setEditingItem(null);
    }
    return response.success;
  }, [dbActions, refresh]);

  // Handle item delete
  const handleDeleteItem = useCallback(async (itemId: string) => {
    const response = await dbActions.deleteItem(itemId);
    if (response.success) {
      await refresh();
      setShowItemEditor(false);
      setEditingItem(null);
    }
  }, [dbActions, refresh]);

  // Handle archive item
  const handleArchiveItem = useCallback(async (itemId: string) => {
    const response = await dbActions.archiveItem(itemId);
    if (response.success) {
      await refresh();
    }
  }, [dbActions, refresh]);

  // Get items for current container
  const getCurrentItems = useCallback(() => {
    if (selectedContainerId === null) {
      return data.items.filter(item => item.container_id === null);
    }
    return data.items.filter(item => item.container_id === selectedContainerId);
  }, [selectedContainerId, data.items]);

  // Get tags for an item
  const getTagsForItem = useCallback((itemId: string) => {
    return getItemTags(itemId, data.itemTags, data.tags);
  }, [data.itemTags, data.tags]);

  // Get container for an item
  const getItemContainer = useCallback((item: Item) => {
    return getContainerById(item.container_id || null, data.containers);
  }, [data.containers]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const response = await dbActions.searchItems(query);
      if (response.success && response.data) {
        // Search results are handled in the view
      }
    }
  }, [dbActions]);

  // Filter items based on search
  const filteredItems = searchQuery.trim() 
    ? data.items.filter(item => 
        (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (item.body?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (item.essence?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
      )
    : getCurrentItems();

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Render different views based on viewMode
  const renderView = () => {
    switch (viewMode) {
      case 'freeform':
        return (
          <CanvasView
            items={filteredItems}
            containers={data.containers}
            tags={data.tags}
            itemTags={data.itemTags}
            links={data.links}
            getTagsForItem={getTagsForItem}
            getItemContainer={getItemContainer}
            onItemSelect={handleItemSelect}
            onDoubleClick={handleCanvasDoubleClick}
            onItemMove={(itemId, x, y) => {
              dbActions.updateItem(itemId, { map_x: x, map_y: y });
            }}
            canvasName={canvasName}
            onCanvasNameChange={setCanvasName}
          />
        );
      
      case 'mindmap':
        return (
          <MindMapView
            items={filteredItems}
            containers={data.containers}
            tags={data.tags}
            itemTags={data.itemTags}
            links={data.links}
            getTagsForItem={getTagsForItem}
            getItemContainer={getItemContainer}
            onItemSelect={handleItemSelect}
          />
        );
      
      case 'thread':
        return (
          <ThreadView
            items={filteredItems}
            containers={data.containers}
            tags={data.tags}
            itemTags={data.itemTags}
            links={data.links}
            getTagsForItem={getTagsForItem}
            getItemContainer={getItemContainer}
            onItemSelect={handleItemSelect}
          />
        );
      
      case 'evidence':
        return (
          <EvidenceDashboard
            items={data.items}
            containers={data.containers}
            tags={data.tags}
            itemTags={data.itemTags}
            links={data.links}
            getTagsForItem={getTagsForItem}
            getItemContainer={getItemContainer}
            onItemSelect={handleItemSelect}
          />
        );
      
      default:
        return null;
    }
  };

  if (data.loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading Typewriter 2000...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        containers={data.containers}
        tags={data.tags}
        selectedContainerId={selectedContainerId}
        onContainerSelect={handleContainerSelect}
        onCreateItem={() => handleCreateItem(selectedContainerId)}
        onCreateContainer={async (name, para, colour) => {
          await dbActions.createContainer(name, para, colour);
          await refresh();
        }}
        onCreateTag={async (name, colour, parentId) => {
          await dbActions.createTag(name, colour, parentId);
          await refresh();
        }}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="toolbar">
          <div className="toolbar-group">
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => handleCreateItem(selectedContainerId)}
            >
              + New Item
            </button>
          </div>
          
          <div className="toolbar-group">
            <div className="view-tabs">
              <button 
                className={`view-tab ${viewMode === 'freeform' ? 'active' : ''}`}
                onClick={() => setViewMode('freeform')}
              >
                Freeform
              </button>
              <button 
                className={`view-tab ${viewMode === 'mindmap' ? 'active' : ''}`}
                onClick={() => setViewMode('mindmap')}
              >
                Mind Map
              </button>
              <button 
                className={`view-tab ${viewMode === 'thread' ? 'active' : ''}`}
                onClick={() => setViewMode('thread')}
              >
                Thread
              </button>
              <button 
                className={`view-tab ${viewMode === 'evidence' ? 'active' : ''}`}
                onClick={() => setViewMode('evidence')}
              >
                Evidence
              </button>
            </div>
          </div>
          
          <div className="toolbar-group">
            <div className="search-box">
              <span className="search-box-icon">🔍</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="canvas-container">
          {renderView()}
        </div>
      </main>
      
      {/* Item Editor Modal */}
      {showItemEditor && editingItem && (
        <ItemEditor
          item={editingItem}
          containers={data.containers}
          tags={data.tags}
          itemTags={data.itemTags}
          links={data.links}
          onSave={handleSaveItem}
          onDelete={() => handleDeleteItem(editingItem.id)}
          onArchive={() => handleArchiveItem(editingItem.id)}
          onClose={() => {
            setShowItemEditor(false);
            setEditingItem(null);
          }}
          onAssignTag={async (tagId) => {
            await dbActions.assignTagToItem(editingItem.id, tagId);
            await refresh();
          }}
          onRemoveTag={async (tagId) => {
            await dbActions.removeTagFromItem(editingItem.id, tagId);
            await refresh();
          }}
          onMoveToContainer={async (containerId) => {
            await dbActions.moveItemToContainer(editingItem.id, containerId);
            await refresh();
          }}
          onCreateLink={async (toItemId, label) => {
            await dbActions.createLink(editingItem.id, toItemId, label);
            await refresh();
          }}
        />
      )}
    </div>
  );
};

export default App;
