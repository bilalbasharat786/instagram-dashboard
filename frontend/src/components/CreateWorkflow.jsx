import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "./StatusBadge";

const CreateWorkflow = ({ accounts, onWorkflowCreated }) => {
  const navigate = useNavigate();
  const [targetUsername, setTargetUsername] = useState("");
  const [actionType, setActionType] = useState("FOLLOW");
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = account.username
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || account.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [accounts, search, filter]);

  const connectedAccountIds = filteredAccounts
    .filter((account) => account.status === "CONNECTED")
    .map((account) => account._id);

  const handleSelectAll = () => {
    setSelectedAccounts((current) => [
      ...new Set([...current, ...connectedAccountIds]),
    ]);
  };

  const handleDeselectAll = () => {
    setSelectedAccounts([]);
  };

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!targetUsername.trim()) {
      setMessage("Target username enter karo.");
      return;
    }

    if (selectedAccounts.length === 0) {
      setMessage("Kam az kam 1 connected account select karo.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/workflows", {
        targetUsername: targetUsername.trim(),
        actionType,
        accountIds: selectedAccounts,
      });

      onWorkflowCreated?.();
      navigate(`/workflows/${response.data.workflow._id}`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Workflow create nahi ho saka.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel workflow-builder">
      <div className="section-heading">
        <div>
          <h2>Create Workflow</h2>
          <p>Follow ya unfollow action choose karo, target username enter karo, phir accounts select karo.</p>
        </div>
        <strong>{selectedAccounts.length} selected</strong>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Target Username
            <input
              type="text"
              placeholder="bilal.writx"
              value={targetUsername}
              onChange={(event) => setTargetUsername(event.target.value)}
            />
          </label>
          <label>
            Action
            <select value={actionType} onChange={(event) => setActionType(event.target.value)}>
              <option value="FOLLOW">Follow</option>
              <option value="UNFOLLOW">Unfollow</option>
            </select>
          </label>
          <label>
            Search Accounts
            <input
              type="search"
              placeholder="Search username"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Filter
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="ALL">All</option>
              <option value="CONNECTED">Connected</option>
              <option value="AUTH_REQUIRED">Auth required</option>
              <option value="ERROR">Error</option>
              <option value="DISCONNECTED">Disconnected</option>
            </select>
          </label>
        </div>

        <div className="toolbar">
          <button type="button" className="ghost-button" onClick={handleSelectAll}>
            Select All Connected
          </button>
          <button type="button" className="ghost-button" onClick={handleDeselectAll}>
            Deselect All
          </button>
        </div>

        <div className="account-selector">
          {filteredAccounts.map((account) => (
            <label className="selector-row" key={account._id}>
              <input
                type="checkbox"
                disabled={account.status !== "CONNECTED"}
                checked={selectedAccounts.includes(account._id)}
                onChange={() => handleAccountToggle(account._id)}
              />
              <span>@{account.username}</span>
              <StatusBadge status={account.status} />
            </label>
          ))}
        </div>

        {message && <div className="alert warning">{message}</div>}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Creating..." : `Start ${actionType === "UNFOLLOW" ? "Unfollow" : "Follow"} Workflow Setup`}
        </button>
      </form>
    </section>
  );
};

export default CreateWorkflow;
