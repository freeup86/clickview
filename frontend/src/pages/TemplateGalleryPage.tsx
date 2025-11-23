/**
 * Template Gallery Page
 *
 * Browse and use pre-built dashboard templates for quick setup.
 * Provides categorized templates with search, filtering, and preview.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import useStore from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';
import { TemplateCard } from '../components/templates/TemplateCard';
import { TemplatePreview } from '../components/templates/TemplatePreview';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  widgetCount: number;
  usageCount: number;
  rating?: number;
  author?: string;
  isPublic: boolean;
  createdAt: string;
  previewData?: {
    widgets: Array<{
      type: string;
      title: string;
      position: { x: number; y: number; w: number; h: number };
    }>;
  };
}

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: '📊' },
  { id: 'productivity', name: 'Productivity', icon: '⚡' },
  { id: 'project-management', name: 'Project Management', icon: '📋' },
  { id: 'sales', name: 'Sales & CRM', icon: '💼' },
  { id: 'marketing', name: 'Marketing', icon: '📈' },
  { id: 'engineering', name: 'Engineering', icon: '⚙️' },
  { id: 'executive', name: 'Executive', icon: '👔' },
  { id: 'custom', name: 'Custom', icon: '🎨' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'usage', label: 'Most Used' },
];

export const TemplateGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [previewTemplate, setPreviewTemplate] = useState<DashboardTemplate | null>(null);

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery(
    ['templates', selectedCategory],
    () => apiService.getDashboardTemplates({ category: selectedCategory }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Use template mutation
  const useTemplateMutation = useMutation(
    (templateId: string) =>
      apiService.createDashboardFromTemplate({
        templateId,
        workspaceId: currentWorkspace?.id || '',
      }),
    {
      onSuccess: (data) => {
        toast.success('Dashboard created from template');
        queryClient.invalidateQueries(['dashboards']);
        navigate(`/dashboard/${data.dashboard.id}`);
      },
      onError: () => {
        toast.error('Failed to create dashboard from template');
      },
    }
  );

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let templates = templatesData?.templates || [];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t: DashboardTemplate) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    templates = [...templates].sort((a: DashboardTemplate, b: DashboardTemplate) => {
      switch (sortBy) {
        case 'popular':
          return (b.rating || 0) - (a.rating || 0);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return 0;
      }
    });

    return templates;
  }, [templatesData, searchQuery, sortBy]);

  const handleUseTemplate = (templateId: string) => {
    if (!currentWorkspace) {
      toast.error('Please select a workspace first');
      navigate('/workspaces');
      return;
    }
    useTemplateMutation.mutate(templateId);
  };

  const handlePreview = (template: DashboardTemplate) => {
    setPreviewTemplate(template);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Templates</h1>
          <p className="text-gray-600">
            Get started quickly with pre-built dashboard templates
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="input w-full"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="large" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg">
                {searchQuery ? 'No templates match your search' : 'No templates available'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template: DashboardTemplate) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleUseTemplate(template.id)}
                    onPreview={() => handlePreview(template)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={handleClosePreview}
          onUse={() => {
            handleClosePreview();
            handleUseTemplate(previewTemplate.id);
          }}
        />
      )}
    </div>
  );
};

export default TemplateGalleryPage;
