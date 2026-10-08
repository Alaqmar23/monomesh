import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreatorStudio } from './pages/CreatorStudio';
import { LandingPage } from './pages/LandingPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreatorStudio />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
