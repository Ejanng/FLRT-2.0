import { useNavigate } from "@tanstack/react-router";
import {
  Box,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
} from "lucide-react";

import "../styles.css";
import type { ReactNode } from "react";

type AdminDashboardProps = {
  children?: ReactNode;
};

export default function AdminDashboard({ children }: AdminDashboardProps) {
  const navigate = useNavigate();

  const handleTabClick = (tab: string) => {
    switch (tab) {
      case "all":
        navigate({ to: "/admin/dashboard" });
        break;
      case "verify":
        navigate({ to: "/admin/dashboard/verify" });
        break;
      case "reports":
        navigate({ to: "/admin/dashboard/reports" });
        break;
      default:
        navigate({ to: "/admin/dashboard" });
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Box size={18} /></div>
          <div className="stat-title">Total Reports</div>
          <div className="stat-value">267</div>
          <div className="stat-change positive">+12.5%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Clock size={18} /></div>
          <div className="stat-title">Pending Claims</div>
          <div className="stat-value">0</div>
          <div className="stat-change positive">+5.2%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={18} /></div>
          <div className="stat-title">Resolved</div>
          <div className="stat-value">90</div>
          <div className="stat-change positive">+18.3%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><TrendingUp size={18} /></div>
          <div className="stat-title">Active Users</div>
          <div className="stat-value">1</div>
          <div className="stat-change positive">+24.1%</div>
        </div>
      </div>

      <div className="reports-card">
        <div className="dashboard-tabs">
          <button className="tab" onClick={() => handleTabClick("all")}>
            All Reports
          </button>
          <button className="tab" onClick={() => handleTabClick("verify")}>
            Verify Claims
          </button>
          <button className="tab" onClick={() => handleTabClick("reports")}>
            Manage Reports
          </button>
        </div>

        <div className="reports-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search reports..." />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}