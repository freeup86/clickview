import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>
      <div className="card max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Application Settings</h3>
        <p className="text-gray-600">Configure your ClickView application settings here.</p>
      </div>
    </div>
  );
};

export default SettingsPage;