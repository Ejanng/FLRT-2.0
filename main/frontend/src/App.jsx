import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("login"); // login, register, report, claim, dashboard
  const [token, setToken] = useState(""); // store auth token if backend uses JWT
  const [user, setUser] = useState(null);

  // ----- Form states -----
  const [registerData, setRegisterData] = useState({
    student_number: "",
    email: "",
    password: "",
  });

  const [loginData, setLoginData] = useState({
    student_number: "",
    password: "",
  });

  const [reportData, setReportData] = useState({
    object_name: "",
    category: "",
    description: "",
    date_reported: "",
    last_location: "",
    status: "reported",
    image_url: "",
  });

  const [claimData, setClaimData] = useState({
    object_id: "",
  });

  const [reports, setReports] = useState([]);
  const [claims, setClaims] = useState([]);

  // ----- Handle input changes -----
  const handleChange = (e, formSetter) => {
    const { name, value } = e.target;
    formSetter(prev => ({ ...prev, [name]: value }));
  };

  // ----- API helpers -----
  const apiFetch = async (url, method, data) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000${url}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: data ? JSON.stringify(data) : null,
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // ----- Register -----
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/register", "POST", registerData);
    if (res?.success) {
      alert("Registered successfully!");
      setPage("login");
    } else alert(res?.error || "Failed to register");
  };

  // ----- Login -----
  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/login", "POST", loginData);
    if (res?.token) {
      setToken(res.token);
      setUser(res.user);
      setPage("dashboard");
    } else alert(res?.error || "Login failed");
  };

  // ----- Submit Report -----
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/reports", "POST", reportData);
    if (res?.report_id) {
      alert("Report submitted! ID: " + res.report_id);
      setReportData({
        object_name: "",
        category: "",
        description: "",
        date_reported: "",
        last_location: "",
        status: "reported",
        image_url: "",
      });
    } else alert("Failed to submit report");
  };

  // ----- Submit Claim -----
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/claims", "POST", claimData);
    if (res?.claimant_id) {
      alert("Claim submitted! ID: " + res.claimant_id);
      setClaimData({ object_id: "" });
    } else alert("Failed to submit claim");
  };

  // ----- Fetch reports & claims -----
  useEffect(() => {
    if (page === "dashboard" && token) {
      apiFetch("/my-reports", "GET").then(setReports);
      apiFetch("/my-claims", "GET").then(setClaims);
    }
  }, [page, token]);

  // ----- Page Components -----
  if (page === "register") return (
    <div className="App">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input type="text" name="student_number" placeholder="Student Number"
          value={registerData.student_number}
          onChange={e => handleChange(e, setRegisterData)} required /><br/>
        <input type="email" name="email" placeholder="Email"
          value={registerData.email}
          onChange={e => handleChange(e, setRegisterData)} required /><br/>
        <input type="text" name="contact_info" placeholder="Contact Info"
          value={registerData.contact_info}
          onChange={e => handleChange(e, setRegisterData)} required /><br/>
        <input type="password" name="password" placeholder="Password"
          value={registerData.password}
          onChange={e => handleChange(e, setRegisterData)} required /><br/>
        <button type="submit">Register</button>
      </form>
      <p onClick={() => setPage("login")} style={{cursor:"pointer"}}>Already have an account? Login</p>
    </div>
  );

  if (page === "login") return (
    <div className="App">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input type="text" name="student_number" placeholder="Student Number"
          value={loginData.student_number}
          onChange={e => handleChange(e, setLoginData)} required /><br/>
        <input type="password" name="password" placeholder="Password"
          value={loginData.password}
          onChange={e => handleChange(e, setLoginData)} required /><br/>
        <button type="submit">Login</button>
      </form>
      <p onClick={() => setPage("register")} style={{cursor:"pointer"}}>Don't have an account? Register</p>
    </div>
  );

  // ----- Dashboard -----
  return (
    <div className="App">
      <h1>Welcome, {user?.student_number || "Student"}</h1>
      <button onClick={() => setPage("report")}>Submit Report</button>
      <button onClick={() => setPage("claim")}>Submit Claim</button>
      <button onClick={() => setPage("dashboard")}>View Dashboard</button>

      {page === "report" && (
        <div>
          <h2>Submit Report</h2>
          <form onSubmit={handleReportSubmit}>
            <input type="text" name="object_name" placeholder="Object Name"
              value={reportData.object_name} onChange={e=>handleChange(e,setReportData)} required /><br/>
            <input type="text" name="category" placeholder="Category"
              value={reportData.category} onChange={e=>handleChange(e,setReportData)} required /><br/>
            <input type="text" name="description" placeholder="Description"
              value={reportData.description} onChange={e=>handleChange(e,setReportData)} required /><br/>
            <input type="date" name="date_reported"
              value={reportData.date_reported} onChange={e=>handleChange(e,setReportData)} required /><br/>
            <input type="text" name="last_location" placeholder="Last Location"
              value={reportData.last_location} onChange={e=>handleChange(e,setReportData)} required /><br/>
            <input type="text" name="image_url" placeholder="Image URL (optional)"
              value={reportData.image_url} onChange={e=>handleChange(e,setReportData)} /><br/>
            <button type="submit">Submit Report</button>
          </form>
        </div>
      )}

      {page === "claim" && (
        <div>
          <h2>Submit Claim</h2>
          <form onSubmit={handleClaimSubmit}>
            <input type="number" name="object_id" placeholder="Object ID to claim"
              value={claimData.object_id} onChange={e=>handleChange(e,setClaimData)} required /><br/>
            <button type="submit">Submit Claim</button>
          </form>
        </div>
      )}

      {page === "dashboard" && (
        <div>
          <h2>My Reports</h2>
          <ul>
            {reports.map(r => (
              <li key={r.object_id}>
                {r.object_name} - {r.status} - {r.date_reported}
              </li>
            ))}
          </ul>

          <h2>My Claims</h2>
          <ul>
            {claims.map(c => (
              <li key={c.claimant_id}>
                Claiming Object ID: {c.object_id} - Date: {c.claim_date}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
