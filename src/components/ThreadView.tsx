import React from 'react';
import { Item, Container, Tag, ItemTag, Link, getStageColor, CODE_STAGE_INDICATORS, formatDate, truncateText } from '../types';

interface ThreadViewProps {
  items: Item[];
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  getTagsForItem: (itemId: string) => Tag[];
  getItemContainer: (item: Item) => Container | null;
  onItemSelect: (itemId: string) => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({
  items,
  containers,
  tags,
  itemTags,
  links,
  getTagsForItem,
  getItemContainer,
  onItemSelect,
}) => {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-title">No items in thread view</div>
        <div className="empty-state-description">
          Create items and they will appear here in chronological order
        </div>
      </div>
    );
  }

  // Sort items by created_at date
  const sortedItems = [...items].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="thread-view">
      {sortedItems.map((item, index) => {
        const container = getItemContainer(item);
        const itemTags = getTagsForItem(item.id);
        const stageColor = getStageColor(item.stage as any);
        const stageIndicator = CODE_STAGE_INDICATORS[item.stage as any];

        return (
          <div 
            key={item.id} 
            className="thread-item"
            onClick={() => onItemSelect(item.id)}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: '#f8f8f8',
              },
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: `2px solid ${stageColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '12px', color: stageColor }}>
                  {stageIndicator}
                </span>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                    {item.title || 'Untitled'}
                  </h4>
                  {container && (
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      backgroundColor: container.colour ? `${container.colour}20` : '#e0e0e0',
                      color: container.colour || '#666',
                      borderRadius: '4px',
                    }}>
                      {container.name}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {formatDate(item.created_at)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {item.kind}
                  </span>
                </div>
                
                {item.body && (
                  <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    color: '#666',
                    lineHeight: 1.5,
                  }}>
                    {truncateText(item.body, 200)}
                  </p>
                )}
                
                {item.essence && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#f0f4f8',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#2a4f75',
                  }}>
                    <strong>Essence:</strong> {item.essence}
                  </div>
                )}
                
                {itemTags.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px', 
                    marginTop: '8px',
                  }}>
                    {itemTags.map((tag) => (
                      <span 
                        key={tag.id}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
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
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ThreadView;
