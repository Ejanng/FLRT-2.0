import React from "react";
import "./Reports.css";
import Reports from "./Reports";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReportForm from "./ReportForm";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Reports />} />
          <Route path="/report" element={<ReportForm />} />
          /* CLaim Routes */
        </Routes>
      </div>
    </Router>
  );
}

export default App;
