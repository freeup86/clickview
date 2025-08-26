import React from 'react';
import { useParams } from 'react-router-dom';

const SharedDashboardPage: React.FC = () => {
  const { shareToken } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-2xl font-semibold mb-6">Shared Dashboard</h2>
      <p>Viewing shared dashboard with token: {shareToken}</p>
    </div>
  );
};

export default SharedDashboardPage;