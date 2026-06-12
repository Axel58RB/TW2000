import React, { useState, useEffect } from 'react';
import { Item, Container, Tag, ItemTag, Link, getStageColor, CODE_STAGE_INDICATORS, formatDate, truncateText } from '../types';

interface EvidenceDashboardProps {
  items: Item[];
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  getTagsForItem: (itemId: string) => Tag[];
  getItemContainer: (item: Item) => Container | null;
  onItemSelect: (itemId: string) => void;
}

const EvidenceDashboard: React.FC<EvidenceDashboardProps> = ({
  items,
  containers,
  tags,
  itemTags,
  links,
  getTagsForItem,
  getItemContainer,
  onItemSelect,
}) => {
  const [evidenceItems, setEvidenceItems] = useState<Item[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items with #evidence tag or evidence kind
  useEffect(() => {
    const filtered = items.filter(item => {
      // Check if item has #evidence tag
      const itemTags = getTagsForItem(item.id);
      const hasEvidenceTag = itemTags.some(tag => tag.name.toLowerCase() === 'evidence');
      
      // Check if item kind is evidence
      const isEvidenceKind = item.kind === 'evidence';
      
      // Check if body contains #evidence
      const hasEvidenceInBody = item.body?.toLowerCase().includes('#evidence') || false;
      
      return hasEvidenceTag || isEvidenceKind || hasEvidenceInBody;
    });
    
    setEvidenceItems(filtered);
  }, [items, getTagsForItem]);

  // Filter by selected tag
  const filteredItems = filterTag 
    ? evidenceItems.filter(item => {
        const itemTags = getTagsForItem(item.id);
        return itemTags.some(tag => tag.id === filterTag);
      })
    : evidenceItems;

  // Filter by search query
  const searchedItems = searchQuery.trim()
    ? filteredItems.filter(item => 
        (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (item.body?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (item.essence?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
      )
    : filteredItems;

  // Get all tags from evidence items
  const allTags = Array.from(new Set(
    evidenceItems.flatMap(item => getTagsForItem(item.id))
  ));

  return (
    <div className="evidence-dashboard">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e0e0e0',
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Evidence Dashboard</h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-box" style={{ margin: 0 }}>
            <span className="search-box-icon">🔍</span>
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '200px' }}
            />
          </div>
          
          <select
            value={filterTag || ''}
            onChange={(e) => setFilterTag(e.target.value || null)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {searchedItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No evidence found</div>
          <div className="empty-state-description">
            Add items with #evidence tag or mark them as evidence type
          </div>
        </div>
      ) : (
        <div className="evidence-grid">
          {searchedItems.map((item) => {
            const container = getItemContainer(item);
            const itemTags = getTagsForItem(item.id);
            const stageColor = getStageColor(item.stage as any);
            const stageIndicator = CODE_STAGE_INDICATORS[item.stage as any];

            return (
              <div 
                key={item.id} 
                className="evidence-card"
                onClick={() => onItemSelect(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: `2px solid ${stageColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '10px',
                    color: stageColor,
                  }}>
                    {stageIndicator}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: '15px', 
                      fontWeight: 500,
                      marginBottom: '4px',
                    }}>
                      {item.title || 'Untitled Evidence'}
                    </h4>
                    
                    {container && (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: container.colour ? `${container.colour}20` : '#e0e0e0',
                        color: container.colour || '#666',
                        borderRadius: '4px',
                        marginBottom: '6px',
                        display: 'inline-block',
                      }}>
                        {container.name}
                      </span>
                    )}
                    
                    {item.body && (
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: 1.5,
                        marginBottom: '8px',
                      }}>
                        {truncateText(item.body, 100)}
                      </p>
                    )}
                    
                    {item.essence && (
                      <div style={{
                        marginTop: '6px',
                        padding: '6px',
                        backgroundColor: '#f0f4f8',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#2a4f75',
                      }}>
                        <strong>Essence:</strong> {truncateText(item.essence, 50)}
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      fontSize: '11px',
                      color: '#999',
                    }}>
                      <span>{formatDate(item.created_at)}</span>
                      <span>{item.kind}</span>
                    </div>
                  </div>
                </div>
                
                {itemTags.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e0e0e0',
                  }}>
                    {itemTags.map((tag) => (
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
          })}
        </div>
      )}
    </div>
  );
};

export default EvidenceDashboard;
