// Clear localStorage utility to fix workspace mismatch
export const clearWorkspaceStorage = () => {
  const storage = localStorage.getItem('clickview-storage');
  if (storage) {
    try {
      const data = JSON.parse(storage);
      // Clear only the currentWorkspace to force re-fetch
      delete data.state.currentWorkspace;
      localStorage.setItem('clickview-storage', JSON.stringify(data));
      console.log('Cleared currentWorkspace from storage');
    } catch (error) {
      console.error('Failed to clear workspace storage:', error);
      // If parsing fails, clear everything
      localStorage.removeItem('clickview-storage');
      console.log('Cleared all clickview storage');
    }
  }
  // Force page reload to re-fetch correct workspace
  window.location.reload();
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).clearWorkspaceStorage = clearWorkspaceStorage;
}