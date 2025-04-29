import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import LendingPage from "./pages/LendingPage";

const App: React.FC = () => (
  <BrowserRouter>
    <NavBar />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lend" element={<LendingPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
