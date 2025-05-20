// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import WhiteBoard from './components/WhiteBoard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/whiteboard" element={<WhiteBoard />} />
    </Routes>
  );
};

export default App;
