import { useEffect, useState } from "react";

import api from "../services/api";
import AddAccount from "../components/AddAccount";
import CreateWorkflow from "../components/CreateWorkflow";

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [workflows, setWorkflows] = useState([]);

  const [loading, setLoading] = useState(true);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  };
const handleDeleteAccount = async (accountId) => {
  const confirmed = window.confirm(
    "Kya aap is account ko remove karna chahte hain?"
  );

  if (!confirmed) {
    return;
  }

  try {
    const token = localStorage.getItem("token");

    await api.delete(`/accounts/${accountId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await fetchDashboardData();
  } catch (error) {
    console.error("Delete account error:", error);

    alert(
      error.response?.data?.message ||
        "Account remove nahi ho saka."
    );
  }
};

const handleDeleteWorkflow = async (workflowId) => {
  const confirmed = window.confirm(
    "Kya aap is workflow ko delete karna chahte hain?"
  );

  if (!confirmed) {
    return;
  }

  try {
    const token = localStorage.getItem("token");

    await api.delete(`/workflows/${workflowId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await fetchDashboardData();
  } catch (error) {
    console.error("Delete workflow error:", error);

    alert(
      error.response?.data?.message ||
        "Workflow delete nahi ho saka."
    );
  }
};
  // Dashboard data fetch
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const [accountsResponse, workflowsResponse] =
        await Promise.all([
          api.get("/accounts", config),
          api.get("/workflows", config),
        ]);

      setAccounts(accountsResponse.data.accounts);
      setWorkflows(workflowsResponse.data.workflows);
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div>

      <div>
        <h1>Instagram Dashboard</h1>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>

      <AddAccount
        onAccountAdded={fetchDashboardData}
      />

      <CreateWorkflow
        accounts={accounts}
        onWorkflowCreated={fetchDashboardData}
      />

      <h2>
        Connected Accounts: {accounts.length}
      </h2>

      <h2>
        Workflows: {workflows.length}
      </h2>

      <h3>Connected Accounts</h3>

      {accounts.length === 0 ? (
        <p>No accounts connected.</p>
      ) : (
        <ul>
         {accounts.map((account) => (
  <li key={account._id}>
    {account.username} —{" "}
    {account.status}

    {" "}

    <button
      onClick={() =>
        handleDeleteAccount(account._id)
      }
    >
      Remove
    </button>
  </li>
))}
        </ul>
      )}

      <h3>Workflows</h3>

      {workflows.length === 0 ? (
        <p>No workflows found.</p>
      ) : (
        <ul>
         {workflows.map((workflow) => (
  <li key={workflow._id}>
    {workflow.targetUsername} —{" "}
    {workflow.status} —{" "}
    {workflow.totalAccounts} accounts

    {" "}

    <a href={`/workflows/${workflow._id}`}>
      View Details
    </a>

    {" "}

    <button
      onClick={() =>
        handleDeleteWorkflow(workflow._id)
      }
    >
      Delete
    </button>
  </li>
))}
        </ul>
      )}

    </div>
  );
};

export default Dashboard;