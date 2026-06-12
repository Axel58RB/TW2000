// Database utility functions for Typewriter 2000
import { invoke } from '@tauri-apps/api/tauri';
import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Item,
  Tag,
  ItemTag,
  Link,
  Canvas,
  FullDataResponse,
  DbResponse,
} from '../types';

// Database command names
type DbCommand = 
  | 'init_database'
  | 'get_all_data'
  | 'create_container'
  | 'update_container'
  | 'delete_container'
  | 'create_item'
  | 'update_item'
  | 'move_item_to_container'
  | 'archive_item'
  | 'delete_item'
  | 'create_tag'
  | 'create_link'
  | 'delete_link'
  | 'assign_tag_to_item'
  | 'remove_tag_from_item'
  | 'save_canvas'
  | 'update_canvas'
  | 'search_items'
  | 'get_items_by_container'
  | 'get_archived_items'
  | 'get_items_by_tag'
  | 'get_evidence_items';

// Initialize database
async function initDb(): Promise<DbResponse<string>> {
  return invoke<DbResponse<string>>('init_database');
}

// Get all data from database
async function getAllData(): Promise<DbResponse<FullDataResponse>> {
  return invoke<DbResponse<FullDataResponse>>('get_all_data');
}

// Container operations
async function createContainer(
  name: string,
  para: string,
  colour?: string
): Promise<DbResponse<Container>> {
  return invoke<DbResponse<Container>>('create_container', {
    name,
    para,
    colour: colour || null,
  });
}

async function updateContainer(
  id: string,
  updates: Record<string, string>
): Promise<DbResponse<Container>> {
  return invoke<DbResponse<Container>>('update_container', {
    id,
    updates,
  });
}

async function deleteContainer(id: string): Promise<DbResponse<string>> {
  return invoke<DbResponse<string>>('delete_container', { id });
}

// Item operations
async function createItem(
  containerId: string | null,
  kind: string,
  title?: string,
  body?: string,
  mapX: number = 0,
  mapY: number = 0
): Promise<DbResponse<Item>> {
  return invoke<DbResponse<Item>>('create_item', {
    containerId,
    kind,
    title: title || null,
    body: body || null,
    mapX,
    mapY,
  });
}

async function updateItem(
  id: string,
  updates: Record<string, any>
): Promise<DbResponse<Item>> {
  return invoke<DbResponse<Item>>('update_item', {
    id,
    updates,
  });
}

async function moveItemToContainer(
  itemId: string,
  containerId: string | null
): Promise<DbResponse<Item>> {
  return invoke<DbResponse<Item>>('move_item_to_container', {
    itemId,
    containerId,
  });
}

async function archiveItem(id: string): Promise<DbResponse<string>> {
  return invoke<DbResponse<string>>('archive_item', { id });
}

async function deleteItem(id: string): Promise<DbResponse<string>> {
  return invoke<DbResponse<string>>('delete_item', { id });
}

// Tag operations
async function createTag(
  name: string,
  colour?: string,
  parentId?: string
): Promise<DbResponse<Tag>> {
  return invoke<DbResponse<Tag>>('create_tag', {
    name,
    colour: colour || null,
    parentId: parentId || null,
  });
}

// Link operations
async function createLink(
  fromItem: string,
  toItem: string,
  label?: string
): Promise<DbResponse<Link>> {
  return invoke<DbResponse<Link>>('create_link', {
    fromItem,
    toItem,
    label: label || null,
  });
}

async function deleteLink(fromItem: string, toItem: string): Promise<DbResponse<string>> {
  return invoke<DbResponse<string>>('delete_link', {
    fromItem,
    toItem,
  });
}

// Item-Tag relationship operations
async function assignTagToItem(
  itemId: string,
  tagId: string,
  position: number = 0
): Promise<DbResponse<ItemTag>> {
  return invoke<DbResponse<ItemTag>>('assign_tag_to_item', {
    itemId,
    tagId,
    position,
  });
}

async function removeTagFromItem(
  itemId: string,
  tagId: string
): Promise<DbResponse<string>> {
  return invoke<DbResponse<string>>('remove_tag_from_item', {
    itemId,
    tagId,
  });
}

// Canvas operations
async function saveCanvas(
  name: string,
  data: string,
  containerId?: string
): Promise<DbResponse<Canvas>> {
  return invoke<DbResponse<Canvas>>('save_canvas', {
    name,
    data,
    containerId: containerId || null,
  });
}

async function updateCanvas(
  id: string,
  data: string
): Promise<DbResponse<Canvas>> {
  return invoke<DbResponse<Canvas>>('update_canvas', {
    id,
    data,
  });
}

// Search operations
async function searchItems(query: string): Promise<DbResponse<Item[]>> {
  return invoke<DbResponse<Item[]>>('search_items', { query });
}

// Query operations
async function getItemsByContainer(
  containerId: string | null
): Promise<DbResponse<Item[]>> {
  return invoke<DbResponse<Item[]>>('get_items_by_container', {
    containerId,
  });
}

async function getArchivedItems(): Promise<DbResponse<Item[]>> {
  return invoke<DbResponse<Item[]>>('get_archived_items');
}

