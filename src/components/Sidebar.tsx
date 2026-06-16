import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Container, Tag, ParaType, ViewMode, COLORS, PARA_LABELS } from '../types';

interface SidebarProps {
  containers: Container[];
  tags: Tag[];
  items: any[];
  selectedContainerId: string | null;
  selectedTagId: string | null;
  onContainerSelect: (containerId: string | null) => void;
  onCreateItem: () => void;
  onCreateContainer: (name: string, para: ParaType, colour?: string) => Promise<void>;
  onCreateTag: (name: string, colour?: string, parentId?: string) => Promise<void>;
  onQuickCapture: (text: string) => Promise<void>;
  onTagSelect: (tagId: string | null) => void;
  collapsed: boolean;
  onToggle: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  containers,
  tags,
  items,
  selectedContainerId,
  selectedTagId,
  onContainerSelect,
  onCreateItem,
  onCreateContainer,
  onCreateTag,
  onQuickCapture,
  onTagSelect,
  collapsed,
  onToggle,
  searchQuery,
  onSearch,
  viewMode,
  onViewModeChange,
}) => {
  const [showNewContainer, setShowNewContainer] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerPara, setNewContainerPara] = useState<ParaType>('project');
  const [newContainerColour, setNewContainerColour] = useState<string>(COLORS.project);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColour, setNewTagColour] = useState<string>(COLORS.moss);
  const [captureText, setCaptureText] = useState('');
  const captureInputRef = useRef<HTMLInputElement>(null);

  // Get PARA groups
  const paraGroups: Record<ParaType, Container[]> = {
    inbox: [],
    project: [],
    area: [],
    resource: [],
    archive: [],
  };

  containers.forEach(container => {
    if (paraGroups[container.para as ParaType]) {
      paraGroups[container.para as ParaType].push(container);
    }
  });

  // Count items in each container
  const getItemCount = useCallback((containerId: string | null) => {
    if (containerId === null) {
      return items.filter(item => item.container_id === null).length;
    }
    return items.filter(item => item.container_id === containerId).length;
  }, [items]);

  // Handle quick capture
  const handleQuickCapture = useCallback(async () => {
    if (captureText.trim()) {
      await onQuickCapture(captureText.trim());
      setCaptureText('');
    }
  }, [captureText, onQuickCapture]);

  // Handle capture on Enter key
  const handleCaptureKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickCapture();
    } else if (e.key === 'Escape') {
      setCaptureText('');
      if (captureInputRef.current) {
        captureInputRef.current.blur();
      }
    }
  }, [handleQuickCapture]);

  const handleCreateContainer = useCallback(async () => {
    if (newContainerName.trim()) {
      await onCreateContainer(newContainerName, newContainerPara, newContainerColour);
      setNewContainerName('');
      setNewContainerPara('project');
      setNewContainerColour(COLORS.project);
      setShowNewContainer(false);
    }
  }, [newContainerName, newContainerPara, newContainerColour, onCreateContainer]);

  const handleCreateTag = useCallback(async () => {
    if (newTagName.trim()) {
      await onCreateTag(newTagName, newTagColour);
      setNewTagName('');
      setNewTagColour(COLORS.moss);
      setShowNewTag(false);
    }
  }, [newTagName, newTagColour, onCreateTag]);

  if (collapsed) {
    return (
      <aside className="sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggle} title="Expand sidebar">
          ▶
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Typewriter 3000</h2>
        <button className="sidebar-toggle" onClick={onToggle} title="Collapse sidebar">
          ◀
        </button>
      </div>

      {/* Quick Capture Box */}
      <div className="capture-box">
        <input
          ref={captureInputRef}
          type="text"
          placeholder="Capture to Inbox…"
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          onKeyDown={handleCaptureKeyDown}
          onBlur={handleQuickCapture}
        />
      </div>

      {/* PARA Sections */}
      {(['inbox', 'project', 'area', 'resource', 'archive'] as ParaType[]).map((para) => {
        const paraContainers = paraGroups[para];
        if (paraContainers.length === 0) return null;

        return (
          <div key={para} className="sidebar-section">
            <div className="sidebar-section-title">
              {PARA_LABELS[para]}
            </div>
            <ul className="sidebar-list">
              {paraContainers.map((container) => (
                <li key={container.id}>
                  <div
                    className={`sidebar-item para-${para} ${selectedContainerId === container.id ? 'active' : ''}`}
                    onClick={() => onContainerSelect(container.id)}
                  >
                    <span 
                      className="sidebar-item-icon" 
                      style={{ backgroundColor: container.colour || COLORS[para] }}
                    />
                    <span className="sidebar-item-label">{container.name}</span>
                    <span className="sidebar-item-count">{getItemCount(container.id)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Add new container */}
      {showNewContainer ? (
        <div className="sidebar-section">
          <div className="sidebar-section-title">New Container</div>
          <div style={{ padding: '8px 16px' }}>
            <input
              type="text"
              placeholder="Container name"
              value={newContainerName}
              onChange={(e) => setNewContainerName(e.target.value)}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <select
              value={newContainerPara}
              onChange={(e) => setNewContainerPara(e.target.value as ParaType)}
              style={{ width: '100%', marginBottom: '8px' }}
            >
              <option value="project">Project</option>
              <option value="area">Area</option>
              <option value="resource">Resource</option>
              <option value="archive">Archive</option>
            </select>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleCreateContainer}
              >
                Create
              </button>
              <button 
                className="btn btn-sm"
                onClick={() => setShowNewContainer(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sidebar-section">
          <button 
            className="btn btn-sm"
            onClick={() => setShowNewContainer(true)}
            style={{ width: '100%' }}
          >
            + New Container
          </button>
        </div>
      )}

      {/* Tags Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Tags</div>
        <div className="tag-list">
          {tags.map((tag) => {
            const isSelected = selectedTagId === tag.id;
            return (
              <div 
                key={tag.id} 
                className={`tag-chip ${isSelected ? 'selected' : ''}`}
                style={{ 
                  backgroundColor: isSelected ? (tag.colour || '#ccc') : (tag.colour ? `${tag.colour}20` : '#e0e0e0'),
                  borderColor: tag.colour || '#ccc',
                  color: isSelected ? 'white' : (tag.colour || '#666')
                }}
                onClick={() => {
                  // Toggle tag filter
                  if (selectedTagId === tag.id) {
                    onTagSelect(null);
                  } else {
                    onTagSelect(tag.id);
                  }
                }}
              >
                <span 
                  className="tag-dot" 
                  style={{ backgroundColor: tag.colour || '#ccc' }}
                />
                {tag.name}
              </div>
            );
          })}
        </div>
        
        {showNewTag ? (
          <div style={{ padding: '8px 16px' }}>
            <input
              type="text"
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleCreateTag}
              >
                Create
              </button>
              <button 
                className="btn btn-sm"
                onClick={() => setShowNewTag(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="btn btn-sm"
            onClick={() => setShowNewTag(true)}
            style={{ width: '100%', marginTop: '8px' }}
          >
            + New Tag
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="sidebar-section">
        <button 
          className="btn btn-primary btn-sm"
          onClick={onCreateItem}
          style={{ width: '100%' }}
        >
          + New Item
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
