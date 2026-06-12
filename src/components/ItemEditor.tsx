import React, { useState, useEffect, useCallback } from 'react';
import { Item, Container, Tag, ItemTag, Link, CodeStage, ParaType, COLORS, CODE_STAGE_INDICATORS } from '../types';
import { getItemTags } from '../utils/db';

interface ItemEditorProps {
  item: Item;
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  onSave: (item: Partial<Item> & { id: string }) => Promise<boolean>;
  onDelete: () => void;
  onArchive: () => void;
  onClose: () => void;
  onAssignTag: (tagId: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
  onMoveToContainer: (containerId: string | null) => Promise<void>;
  onCreateLink: (toItemId: string, label?: string) => Promise<void>;
}

const ItemEditor: React.FC<ItemEditorProps> = ({
  item,
  containers,
  tags,
  itemTags,
  links,
  onSave,
  onDelete,
  onArchive,
  onClose,
  onAssignTag,
  onRemoveTag,
  onMoveToContainer,
  onCreateLink,
}) => {
  const [title, setTitle] = useState(item.title || '');
  const [body, setBody] = useState(item.body || '');
  const [essence, setEssence] = useState(item.essence || '');
  const [kind, setKind] = useState<Item['kind']>(item.kind);
  const [stage, setStage] = useState<CodeStage>(item.stage as CodeStage);
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const [status, setStatus] = useState(item.status);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(item.container_id || null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [linkToItemId, setLinkToItemId] = useState<string>('');
  const [linkLabel, setLinkLabel] = useState<string>('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get current item tags
  const currentItemTags = getItemTags(item.id, itemTags, tags);

  // Update selected tag IDs when item tags change
  useEffect(() => {
    setSelectedTagIds(currentItemTags.map(tag => tag.id));
  }, [currentItemTags]);

  // Get container for current item
  const currentContainer = containers.find(c => c.id === item.container_id);

  // Handle save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const success = await onSave({
        id: item.id,
        title: title || null,
        body: body || null,
        essence: essence || null,
        kind,
        stage,
        due_date: dueDate || null,
        status,
      });
      
      if (success) {
        // If container changed, move item
        if (selectedContainerId !== item.container_id) {
          await onMoveToContainer(selectedContainerId);
        }
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [
    item.id,
    title,
    body,
    essence,
    kind,
    stage,
    dueDate,
    status,
    selectedContainerId,
    item.container_id,
    onSave,
    onMoveToContainer,
    onClose,
  ]);

  // Handle tag toggle
  const handleTagToggle = useCallback(async (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    
    if (isSelected) {
      await onRemoveTag(tagId);
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    } else {
      await onAssignTag(tagId);
      setSelectedTagIds(prev => [...prev, tagId]);
    }
  }, [selectedTagIds, onAssignTag, onRemoveTag]);

  // Handle container change
  const handleContainerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const containerId = e.target.value === '' ? null : e.target.value;
    setSelectedContainerId(containerId);
    
    // If moving from inbox to container, auto-set stage to organised
    if (containerId && !item.container_id) {
      setStage('organised');
    } else if (!containerId && item.container_id) {
      setStage('captured');
    }
  }, [item.container_id]);

  // Handle link creation
  const handleCreateLink = useCallback(async () => {
    if (linkToItemId) {
      await onCreateLink(linkToItemId, linkLabel || undefined);
      setLinkToItemId('');
      setLinkLabel('');
      setShowLinkForm(false);
    }
  }, [linkToItemId, linkLabel, onCreateLink]);

  // Get available items for linking (exclude current item)
  const availableItems = containers
    .flatMap(container => 
      [container, ...containers
        .filter(c => c.id === container.id)
        .flatMap(c => containers
          .filter(cc => cc.id === c.id)
          .flatMap(cc => [])
        )
      ]
    );

  // Filter containers by PARA type
  const paraContainers: Record<ParaType, Container[]> = {
    inbox: [],
    project: [],
    area: [],
    resource: [],
    archive: [],
  };

  containers.forEach(container => {
    if (paraContainers[container.para as ParaType]) {
      paraContainers[container.para as ParaType].push(container);
    }
  });

  // Get linked items
  const linkedItems = links.filter(link => 
    link.from_item === item.id || link.to_item === item.id
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title"
            />
          </div>

          <div className="form-group">
            <label>Essence (Distilled)</label>
            <textarea
              value={essence}
              onChange={(e) => setEssence(e.target.value)}
              placeholder="Key insight or summary"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detailed content"
              rows={6}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as Item['kind'])}>
                <option value="note">Note</option>
                <option value="task">Task</option>
                <option value="page">Page</option>
                <option value="evidence">Evidence</option>
              </select>
            </div>

            <div className="form-group">
              <label>CODE Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value as CodeStage)}>
                <option value="captured">Captured {CODE_STAGE_INDICATORS.captured}</option>
                <option value="organised">Organised {CODE_STAGE_INDICATORS.organised}</option>
                <option value="distilled">Distilled {CODE_STAGE_INDICATORS.distilled}</option>
                <option value="expressed">Expressed {CODE_STAGE_INDICATORS.expressed}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Container</label>
              <select 
                value={selectedContainerId || ''} 
                onChange={handleContainerChange}
              >
                <option value="">Inbox</option>
                {containers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.name} ({container.para})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : ''}`}
                    onClick={() => handleTagToggle(tag.id)}
                    style={{
                      backgroundColor: isSelected ? tag.colour : 'transparent',
                      borderColor: tag.colour || '#ccc',
                      color: isSelected ? 'white' : tag.colour || '#666',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {/* Links section */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
            <h4 style={{ marginBottom: '8px' }}>Links</h4>
            
            {linkedItems.length > 0 ? (
              <div style={{ marginBottom: '12px' }}>
                {linkedItems.map((link) => {
                  const otherItemId = link.from_item === item.id ? link.to_item : link.from_item;
                  const otherItem = containers.find(c => c.id === otherItemId);
                  return (
                    <div 
                      key={`${link.from_item}-${link.to_item}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: '#f8f8f8',
                        borderRadius: '4px',
                        marginBottom: '4px',
                      }}
                    >
                      <span>→</span>
                      <span>{otherItem?.name || otherItemId}</span>
                      {link.label && <span style={{ color: '#666' }}>({link.label})</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '12px' }}>
                No links yet
              </p>
            )}

            {showLinkForm ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <select
                  value={linkToItemId}
                  onChange={(e) => setLinkToItemId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select item to link...</option>
                  {containers.map((container) => (
                    <option key={container.id} value={container.id}>
                      {container.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Label"
                  style={{ width: '120px' }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleCreateLink}>
                  Link
                </button>
                <button className="btn btn-sm" onClick={() => setShowLinkForm(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-sm"
                onClick={() => setShowLinkForm(true)}
              >
                + Add Link
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Delete
          </button>
          <button className="btn btn-sm" onClick={onArchive}>
            Archive
          </button>
          <button className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemEditor;