async function getItemsByTag(tagId: string): Promise<DbResponse<Item[]>> {
  return invoke<DbResponse<Item[]>>('get_items_by_tag', { tagId });
}

async function getEvidenceItems(): Promise<DbResponse<Item[]>> {
  return invoke<DbResponse<Item[]>>('get_evidence_items');
}

// Database hook for React components
export interface AppData {
  containers: Container[];
  items: Item[];
  tags: Tag[];
  itemTags: ItemTag[];
  links: Link[];
  canvases: Canvas[];
  loading: boolean;
  error?: string;
}

export function useDatabase(): {
  data: AppData;
  refresh: () => Promise<void>;
  createContainer: (name: string, para: string, colour?: string) => Promise<DbResponse<Container>>;
  updateContainer: (id: string, updates: Record<string, string>) => Promise<DbResponse<Container>>;
  deleteContainer: (id: string) => Promise<DbResponse<string>>;
  createItem: (containerId: string | null, kind: string, title?: string, body?: string, mapX?: number, mapY?: number) => Promise<DbResponse<Item>>;
  updateItem: (id: string, updates: Record<string, any>) => Promise<DbResponse<Item>>;
  moveItemToContainer: (itemId: string, containerId: string | null) => Promise<DbResponse<Item>>;
  archiveItem: (id: string) => Promise<DbResponse<string>>;
  deleteItem: (id: string) => Promise<DbResponse<string>>;
  createTag: (name: string, colour?: string, parentId?: string) => Promise<DbResponse<Tag>>;
  createLink: (fromItem: string, toItem: string, label?: string) => Promise<DbResponse<Link>>;
  deleteLink: (fromItem: string, toItem: string) => Promise<DbResponse<string>>;
  assignTagToItem: (itemId: string, tagId: string, position?: number) => Promise<DbResponse<ItemTag>>;
  removeTagFromItem: (itemId: string, tagId: string) => Promise<DbResponse<string>>;
  saveCanvas: (name: string, data: string, containerId?: string) => Promise<DbResponse<Canvas>>;
  updateCanvas: (id: string, data: string) => Promise<DbResponse<Canvas>>;
  searchItems: (query: string) => Promise<DbResponse<Item[]>>;
  getItemsByContainer: (containerId: string | null) => Promise<DbResponse<Item[]>>;
  getArchivedItems: () => Promise<DbResponse<Item[]>>;
  getItemsByTag: (tagId: string) => Promise<DbResponse<Item[]>>;
  getEvidenceItems: () => Promise<DbResponse<Item[]>>;
} {
  const [data, setData] = useState<AppData>({
    containers: [],
    items: [],
    tags: [],
    itemTags: [],
    links: [],
    canvases: [],
    loading: true,
    error: undefined,
  });

  const refresh = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: undefined }));
      
      // Initialize database if needed
      await initDb();
      
      // Get all data
      const response = await getAllData();
      
      if (response.success && response.data) {
        setData({
          containers: response.data.containers,
          items: response.data.items,
          tags: response.data.tags,
          itemTags: response.data.item_tags,
          links: response.data.links,
          canvases: response.data.canvases,
          loading: false,
          error: undefined,
        });
      } else {
        setData(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to load data',
        }));
      }
    } catch (err) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    refresh,
    createContainer,
    updateContainer,
    deleteContainer,
    createItem,
    updateItem,
    moveItemToContainer,
    archiveItem,
    deleteItem,
    createTag,
    createLink,
    deleteLink,
    assignTagToItem,
    removeTagFromItem,
    saveCanvas,
    updateCanvas,
    searchItems,
    getItemsByContainer,
    getArchivedItems,
    getItemsByTag,
    getEvidenceItems,
  };
}

// Helper function to get item tags
export function getItemTags(itemId: string, itemTags: ItemTag[], tags: Tag[]): Tag[] {
  const tagIds = itemTags
    .filter(it => it.item_id === itemId)
    .map(it => it.tag_id);
  
  return tags.filter(tag => tagIds.includes(tag.id));
}

// Helper function to get item links
export function getItemLinks(itemId: string, links: Link[]): Link[] {
  return links.filter(link => link.from_item === itemId || link.to_item === itemId);
}

// Helper function to get container by ID
export function getContainerById(id: string | null | undefined, containers: Container[]): Container | null {
  if (!id) return null;
  return containers.find(c => c.id === id) || null;
}

// Helper function to get tag by ID
export function getTagById(id: string, tags: Tag[]): Tag | null {
  return tags.find(t => t.id === id) || null;
}

// Helper function to get items by container
export function getItemsByContainerId(containerId: string | null | undefined, items: Item[]): Item[] {
  if (!containerId) {
    return items.filter(item => item.container_id === null || item.container_id === undefined);
  }
  return items.filter(item => item.container_id === containerId);
}

export {
  initDb,
  getAllData,
  createContainer,
  updateContainer,
  deleteContainer,
  createItem,
  updateItem,
  moveItemToContainer,
  archiveItem,
  deleteItem,
  createTag,
  createLink,
  deleteLink,
  assignTagToItem,
  removeTagFromItem,
  saveCanvas,
  updateCanvas,
  searchItems,
  getItemsByContainer,
  getArchivedItems,
  getItemsByTag,
  getEvidenceItems,
};
