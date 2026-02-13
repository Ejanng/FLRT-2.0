    import React from "react";
    import "../styles.css";
    import { useNavigate } from "@tanstack/react-router";

    const Home: React.FC = () => {
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
            <button className="btn primary" onClick={() => navigate({ to: "/report" })}>
            Report
            </button>

            <button className="btn secondary" onClick={() => navigate({to: "/claim"})}>
            🔍 Find My Item →
            </button>
        </div>
        </div>
    );
    };

    export default Home;
