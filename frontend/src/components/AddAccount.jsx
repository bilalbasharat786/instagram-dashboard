import { useState } from "react";
import api from "../services/api";

const AddAccount = ({ onAccountAdded }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim()) {
      setMessage("Username enter karo.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const response = await api.post("/accounts/connect", {
        username: username.trim(),
      });

      setMessage(response.data.message);
      setUsername("");

      if (response.data.authorizationUrl) {
        window.open(response.data.authorizationUrl, "_blank", "noopener,noreferrer");
      }

      onAccountAdded?.();
    } catch (error) {
      setMessage(error.response?.data?.message || "Account add nahi ho saka.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Connect Account</h2>
          <p>Instagram username add karo, phir Electron login window mein manually login karo.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="instagram.username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Account"}
        </button>
      </form>

      {message && <div className="alert info">{message}</div>}
    </section>
  );
};

export default AddAccount;
