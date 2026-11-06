import React, { useState } from 'react';
import { NavPage } from './types';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { NewReviewPage } from './pages/NewReviewPage';
import { ReviewHistoryPage } from './pages/ReviewHistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'new-review':
        return <NewReviewPage />;
      case 'history':
        return <ReviewHistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderCurrentPage()}
    </DashboardLayout>
  );
};

export default App;

