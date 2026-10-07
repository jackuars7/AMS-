/**
 * AM-11: Saved Views & Column Configuration Service
 * Provides persistent view presets for screening review, filtering, and sorting.
 */
import { SavedView } from '../types/index.ts';

export const DEFAULT_SAVED_VIEWS: SavedView[] = [
  {
    id: 'view-default-all',
    name: 'All Findings (Standard View)',
    isDefault: true,
    ownerId: 'SYSTEM',
    filters: {},
    visibleColumns: [
      'title',
      'publisher',
      'publishedDate',
      'language',
      'eventCategories',
      'severity',
      'identityAssessment',
      'relevanceScore',
    ],
    sortBy: 'publishedDate',
    sortDirection: 'desc',
    pageSize: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'view-high-severity',
    name: 'Critical & High Severity Findings',
    isDefault: false,
    ownerId: 'SYSTEM',
    filters: {
      severity: ['CRITICAL', 'HIGH'],
    },
    visibleColumns: [
      'title',
      'publisher',
      'publishedDate',
      'severity',
      'identityAssessment',
      'relevanceScore',
    ],
    sortBy: 'relevanceScore',
    sortDirection: 'desc',
    pageSize: 25,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'view-multilingual',
    name: 'Multilingual Non-English Findings (AR, HI, ML, RU, ES)',
    isDefault: false,
    ownerId: 'SYSTEM',
    filters: {
      languages: ['ar', 'hi', 'ml', 'ru', 'es'],
    },
    visibleColumns: [
      'title',
      'publisher',
      'language',
      'publishedDate',
      'eventCategories',
      'identityAssessment',
    ],
    sortBy: 'publishedDate',
    sortDirection: 'desc',
    pageSize: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'view-unreviewed',
    name: 'Pending Review / Not Assessed',
    isDefault: false,
    ownerId: 'SYSTEM',
    filters: {
      identityAssessment: ['NOT_ASSESSED'],
    },
    visibleColumns: [
      'title',
      'publisher',
      'publishedDate',
      'severity',
      'identityAssessment',
      'relevanceScore',
    ],
    sortBy: 'publishedDate',
    sortDirection: 'desc',
    pageSize: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'view-paywall',
    name: 'Paywalled & Restricted Content',
    isDefault: false,
    ownerId: 'SYSTEM',
    filters: {
      accessStatus: ['PAYWALL', 'RESTRICTED'],
    },
    visibleColumns: [
      'title',
      'publisher',
      'accessStatus',
      'publishedDate',
      'sourceConnectors',
    ],
    sortBy: 'publishedDate',
    sortDirection: 'desc',
    pageSize: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export class SavedViewsService {
  private views: Map<string, SavedView> = new Map();

  constructor() {
    DEFAULT_SAVED_VIEWS.forEach((v) => this.views.set(v.id, { ...v }));
  }

  public getViews(): SavedView[] {
    return Array.from(this.views.values());
  }

  public getViewById(id: string): SavedView | undefined {
    return this.views.get(id);
  }

  public saveView(view: Omit<SavedView, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SavedView {
    const id = view.id || `view-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const saved: SavedView = {
      ...view,
      id,
      createdAt: this.views.get(id)?.createdAt || now,
      updatedAt: now,
    };

    if (saved.isDefault) {
      // Unset other defaults
      for (const [vId, v] of this.views.entries()) {
        if (vId !== id && v.isDefault) {
          v.isDefault = false;
          this.views.set(vId, v);
        }
      }
    }

    this.views.set(id, saved);
    return saved;
  }

  public deleteView(id: string): boolean {
    const existing = this.views.get(id);
    if (!existing || existing.ownerId === 'SYSTEM') {
      return false; // Cannot delete default system views
    }
    return this.views.delete(id);
  }
}

export const savedViewsService = new SavedViewsService();
