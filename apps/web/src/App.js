import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LensExplorerLinear from './components/LensExplorerLinear';
import cacheService from './services/cacheService';
import './App.css';

function App() {
  useEffect(() => {
    // Check server cache version on app load
    cacheService.checkServerVersion();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LensExplorerLinear />} />
          <Route path="/lens/:id" element={<LensExplorerLinear />} />
          <Route path="/frame/:id" element={<LensExplorerLinear />} />
          <Route path="/tag/:name" element={<LensExplorerLinear />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;