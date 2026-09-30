import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { NewReconstruction } from './pages/NewReconstruction';
import { Project } from './pages/Project';
import { Experiments } from './pages/Experiments';
import { Evaluation } from './pages/Evaluation';
import { Documentation } from './pages/Documentation';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewReconstruction />} />
          <Route path="/project/:id" element={<Project />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
