import { useState } from "react";
import api from "../services/api";

const CreateWorkflow = ({ accounts, onWorkflowCreated }) => {
  const [targetUsername, setTargetUsername] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts((current) => {
      if (current.includes(accountId)) {
        return current.filter((id) => id !== accountId);
      }

      return [...current, accountId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!targetUsername.trim()) {
      setMessage("Target username enter karo.");
      return;
    }

    if (selectedAccounts.length === 0) {
      setMessage("Kam az kam 1 account select karo.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await api.post(
        "/workflows",
        {
          targetUsername: targetUsername.trim(),
          accountIds: selectedAccounts,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);

      setTargetUsername("");
      setSelectedAccounts([]);

      if (onWorkflowCreated) {
        onWorkflowCreated();
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Workflow create nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Create Workflow</h3>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Target Username</label>

          <input
            type="text"
            placeholder="e.g. bilal.writx"
            value={targetUsername}
            onChange={(e) =>
              setTargetUsername(e.target.value)
            }
          />
        </div>

        <h4>Select Accounts</h4>

        {accounts.length === 0 ? (
          <p>No connected accounts available.</p>
        ) : (
          accounts.map((account) => (
            <label
              key={account._id}
              style={{
                display: "block",
                marginBottom: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={selectedAccounts.includes(
                  account._id
                )}
                onChange={() =>
                  handleAccountToggle(account._id)
                }
              />

              {" "}

              {account.username} — {account.status}
            </label>
          ))
        )}

        <p>
          Selected Accounts:{" "}
          {selectedAccounts.length}
        </p>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Creating..."
            : "Create Workflow"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateWorkflow;