/**
 * Report Builder Context
 *
 * Manages state for the enterprise report builder:
 * - Current report being edited
 * - Element selection and manipulation
 * - Undo/redo history
 * - Clipboard operations
 * - Report settings and configuration
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  Report,
  ReportElement,
  ReportBuilderState,
  ReportHistoryEntry,
  ReportLayout,
  ReportSettings,
  ElementPosition,
} from '../types/reports';

// ===================================================================
// CONTEXT TYPES
// ===================================================================

interface ReportBuilderContextValue {
  // State
  state: ReportBuilderState;
  report: Report | null;

  // Report actions
  createNewReport: (template?: Partial<Report>) => void;
  loadReport: (report: Report) => void;
  saveReport: () => Promise<void>;
  updateReportMetadata: (updates: Partial<Report>) => void;

  // Element actions
  addElement: (element: ReportElement) => void;
  updateElement: (elementId: string, updates: Partial<ReportElement>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  moveElement: (elementId: string, position: ElementPosition) => void;

  // Selection actions
  selectElement: (elementId: string, multiSelect?: boolean) => void;
  selectElements: (elementIds: string[]) => void;
  clearSelection: () => void;
  getSelectedElements: () => ReportElement[];

  // Layer actions
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;

  // Clipboard actions
  copy: () => void;
  cut: () => void;
  paste: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Layout actions
  updateLayout: (layout: Partial<ReportLayout>) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // Mode actions
  setMode: (mode: 'design' | 'preview' | 'data') => void;

  // Settings actions
  updateSettings: (settings: Partial<ReportSettings>) => void;

  // Utility
  getElementById: (elementId: string) => ReportElement | undefined;
  isDirty: boolean;
}

interface ReportBuilderProviderProps {
  children: React.ReactNode;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  maxHistorySize?: number;
  onSave?: (report: Report) => Promise<void>;
}

// ===================================================================
// CONTEXT CREATION
// ===================================================================

const ReportBuilderContext = createContext<ReportBuilderContextValue | undefined>(undefined);

// ===================================================================
// PROVIDER COMPONENT
// ===================================================================

export const ReportBuilderProvider: React.FC<ReportBuilderProviderProps> = ({
  children,
  autoSave = false,
  autoSaveInterval = 30000, // 30 seconds
  maxHistorySize = 50,
  onSave,
}) => {
  // Initial state
  const [state, setState] = useState<ReportBuilderState>({
    currentReport: null,
    selectedElements: [],
    clipboard: [],
    history: [],
    historyIndex: -1,
    isDirty: false,
    mode: 'design',
    gridVisible: true,
    snapToGrid: true,
    zoom: 1,
  });

  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Get current report from state
  const report = state.currentReport;

  // ===================================================================
  // HISTORY MANAGEMENT
  // ===================================================================

  const addToHistory = useCallback((action: string) => {
    if (!state.currentReport) return;

    setState((prev) => {
      // Remove any history after current index (for branching)
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);

      // Add new entry
      newHistory.push({
        timestamp: new Date(),
        action,
        report: JSON.parse(JSON.stringify(prev.currentReport)), // Deep clone
      });

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      };
    });
  }, [state.currentReport, maxHistorySize]);

  // ===================================================================
  // REPORT ACTIONS
  // ===================================================================

  const createNewReport = useCallback((template?: Partial<Report>) => {
    const newReport: Report = {
      id: `report_${Date.now()}`,
      name: 'New Report',
      description: '',
      category: 'custom',
      tags: [],
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        pageSize: 'screen',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        grid: {
          enabled: true,
          columns: 12,
          rows: 12,
          columnGap: 10,
          rowGap: 10,
          snapToGrid: true,
        },
      },
      elements: [],
      dataSources: {},
      calculatedFields: [],
      parameters: [],
      createdBy: 'current_user', // TODO: Get from auth context
      createdAt: new Date(),
      version: 1,
      settings: {
        theme: 'light',
        responsiveMode: false,
        autoRefresh: false,
        timezone: 'UTC',
        locale: 'en-US',
        exportSettings: {
          allowPDF: true,
          allowExcel: true,
          allowCSV: true,
          allowImage: true,
          allowPrint: true,
        },
        interactivity: {
          enableFiltering: true,
          enableDrilldown: true,
          enableTooltips: true,
          enableCrosshair: false,
          enableSelection: true,
          enableZoom: false,
        },
      },
      sharing: {
        visibility: 'private',
        permissions: [],
        embedEnabled: false,
      },
      ...template,
    };

    setState((prev) => ({
      ...prev,
      currentReport: newReport,
      selectedElements: [],
      history: [{ timestamp: new Date(), action: 'Create Report', report: newReport }],
      historyIndex: 0,
      isDirty: false,
    }));
  }, []);

  const loadReport = useCallback((report: Report) => {
    setState((prev) => ({
      ...prev,
      currentReport: report,
      selectedElements: [],
      history: [{ timestamp: new Date(), action: 'Load Report', report }],
      historyIndex: 0,
      isDirty: false,
    }));
  }, []);

  const saveReport = useCallback(async () => {
    if (!state.currentReport) return;

    if (onSave) {
      await onSave(state.currentReport);
    }

    setState((prev) => ({
      ...prev,
      isDirty: false,
    }));
  }, [state.currentReport, onSave]);

  const updateReportMetadata = useCallback((updates: Partial<Report>) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const updatedReport = {
        ...prev.currentReport,
        ...updates,
        modifiedAt: new Date(),
        version: prev.currentReport.version + 1,
      };

      return {
        ...prev,
        currentReport: updatedReport,
        isDirty: true,
      };
    });

    addToHistory('Update Report Metadata');
  }, [addToHistory]);

  // ===================================================================
  // ELEMENT ACTIONS
  // ===================================================================

  const addElement = useCallback((element: ReportElement) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const updatedReport = {
        ...prev.currentReport,
        elements: [...prev.currentReport.elements, element],
      };

      return {
        ...prev,
        currentReport: updatedReport,
        selectedElements: [element.id],
      };
    });

    addToHistory(`Add ${element.type} Element`);
  }, [addToHistory]);

  const updateElement = useCallback((elementId: string, updates: Partial<ReportElement>) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const updatedElements = prev.currentReport.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
      };
    });

    addToHistory('Update Element');
  }, [addToHistory]);

  const deleteElement = useCallback((elementId: string) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const updatedElements = prev.currentReport.elements.filter((el) => el.id !== elementId);

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
        selectedElements: prev.selectedElements.filter((id) => id !== elementId),
      };
    });

    addToHistory('Delete Element');
  }, [addToHistory]);

  const duplicateElement = useCallback((elementId: string) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const elementToDuplicate = prev.currentReport.elements.find((el) => el.id === elementId);
      if (!elementToDuplicate) return prev;

      const duplicatedElement: ReportElement = {
        ...JSON.parse(JSON.stringify(elementToDuplicate)),
        id: `${elementToDuplicate.type}_${Date.now()}`,
        name: `${elementToDuplicate.name} (Copy)`,
        position: {
          ...elementToDuplicate.position,
          x: elementToDuplicate.position.x + 20,
          y: elementToDuplicate.position.y + 20,
        },
      };

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: [...prev.currentReport.elements, duplicatedElement],
        },
        selectedElements: [duplicatedElement.id],
      };
    });

    addToHistory('Duplicate Element');
  }, [addToHistory]);

  const moveElement = useCallback((elementId: string, position: ElementPosition) => {
    updateElement(elementId, { position });
  }, [updateElement]);

  // ===================================================================
  // SELECTION ACTIONS
  // ===================================================================

  const selectElement = useCallback((elementId: string, multiSelect: boolean = false) => {
    setState((prev) => {
      if (multiSelect) {
        const isSelected = prev.selectedElements.includes(elementId);
        return {
          ...prev,
          selectedElements: isSelected
            ? prev.selectedElements.filter((id) => id !== elementId)
            : [...prev.selectedElements, elementId],
        };
      } else {
        return {
          ...prev,
          selectedElements: [elementId],
        };
      }
    });
  }, []);

  const selectElements = useCallback((elementIds: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedElements: elementIds,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedElements: [],
    }));
  }, []);

  const getSelectedElements = useCallback((): ReportElement[] => {
    if (!state.currentReport) return [];
    return state.currentReport.elements.filter((el) =>
      state.selectedElements.includes(el.id)
    );
  }, [state.currentReport, state.selectedElements]);

  // ===================================================================
  // LAYER ACTIONS
  // ===================================================================

  const bringToFront = useCallback((elementId: string) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const elements = [...prev.currentReport.elements];
      const elementIndex = elements.findIndex((el) => el.id === elementId);
      if (elementIndex === -1) return prev;

      const [element] = elements.splice(elementIndex, 1);
      elements.push(element);

      // Update zIndex
      const updatedElements = elements.map((el, index) => ({
        ...el,
        position: { ...el.position, zIndex: index },
      }));

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
      };
    });

    addToHistory('Bring to Front');
  }, [addToHistory]);

  const sendToBack = useCallback((elementId: string) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const elements = [...prev.currentReport.elements];
      const elementIndex = elements.findIndex((el) => el.id === elementId);
      if (elementIndex === -1) return prev;

      const [element] = elements.splice(elementIndex, 1);
      elements.unshift(element);

      // Update zIndex
      const updatedElements = elements.map((el, index) => ({
        ...el,
        position: { ...el.position, zIndex: index },
      }));

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
      };
    });

    addToHistory('Send to Back');
  }, [addToHistory]);

  const bringForward = useCallback((elementId: string) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const elements = [...prev.currentReport.elements];
      const elementIndex = elements.findIndex((el) => el.id === elementId);
      if (elementIndex === -1 || elementIndex === elements.length - 1) return prev;

      [elements[elementIndex], elements[elementIndex + 1]] = [elements[elementIndex + 1], elements[elementIndex]];

      // Update zIndex
      const updatedElements = elements.map((el, index) => ({
        ...el,
        position: { ...el.position, zIndex: index },
      }));

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
      };
    });

    addToHistory('Bring Forward');
  }, [addToHistory]);

  const sendBackward = useCallback((elementId: string) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const elements = [...prev.currentReport.elements];
      const elementIndex = elements.findIndex((el) => el.id === elementId);
      if (elementIndex === -1 || elementIndex === 0) return prev;

      [elements[elementIndex], elements[elementIndex - 1]] = [elements[elementIndex - 1], elements[elementIndex]];

      // Update zIndex
      const updatedElements = elements.map((el, index) => ({
        ...el,
        position: { ...el.position, zIndex: index },
      }));

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
      };
    });

    addToHistory('Send Backward');
  }, [addToHistory]);

  // ===================================================================
  // CLIPBOARD ACTIONS
  // ===================================================================

  const copy = useCallback(() => {
    const selectedElements = getSelectedElements();
    setState((prev) => ({
      ...prev,
      clipboard: selectedElements,
    }));
  }, [getSelectedElements]);

  const cut = useCallback(() => {
    const selectedElements = getSelectedElements();
    setState((prev) => {
      if (!prev.currentReport) return prev;

      const updatedElements = prev.currentReport.elements.filter(
        (el) => !prev.selectedElements.includes(el.id)
      );

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: updatedElements,
        },
        clipboard: selectedElements,
        selectedElements: [],
      };
    });

    addToHistory('Cut Elements');
  }, [getSelectedElements, addToHistory]);

  const paste = useCallback(() => {
    if (state.clipboard.length === 0) return;

    setState((prev) => {
      if (!prev.currentReport) return prev;

      const pastedElements: ReportElement[] = prev.clipboard.map((el) => ({
        ...JSON.parse(JSON.stringify(el)),
        id: `${el.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: {
          ...el.position,
          x: el.position.x + 20,
          y: el.position.y + 20,
        },
      }));

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          elements: [...prev.currentReport.elements, ...pastedElements],
        },
        selectedElements: pastedElements.map((el) => el.id),
      };
    });

    addToHistory('Paste Elements');
  }, [state.clipboard, addToHistory]);

  // ===================================================================
  // HISTORY ACTIONS
  // ===================================================================

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;

      const newIndex = prev.historyIndex - 1;
      const historyEntry = prev.history[newIndex];

      return {
        ...prev,
        currentReport: JSON.parse(JSON.stringify(historyEntry.report)),
        historyIndex: newIndex,
        isDirty: true,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;

      const newIndex = prev.historyIndex + 1;
      const historyEntry = prev.history[newIndex];

      return {
        ...prev,
        currentReport: JSON.parse(JSON.stringify(historyEntry.report)),
        historyIndex: newIndex,
        isDirty: true,
      };
    });
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // ===================================================================
  // LAYOUT ACTIONS
  // ===================================================================

  const updateLayout = useCallback((layout: Partial<ReportLayout>) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          layout: {
            ...prev.currentReport.layout,
            ...layout,
          },
        },
      };
    });

    addToHistory('Update Layout');
  }, [addToHistory]);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, zoom)),
    }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState((prev) => ({
      ...prev,
      gridVisible: !prev.gridVisible,
    }));
  }, []);

  const toggleSnapToGrid = useCallback(() => {
    setState((prev) => ({
      ...prev,
      snapToGrid: !prev.snapToGrid,
    }));
  }, []);

  // ===================================================================
  // MODE ACTIONS
  // ===================================================================

  const setMode = useCallback((mode: 'design' | 'preview' | 'data') => {
    setState((prev) => ({
      ...prev,
      mode,
    }));
  }, []);

  // ===================================================================
  // SETTINGS ACTIONS
  // ===================================================================

  const updateSettings = useCallback((settings: Partial<ReportSettings>) => {
    setState((prev) => {
      if (!prev.currentReport) return prev;

      return {
        ...prev,
        currentReport: {
          ...prev.currentReport,
          settings: {
            ...prev.currentReport.settings,
            ...settings,
          },
        },
      };
    });

    addToHistory('Update Settings');
  }, [addToHistory]);

  // ===================================================================
  // UTILITY
  // ===================================================================

  const getElementById = useCallback((elementId: string): ReportElement | undefined => {
    return state.currentReport?.elements.find((el) => el.id === elementId);
  }, [state.currentReport]);

  // ===================================================================
  // AUTO-SAVE
  // ===================================================================

  useEffect(() => {
    if (autoSave && state.isDirty && state.currentReport) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveReport();
      }, autoSaveInterval);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSave, state.isDirty, state.currentReport, autoSaveInterval, saveReport]);

  // ===================================================================
  // KEYBOARD SHORTCUTS
  // ===================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        redo();
      }

      // Copy: Ctrl/Cmd + C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copy();
      }

      // Cut: Ctrl/Cmd + X
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        cut();
      }

      // Paste: Ctrl/Cmd + V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        paste();
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElements.length > 0) {
          e.preventDefault();
          state.selectedElements.forEach(deleteElement);
        }
      }

      // Select All: Ctrl/Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (state.currentReport) {
          selectElements(state.currentReport.elements.map((el) => el.id));
        }
      }

      // Deselect: Escape
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copy, cut, paste, deleteElement, selectElements, clearSelection, state.selectedElements, state.currentReport]);

  // ===================================================================
  // CONTEXT VALUE
  // ===================================================================

  const contextValue: ReportBuilderContextValue = {
    state,
    report,
    createNewReport,
    loadReport,
    saveReport,
    updateReportMetadata,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveElement,
    selectElement,
    selectElements,
    clearSelection,
    getSelectedElements,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    copy,
    cut,
    paste,
    undo,
    redo,
    canUndo,
    canRedo,
    updateLayout,
    setZoom,
    toggleGrid,
    toggleSnapToGrid,
    setMode,
    updateSettings,
    getElementById,
    isDirty: state.isDirty,
  };

  return (
    <ReportBuilderContext.Provider value={contextValue}>
      {children}
    </ReportBuilderContext.Provider>
  );
};

// ===================================================================
// HOOK
// ===================================================================

export const useReportBuilder = (): ReportBuilderContextValue => {
  const context = useContext(ReportBuilderContext);
  if (!context) {
    throw new Error('useReportBuilder must be used within a ReportBuilderProvider');
  }
  return context;
};
