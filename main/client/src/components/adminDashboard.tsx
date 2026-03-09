import { useNavigate } from "@tanstack/react-router";
import {
  Box,
  Clock,
  CheckCircle,
  Search,
} from "lucide-react";

import "../styles.css";
import { useEffect, useState, type ReactNode } from "react";

const API_BASE_URL = "http://localhost:5000";

type DashboardStats = {
  total_reports: number;
  pending_claims: number;
  resolved_claims: number;
};

type AdminDashboardProps = {
  children?: ReactNode;
};

export default function AdminDashboard({ children }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total_reports: 0,
    pending_claims: 0,
    resolved_claims: 0,
  });

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        let response = await fetch(`${API_BASE_URL}/stats/admin-dashboard`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        });

        if (!response.ok) {
          response = await fetch(`${API_BASE_URL}/stats/dashboard`);
        }

        if (!response.ok) {
          console.error(`Failed to load dashboard stats: ${response.status}`);
          return;
        }

        const data = (await response.json()) as Partial<DashboardStats>;
        setStats({
          total_reports: Number(data.total_reports ?? 0),
          pending_claims: Number(data.pending_claims ?? 0),
          resolved_claims: Number(data.resolved_claims ?? 0),
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Box size={18} /></div>
          <div className="stat-title">Total Reports</div>
          <div className="stat-value">{stats.total_reports}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Clock size={18} /></div>
          <div className="stat-title">Pending Claims</div>
          <div className="stat-value">{stats.pending_claims}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={18} /></div>
          <div className="stat-title">Resolved</div>
          <div className="stat-value">{stats.resolved_claims}</div>
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