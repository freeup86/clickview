import React from 'react';
import Select from 'react-select';
import useStore from '../store/useStore';

const WorkspaceSelector: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useStore();

  const options = workspaces.map((workspace) => ({
    value: workspace.id,
    label: workspace.name,
  }));

  const currentOption = currentWorkspace
    ? { value: currentWorkspace.id, label: currentWorkspace.name }
    : null;

  const handleChange = (option: any) => {
    const workspace = workspaces.find((w) => w.id === option.value);
    if (workspace) {
      setCurrentWorkspace(workspace);
    }
  };

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: '#e5e7eb',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#7B68EE',
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#7B68EE' : state.isFocused ? '#f3f1ff' : 'white',
      color: state.isSelected ? 'white' : '#323338',
    }),
  };

  return (
    <div>
      <label className="label">Current Workspace</label>
      <Select
        value={currentOption}
        onChange={handleChange}
        options={options}
        styles={customStyles}
        placeholder="Select a workspace..."
        isClearable={false}
        isSearchable={true}
      />
    </div>
  );
};

export default WorkspaceSelector;