import React from "react";
import "./Reports.css";
import { useNavigate } from "react-router-dom";

const Reports: React.FC = () => {
    const navigate = useNavigate();

  return (
    <div className="reports-page">
      <div className="hero-icon">
        🔍
      </div>
      <h1 className="title">FLIRT</h1>
      <p className="subtitle">
        Finding and Locating lost Items to Return to Their rightful owners
      </p>
      
      <div className="actions">
        <button className="btn primary" onClick={() => navigate("/report")}>
          Report
        </button>

        <button className="btn secondary">
          🔍 Find My Item →
        </button>
      </div>
    </div>
  );
};

export default Reports;
