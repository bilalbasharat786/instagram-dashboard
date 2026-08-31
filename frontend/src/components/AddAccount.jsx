import { useState } from "react";
import api from "../services/api";

const AddAccount = ({ onAccountAdded }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setMessage("Username enter karo.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await api.post(
        "/accounts",
        {
          username: username.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);
      setUsername("");

      if (onAccountAdded) {
        onAccountAdded();
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Account add nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Add Account</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Instagram username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Account"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default AddAccount;