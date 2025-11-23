/**
 * Text Block Widget
 *
 * Rich text widget for adding formatted text and documentation to dashboards.
 * Supports markdown formatting for headers, lists, links, bold, italic, etc.
 */

import React, { useState } from 'react';
import { PencilIcon, EyeIcon } from '../icons';

interface TextBlockWidgetProps {
  content?: string;
  isEditMode?: boolean;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

export const TextBlockWidget: React.FC<TextBlockWidgetProps> = ({
  content = '',
  isEditMode = false,
  onSave,
  readOnly = false,
}) => {
  const [editMode, setEditMode] = useState(isEditMode);
  const [textContent, setTextContent] = useState(content);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = () => {
    if (onSave) {
      onSave(textContent);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setTextContent(content);
    setEditMode(false);
  };

  // Simple markdown to HTML converter
  const renderMarkdown = (text: string): string => {
    let html = text;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>');

    // Bold and Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-700">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Unordered lists
    html = html.replace(/^\* (.+)$/gim, '<li class="ml-4">$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li class="ml-4">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside my-2">$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-4">$1</li>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-2">');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = `<p class="mb-2">${html}</p>`;

    return html;
  };

  if (readOnly || (!editMode && !isEditMode)) {
    return (
      <div className="h-full flex flex-col">
        {!readOnly && (
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={() => setEditMode(true)}
              className="btn btn-sm btn-outline flex items-center gap-1"
              title="Edit text"
            >
              <PencilIcon className="w-3 h-3" />
              Edit
            </button>
          </div>
        )}
        <div
          className="flex-1 overflow-auto prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`btn btn-sm ${previewMode ? 'btn-primary' : 'btn-outline'}`}
            title={previewMode ? 'Edit' : 'Preview'}
          >
            {previewMode ? (
              <>
                <PencilIcon className="w-3 h-3 mr-1" />
                Edit
              </>
            ) : (
              <>
                <EyeIcon className="w-3 h-3 mr-1" />
                Preview
              </>
            )}
          </button>
          <div className="text-xs text-gray-500">Markdown supported</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCancel} className="btn btn-sm btn-outline">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-sm btn-primary">
            Save
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-auto">
        {previewMode ? (
          <div
            className="prose prose-sm max-w-none p-3 bg-gray-50 rounded border"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent) }}
          />
        ) : (
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Add text content... (Markdown supported)

Examples:
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`inline code`

- Bullet point
- Another point

1. Numbered item
2. Another item

[Link text](https://example.com)"
            className="w-full h-full p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
          />
        )}
      </div>

      {/* Formatting Help */}
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <div className="font-semibold text-blue-900 mb-1">Quick Reference:</div>
        <div className="grid grid-cols-2 gap-x-4 text-blue-800">
          <div>
            <span className="font-mono">**bold**</span> - <strong>Bold</strong>
          </div>
          <div>
            <span className="font-mono">*italic*</span> - <em>Italic</em>
          </div>
          <div>
            <span className="font-mono">`code`</span> - <code className="bg-gray-200 px-1">Code</code>
          </div>
          <div>
            <span className="font-mono">[text](url)</span> - Link
          </div>
          <div>
            <span className="font-mono"># Heading</span> - H1
          </div>
          <div>
            <span className="font-mono">- Item</span> - List
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Text Block Widget Configuration Modal Component
 * Used in AddWidgetModal to configure text block widgets
 */
export const TextBlockConfig: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Initial Content</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter initial text content (Markdown supported)"
          className="input w-full h-32 resize-none"
        />
      </div>
      <div className="text-xs text-gray-600">
        <strong>Note:</strong> This content can be edited later from the dashboard.
        Markdown formatting is supported.
      </div>
    </div>
  );
};
