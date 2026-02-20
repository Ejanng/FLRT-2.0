import { Mail, Lock, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import "../styles.css";

export default function Admin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.type === "email" ? "email" : "password"]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form), // 🔥 Send JSON
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save token
      localStorage.setItem("admin_token", data.access_token);

      // Redirect
      navigate({ to: "/admin/dashboard" });

    } catch (error) {
      alert("Invalid admin credentials");
      console.error(error);
    }
  };

  return (
    <div className="Admin-login-page">
      <div className="Admin-login-card">
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="Admin-form-group">
            <label>Admin Account</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                placeholder="your.admin.account"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="Admin-form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <Eye size={18} className="eye-icon" />
            </div>
          </div>

          <button type="submit" className="Admin-login-btn">
            <Lock size={18} />
            Login to FLIRT
          </button>
        </form>
      </div>
    </div>
  );
}