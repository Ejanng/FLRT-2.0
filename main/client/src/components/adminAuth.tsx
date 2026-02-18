 import { Mail, Lock, Eye } from "lucide-react";
import '../styles.css'; 

    export default function Admin() {

    return (
        <div className="Admin-login-page">
        <div className="Admin-login-card">
            {/* Tabs */}
            {/* Email */}
            <div className="Admin-form-group">
            <label>Admin Account</label>
            <div className="input-wrapper">
                <Mail size={18} />
                <input type="email" placeholder="your.admin.account" />
            </div>
            </div>

            {/* Password */}
            <div className="Admin-form-group">
            <label>Password</label>
            <div className="input-wrapper">
                <Lock size={18} />
                <input type="password" placeholder="Enter your password" />
                <Eye size={18} className="eye-icon" />
            </div>
            </div>
            <button className="Admin-login-btn">
            <Lock size={18} />
            Login to FLIRT
            </button>
        </div>
        </div>
    );
    }