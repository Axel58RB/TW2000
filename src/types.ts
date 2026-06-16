// Type definitions for Typewriter 2000

// PARA categories
export type ParaType = 'project' | 'area' | 'resource' | 'archive' | 'inbox';

// CODE workflow stages
export type CodeStage = 'captured' | 'organised' | 'distilled' | 'expressed';

// Item kinds
export type ItemKind = 'note' | 'task' | 'page' | 'evidence';

// Container interface
export interface Container {
  id: string;
  name: string;
  colour?: string;
  para: ParaType;
  status: string;
  position: number;
  created_at: string;
}

// Item interface
export interface Item {
  id: string;
  container_id?: string | null;
  kind: ItemKind;
  stage: CodeStage;
  title?: string | null;
  essence?: string | null;
  body?: string | null;
  status: string;
  due_date?: string | null;
  map_x: number;
  map_y: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

// Tag interface
export interface Tag {
  id: string;
  name: string;
  colour?: string;
  parent_id?: string | null;
  created_at: string;
}

// Item-Tag relationship
export interface ItemTag {
  item_id: string;
  tag_id: string;
  position: number;
}

// Link between items
export interface Link {
  from_item: string;
  to_item: string;
  label?: string | null;
  created_at: string;
}

// Canvas interface
export interface Canvas {
  id: string;
  name: string;
  data: string;
  container_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Database response wrapper
export interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string | null;
}

// Full data response
export interface FullDataResponse {
  containers: Container[];
  items: Item[];
  tags: Tag[];
  item_tags: ItemTag[];
  links: Link[];
  canvases: Canvas[];
}

// Excalidraw element with item reference
export interface ExcalidrawElementWithItem {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text' | 'freedraw';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'cross-hatch' | 'solid';
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: number;
  opacity: number;
  groupIds: string[];
  strokeSharpness: 'round' | 'sharp';
  roundness: {
    type: number;
  };
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: any[];
  updated: number;
  link: string | null;
  locked: boolean;
  customData?: {
    itemId?: string;
    itemType?: ItemKind;
    stage?: CodeStage;
  };
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  baseline?: number;
}

// Excalidraw state
export interface ExcalidrawState {
  elements: ExcalidrawElementWithItem[];
  appState: {
    gridSize: number | null;
    viewBackgroundColor: string;
  };
}

// Mind map node
export interface MindMapNode {
  id: string;
  type: 'input' | 'output' | 'default';
  data: {
    label: string;
    itemId?: string;
    stage?: CodeStage;
    colour?: string;
  };
  position: {
    x: number;
    y: number;
  };
  style?: {
    background?: string;
    color?: string;
    border?: string;
    width?: number;
    height?: number;
  };
}

// Mind map edge
export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
  animated?: boolean;
  labelStyle?: {
    fill?: string;
    fontSize?: number;
  };
}

// Mind map data
export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

// View modes
export type ViewMode = 'freeform' | 'mindmap' | 'thread' | 'evidence' | 'map';

// UI state
export interface UIState {
  viewMode: ViewMode;
  selectedItemId?: string | null;
  selectedContainerId?: string | null;
  searchQuery: string;
  sidebarCollapsed: boolean;
  showItemEditor: boolean;
  editingItemId?: string | null;
  canvasName: string;
}

// Color palette
export const COLORS = {
  // Muted palette
  moss: '#5B7C66',
  mossLight: '#8FA68E',
  mossDark: '#2F4A3E',
  pine: '#2F4A3E',
  pineLight: '#3D5A4E',
  sage: '#8FA68E',
  sageLight: '#B8C5B8',
  steel: '#4A6FA5',
  steelLight: '#6A8FA5',
  steelDark: '#2A4F75',
  
  // Backgrounds
  backgroundLight: '#F8F8F8',
  backgroundBlueTint: '#F0F4F8',
  backgroundGreenTint: '#F0F4F0',
  backgroundWhite: '#FFFFFF',
  
  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  
  // Borders
  borderLight: '#E0E0E0',
  borderMedium: '#CCCCCC',
  borderDark: '#999999',
  
  // CODE stage colors
  captured: '#FF6B6B',
  organised: '#FFA500',
  distilled: '#4CAF50',
  expressed: '#2196F3',
  
  // PARA colors
  project: '#4A6FA5',
  area: '#5B7C66',
  resource: '#8FA68E',
  archive: '#666666',
  inbox: '#FF6B6B',
};

// CODE stage display
export const CODE_STAGE_LABELS: Record<CodeStage, string> = {
  captured: 'Captured',
  organised: 'Organised',
  distilled: 'Distilled',
  expressed: 'Expressed',
};

export const CODE_STAGE_INDICATORS: Record<CodeStage, string> = {
  captured: '●○○○',
  organised: '●●○○',
  distilled: '●●●○',
  expressed: '●●●●',
};

// PARA display
export const PARA_LABELS: Record<ParaType, string> = {
  project: 'Projects',
  area: 'Areas',
  resource: 'Resources',
  archive: 'Archive',
  inbox: 'Inbox',
};

// Default PARA containers
export const DEFAULT_CONTAINERS: Container[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    colour: COLORS.inbox,
    para: 'inbox',
    status: 'active',
    position: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'projects',
    name: 'Projects',
    colour: COLORS.project,
    para: 'project',
    status: 'active',
    position: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'areas',
    name: 'Areas',
    colour: COLORS.area,
    para: 'area',
    status: 'active',
    position: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'resources',
    name: 'Resources',
    colour: COLORS.resource,
    para: 'resource',
    status: 'active',
    position: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'archive',
    name: 'Archive',
    colour: COLORS.archive,
    para: 'archive',
    status: 'active',
    position: 4,
    created_at: new Date().toISOString(),
  },
];

// Utility functions
export function generateId(): string {
  // Simple ULID-like generator for frontend
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const time = Date.now().toString(36);
  const random = Array.from({ length: 10 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return time + random;
}

export function getStageColor(stage: CodeStage): string {
  return COLORS[stage];
}

export function getParaColor(para: ParaType): string {
  return COLORS[para];
}

export function getItemBorderColor(item: Item, tags: Tag[], itemTags: ItemTag[]): string {
  // Get the first tag's color for border
  const itemTag = itemTags.find(it => it.item_id === item.id);
  if (itemTag) {
    const tag = tags.find(t => t.id === itemTag.tag_id);
    if (tag && tag.colour) {
      return tag.colour;
    }
  }
  // Fallback to stage color
  return getStageColor(item.stage);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function truncateText(text: string | null | undefined, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
