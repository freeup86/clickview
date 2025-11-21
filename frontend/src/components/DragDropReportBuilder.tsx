/**
 * Drag & Drop Report Builder Canvas
 *
 * Visual report builder with drag-and-drop interface:
 * - Draggable element palette
 * - Canvas with grid snapping
 * - Element positioning and resizing
 * - Multi-selection support
 * - Undo/redo functionality
 * - Alignment guides
 * - Copy/paste support
 * - Layer management
 * - Responsive preview
 */

import React, { useState, useRef, useEffect } from 'react';
import { ReportElement, ReportElementType, Report } from '../types/reports';

// ===================================================================
// MAIN DRAG DROP REPORT BUILDER
// ===================================================================

interface DragDropReportBuilderProps {
  report: Report;
  onSave: (report: Report) => void;
  onCancel: () => void;
}

export const DragDropReportBuilder: React.FC<DragDropReportBuilderProps> = ({ report, onSave, onCancel }) => {
  const [elements, setElements] = useState<CanvasElement[]>(
    report.elements.map((el, index) => ({
      ...el,
      x: el.layout?.x || 0,
      y: el.layout?.y || 0,
      width: el.layout?.width || 400,
      height: el.layout?.height || 300,
      zIndex: el.layout?.zIndex || index,
    }))
  );

  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [draggedElement, setDraggedElement] = useState<CanvasElement | null>(null);
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [isDraggingFromPalette, setIsDraggingFromPalette] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<CanvasElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const GRID_SIZE = 20;

  // ===================================================================
  // DRAG AND DROP HANDLERS
  // ===================================================================

  const handlePaletteItemDragStart = (e: React.DragEvent, elementType: ReportElementType) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('elementType', elementType);
    setIsDraggingFromPalette(true);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isDraggingFromPalette ? 'copy' : 'move';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / canvasScale;
    let y = (e.clientY - rect.top) / canvasScale;

    if (snapToGrid) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    if (isDraggingFromPalette) {
      // Create new element from palette
      const elementType = e.dataTransfer.getData('elementType') as ReportElementType;
      const newElement = createDefaultElement(elementType, x, y);
      addElement(newElement);
    }

    setIsDraggingFromPalette(false);
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();

    // Update selection
    if (e.ctrlKey || e.metaKey) {
      setSelectedElements((prev) => (prev.includes(elementId) ? prev.filter((id) => id !== elementId) : [...prev, elementId]));
    } else if (!selectedElements.includes(elementId)) {
      setSelectedElements([elementId]);
    }

    // Start dragging
    const element = elements.find((el) => el.id === elementId);
    if (element) {
      setDraggedElement({
        ...element,
        offsetX: e.clientX - element.x * canvasScale,
        offsetY: e.clientY - element.y * canvasScale,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggedElement && !resizingElement) {
      let newX = (e.clientX - (draggedElement.offsetX || 0)) / canvasScale;
      let newY = (e.clientY - (draggedElement.offsetY || 0)) / canvasScale;

      if (snapToGrid) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }

      // Calculate delta for multi-selection
      const deltaX = newX - draggedElement.x;
      const deltaY = newY - draggedElement.y;

      setElements((prev) =>
        prev.map((el) => {
          if (selectedElements.includes(el.id)) {
            return {
              ...el,
              x: el.x + deltaX,
              y: el.y + deltaY,
            };
          }
          return el;
        })
      );

      setDraggedElement({ ...draggedElement, x: newX, y: newY });
    }

    if (resizingElement) {
      const element = elements.find((el) => el.id === resizingElement);
      if (element && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        let newWidth = (e.clientX - rect.left) / canvasScale - element.x;
        let newHeight = (e.clientY - rect.top) / canvasScale - element.y;

        if (snapToGrid) {
          newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
          newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
        }

        setElements((prev) =>
          prev.map((el) => (el.id === resizingElement ? { ...el, width: Math.max(100, newWidth), height: Math.max(100, newHeight) } : el))
        );
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggedElement) {
      addToHistory(elements);
    }
    setDraggedElement(null);
    setResizingElement(null);
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setResizingElement(elementId);
  };

  // ===================================================================
  // ELEMENT MANAGEMENT
  // ===================================================================

  const addElement = (element: CanvasElement) => {
    const newElements = [...elements, element];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElements([element.id]);
  };

  const deleteSelectedElements = () => {
    const newElements = elements.filter((el) => !selectedElements.includes(el.id));
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElements([]);
  };

  const duplicateSelectedElements = () => {
    const duplicates = elements
      .filter((el) => selectedElements.includes(el.id))
      .map((el) => ({
        ...el,
        id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: el.x + 20,
        y: el.y + 20,
      }));

    const newElements = [...elements, ...duplicates];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElements(duplicates.map((el) => el.id));
  };

  const bringToFront = () => {
    const maxZ = Math.max(...elements.map((el) => el.zIndex));
    setElements((prev) =>
      prev.map((el) => (selectedElements.includes(el.id) ? { ...el, zIndex: maxZ + 1 } : el))
    );
  };

  const sendToBack = () => {
    const minZ = Math.min(...elements.map((el) => el.zIndex));
    setElements((prev) =>
      prev.map((el) => (selectedElements.includes(el.id) ? { ...el, zIndex: minZ - 1 } : el))
    );
  };

  const alignLeft = () => {
    if (selectedElements.length === 0) return;
    const minX = Math.min(...elements.filter((el) => selectedElements.includes(el.id)).map((el) => el.x));
    setElements((prev) =>
      prev.map((el) => (selectedElements.includes(el.id) ? { ...el, x: minX } : el))
    );
    addToHistory(elements);
  };

  const alignTop = () => {
    if (selectedElements.length === 0) return;
    const minY = Math.min(...elements.filter((el) => selectedElements.includes(el.id)).map((el) => el.y));
    setElements((prev) =>
      prev.map((el) => (selectedElements.includes(el.id) ? { ...el, y: minY } : el))
    );
    addToHistory(elements);
  };

  const alignCenter = () => {
    if (selectedElements.length === 0) return;
    const selectedEls = elements.filter((el) => selectedElements.includes(el.id));
    const avgX = selectedEls.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selectedEls.length;
    setElements((prev) =>
      prev.map((el) => (selectedElements.includes(el.id) ? { ...el, x: avgX - el.width / 2 } : el))
    );
    addToHistory(elements);
  };

  const distributeHorizontally = () => {
    if (selectedElements.length < 3) return;
    const selectedEls = elements.filter((el) => selectedElements.includes(el.id)).sort((a, b) => a.x - b.x);
    const minX = selectedEls[0].x;
    const maxX = selectedEls[selectedEls.length - 1].x + selectedEls[selectedEls.length - 1].width;
    const totalWidth = selectedEls.reduce((sum, el) => sum + el.width, 0);
    const spacing = (maxX - minX - totalWidth) / (selectedEls.length - 1);

    let currentX = minX;
    const newPositions = selectedEls.map((el) => {
      const newX = currentX;
      currentX += el.width + spacing;
      return { id: el.id, x: newX };
    });

    setElements((prev) =>
      prev.map((el) => {
        const newPos = newPositions.find((p) => p.id === el.id);
        return newPos ? { ...el, x: newPos.x } : el;
      })
    );
    addToHistory(elements);
  };

  // ===================================================================
  // HISTORY MANAGEMENT
  // ===================================================================

  const addToHistory = (newElements: CanvasElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  // ===================================================================
  // KEYBOARD SHORTCUTS
  // ===================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedElements();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElements.length > 0) {
          e.preventDefault();
          deleteSelectedElements();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedElements(elements.map((el) => el.id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, elements, historyIndex]);

  // ===================================================================
  // SAVE HANDLER
  // ===================================================================

  const handleSave = () => {
    const updatedReport = {
      ...report,
      elements: elements.map((el) => ({
        ...el,
        layout: {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          zIndex: el.zIndex,
        },
      })),
    };
    onSave(updatedReport);
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex">
      {/* Toolbar */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            ← Back
          </button>
          <h2 className="text-xl font-bold">{report.name}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷
          </button>

          <div className="w-px h-8 bg-gray-600 mx-2" />

          {/* Alignment */}
          <button onClick={alignLeft} disabled={selectedElements.length === 0} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" title="Align Left">
            ⫴
          </button>
          <button onClick={alignCenter} disabled={selectedElements.length === 0} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" title="Align Center">
            ≡
          </button>
          <button onClick={alignTop} disabled={selectedElements.length === 0} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" title="Align Top">
            ⫸
          </button>
          <button onClick={distributeHorizontally} disabled={selectedElements.length < 3} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" title="Distribute Horizontally">
            ⟷
          </button>

          <div className="w-px h-8 bg-gray-600 mx-2" />

          {/* Layer */}
          <button onClick={bringToFront} disabled={selectedElements.length === 0} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" title="Bring to Front">
            ⬆
          </button>
          <button onClick={sendToBack} disabled={selectedElements.length === 0} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" title="Send to Back">
            ⬇
          </button>

          <div className="w-px h-8 bg-gray-600 mx-2" />

          {/* View */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-2 rounded ${showGrid ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Toggle Grid"
          >
            #
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-3 py-2 rounded ${snapToGrid ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Snap to Grid"
          >
            ⊞
          </button>

          <div className="w-px h-8 bg-gray-600 mx-2" />

          {/* Zoom */}
          <button onClick={() => setCanvasScale((s) => Math.max(0.25, s - 0.25))} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            −
          </button>
          <span className="px-3 text-sm">{Math.round(canvasScale * 100)}%</span>
          <button onClick={() => setCanvasScale((s) => Math.min(2, s + 0.25))} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            +
          </button>

          <div className="w-px h-8 bg-gray-600 mx-2" />

          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold">
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Element Palette */}
        <ElementPalette onDragStart={handlePaletteItemDragStart} />

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-700 p-8">
          <div
            ref={canvasRef}
            className="relative bg-white mx-auto"
            style={{
              width: 1200 * canvasScale,
              height: 800 * canvasScale,
              transform: `scale(${canvasScale})`,
              transformOrigin: 'top left',
              backgroundImage: showGrid ? `linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)` : undefined,
              backgroundSize: showGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : undefined,
            }}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {elements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => (
                <CanvasElementComponent
                  key={element.id}
                  element={element}
                  isSelected={selectedElements.includes(element.id)}
                  onMouseDown={handleElementMouseDown}
                  onResizeStart={handleResizeStart}
                />
              ))}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedElements.length > 0 && (
          <PropertiesPanel
            elements={elements.filter((el) => selectedElements.includes(el.id))}
            onUpdate={(id, updates) => {
              setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
              addToHistory(elements);
            }}
            onDelete={deleteSelectedElements}
            onDuplicate={duplicateSelectedElements}
          />
        )}
      </div>
    </div>
  );
};

// ===================================================================
// ELEMENT PALETTE
// ===================================================================

interface ElementPaletteProps {
  onDragStart: (e: React.DragEvent, type: ReportElementType) => void;
}

const ElementPalette: React.FC<ElementPaletteProps> = ({ onDragStart }) => {
  const elements = [
    { type: ReportElementType.CHART, icon: '📊', label: 'Chart' },
    { type: ReportElementType.TABLE, icon: '📋', label: 'Table' },
    { type: ReportElementType.METRIC_CARD, icon: '🎯', label: 'Metric' },
    { type: ReportElementType.TEXT, icon: '📝', label: 'Text' },
    { type: ReportElementType.IMAGE, icon: '🖼️', label: 'Image' },
  ];

  return (
    <div className="w-64 bg-gray-800 text-white p-4 overflow-y-auto">
      <h3 className="font-bold mb-4">Elements</h3>
      <div className="space-y-2">
        {elements.map((el) => (
          <div
            key={el.type}
            draggable
            onDragStart={(e) => onDragStart(e, el.type)}
            className="p-4 bg-gray-700 rounded cursor-move hover:bg-gray-600 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">{el.icon}</span>
            <span className="font-medium">{el.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-700">
        <h4 className="font-semibold mb-2">Shortcuts</h4>
        <div className="text-sm text-gray-400 space-y-1">
          <div>Ctrl+Z: Undo</div>
          <div>Ctrl+Shift+Z: Redo</div>
          <div>Ctrl+D: Duplicate</div>
          <div>Delete: Remove</div>
          <div>Ctrl+A: Select All</div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// CANVAS ELEMENT COMPONENT
// ===================================================================

interface CanvasElementComponentProps {
  element: CanvasElement;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
}

const CanvasElementComponent: React.FC<CanvasElementComponentProps> = ({
  element,
  isSelected,
  onMouseDown,
  onResizeStart,
}) => {
  const getElementIcon = (type: ReportElementType): string => {
    const icons: Record<ReportElementType, string> = {
      [ReportElementType.CHART]: '📊',
      [ReportElementType.TABLE]: '📋',
      [ReportElementType.METRIC_CARD]: '🎯',
      [ReportElementType.TEXT]: '📝',
      [ReportElementType.IMAGE]: '🖼️',
      [ReportElementType.FILTER]: '🔍',
    };
    return icons[type] || '📦';
  };

  return (
    <div
      className={`absolute border-2 ${
        isSelected ? 'border-blue-500' : 'border-gray-300'
      } bg-white cursor-move hover:border-blue-400 transition-colors`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
      }}
      onMouseDown={(e) => onMouseDown(e, element.id)}
    >
      {/* Element Content */}
      <div className="p-4 h-full flex flex-col items-center justify-center text-gray-400">
        <span className="text-4xl mb-2">{getElementIcon(element.type)}</span>
        <span className="text-sm font-medium">{element.name}</span>
        <span className="text-xs">{element.type}</span>
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
          onMouseDown={(e) => onResizeStart(e, element.id)}
        />
      )}
    </div>
  );
};

// ===================================================================
// PROPERTIES PANEL
// ===================================================================

interface PropertiesPanelProps {
  elements: CanvasElement[];
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ elements, onUpdate, onDelete, onDuplicate }) => {
  const element = elements[0]; // Show properties for first selected element

  return (
    <div className="w-80 bg-gray-800 text-white p-4 overflow-y-auto">
      <h3 className="font-bold mb-4">Properties</h3>

      {elements.length === 1 ? (
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={element.name}
              onChange={(e) => onUpdate(element.id, { name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">X</label>
              <input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => onUpdate(element.id, { x: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Y</label>
              <input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => onUpdate(element.id, { y: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Width</label>
              <input
                type="number"
                value={Math.round(element.width)}
                onChange={(e) => onUpdate(element.id, { width: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height</label>
              <input
                type="number"
                value={Math.round(element.height)}
                onChange={(e) => onUpdate(element.id, { height: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-gray-700">
            <button onClick={onDuplicate} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Duplicate (Ctrl+D)
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-400">
          <p className="mb-4">{elements.length} elements selected</p>
          <div className="space-y-2">
            <button onClick={onDuplicate} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Duplicate All
            </button>
            <button onClick={onDelete} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
              Delete All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function createDefaultElement(type: ReportElementType, x: number, y: number): CanvasElement {
  const baseElement = {
    id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: `${type} ${Date.now()}`,
    x,
    y,
    width: 400,
    height: 300,
    zIndex: Date.now(),
  };

  // Type-specific defaults would be added here
  return baseElement as CanvasElement;
}

// ===================================================================
// TYPES
// ===================================================================

interface CanvasElement extends ReportElement {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  offsetX?: number;
  offsetY?: number;
}
