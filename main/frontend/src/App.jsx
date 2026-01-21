import { useState } from "react";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({
    object_name: "",
    category: "",
    description: "",
    date_reported: "",
    last_location: "",
    status: "",
    reporter_contact: "",
    image_url: "",
  });

  

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:5000/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result); // check the output
        alert("Report added! ID: " + result.object_id);
        // Reset form
        setFormData({
          object_name: "",
          category: "",
          description: "",
          date_reported: "",
          last_location: "",
          status: "",
          reporter_contact: "",
          image_url: "",
        });
      } else {
        alert("Failed to add report");
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting report");
    }
  };

  return (
    <div className="App">
      <h1>Add a Lost/Found Report</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="object_name"
          placeholder="Object Name"
          value={formData.object_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="date_reported"
          value={formData.date_reported}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="last_location"
          placeholder="Last Location"
          value={formData.last_location}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="status"
          placeholder="Status"
          value={formData.status}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="reporter_contact"
          placeholder="Contact (optional)"
          value={formData.reporter_contact}
          onChange={handleChange}
        />
        <input
          type="text"
          name="image_url"
          placeholder="Image URL (optional)"
          value={formData.image_url}
          onChange={handleChange}
        />
        <button type="submit">Submit Report</button>
      </form>
    </div>
  );
}

export default App;
