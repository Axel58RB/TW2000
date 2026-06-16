import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Item, Container, Tag, ItemTag, Link } from '../types';

interface SearchPaletteProps {
  items: Item[];
  containers: Container[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (itemId: string) => void;
  onSelectContainer: (containerId: string | null) => void;
}

const SearchPalette: React.FC<SearchPaletteProps> = ({
  items,
  containers,
  tags,
  itemTags,
  links,
  isOpen,
  onClose,
  onSelectItem,
  onSelectContainer,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Get container name for an item
  const getItemContainer = useCallback((item: Item) => {
    if (!item.container_id) return null;
    return containers.find(c => c.id === item.container_id);
  }, [containers]);

  // Get tags for an item
  const getItemTags = useCallback((itemId: string) => {
    const tagIds = itemTags
      .filter(it => it.item_id === itemId)
      .map(it => it.tag_id);
    return tags.filter(tag => tagIds.includes(tag.id));
  }, [itemTags, tags]);

  // Filter results based on query
  const results = useCallback(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    
    // Search items
    const matchingItems = items.filter(item => 
      (item.title?.toLowerCase().includes(lowerQuery) || '') ||
      (item.body?.toLowerCase().includes(lowerQuery) || '') ||
      (item.essence?.toLowerCase().includes(lowerQuery) || '')
    );
    
    // Search containers
    const matchingContainers = containers.filter(container => 
      container.name.toLowerCase().includes(lowerQuery)
    );
    
    // Search tags
    const matchingTags = tags.filter(tag => 
      tag.name.toLowerCase().includes(lowerQuery)
    );
    
    return [
      { type: 'items', label: 'Items', data: matchingItems },
      { type: 'containers', label: 'Containers', data: matchingContainers },
      { type: 'tags', label: 'Tags', data: matchingTags },
    ].filter(group => group.data.length > 0);
  }, [query, items, containers, tags]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Don't handle if user is typing in input
      if (e.target === inputRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results().reduce((sum, group) => sum + group.data.length, 0) - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const flatResults = results().flatMap(group => group.data);
          if (flatResults[selectedIndex]) {
            const result = flatResults[selectedIndex];
            if ('container_id' in result) {
              onSelectItem(result.id);
            } else if ('para' in result) {
              onSelectContainer(result.id);
            }
            onClose();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedIndex, results, onSelectItem, onSelectContainer]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Close palette when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const flatResults = results().flatMap(group => group.data);

  return (
    <div className="search-palette-overlay" ref={paletteRef}>
      <div className="search-palette">
        <div className="search-palette-input">
          <span className="search-palette-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            autoComplete="off"
          />
          <button className="search-palette-close" onClick={onClose}>
            &times;
          </button>
        </div>
        
        {results().length > 0 ? (
          <div className="search-palette-results">
            {results().map((group, groupIndex) => (
              <div key={group.type} className="search-palette-group">
                <div className="search-palette-group-title">{group.label}</div>
                {group.data.map((result: any, resultIndex: number) => {
                  const globalIndex = results().slice(0, groupIndex)
                    .reduce((sum, g) => sum + g.data.length, 0) + resultIndex;
                  const isSelected = selectedIndex === globalIndex;
                  
                  return (
                    <div
                      key={result.id}
                      className={`search-palette-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if ('container_id' in result) {
                          onSelectItem(result.id);
                        } else if ('para' in result) {
                          onSelectContainer(result.id);
                        }
                        onClose();
                      }}
                    >
                      {'container_id' in result ? (
                        <>
                          <span className="search-palette-item-icon">📄</span>
                          <span className="search-palette-item-title">{result.title || 'Untitled'}</span>
                          {result.body && (
                            <span className="search-palette-item-subtitle">
                              {result.body.slice(0, 50)}{result.body.length > 50 ? '...' : ''}
                            </span>
                          )}
                          {getItemContainer(result) && (
                            <span className="search-palette-item-container">
                              {getItemContainer(result)?.name}
                            </span>
                          )}
                        </>
                      ) : 'para' in result ? (
                        <>
                          <span className="search-palette-item-icon">📁</span>
                          <span className="search-palette-item-title">{result.name}</span>
                          <span className="search-palette-item-subtitle">{result.para}</span>
                        </>
                      ) : (
                        <>
                          <span className="search-palette-item-icon">🏷️</span>
                          <span className="search-palette-item-title">{result.name}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="search-palette-empty">
            No results found for "{query}"
          </div>
        ) : (
          <div className="search-palette-empty">
            Type to search...
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPalette;
