import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import api from "../services/api";

const WorkflowDetails = () => {
  const { id } = useParams();

  const [workflow, setWorkflow] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWorkflow = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await api.get(
        `/workflows/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setWorkflow(response.data.workflow);
      setItems(response.data.items);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Workflow load nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  if (loading) {
    return <p>Loading workflow...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!workflow) {
    return <p>Workflow nahi mila.</p>;
  }

  return (
    <div>
      <Link to="/dashboard">
        ← Back to Dashboard
      </Link>

      <h1>Workflow Details</h1>

      <h2>
        Target: {workflow.targetUsername}
      </h2>

      <p>
        Status: {workflow.status}
      </p>

      <p>
        Total Accounts: {workflow.totalAccounts}
      </p>

      <p>
        Completed: {workflow.completedAccounts}
      </p>

      <p>
        Failed: {workflow.failedAccounts}
      </p>

      <h3>Accounts</h3>

      {items.length === 0 ? (
        <p>No accounts found.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item._id}>
              {item.accountId?.username || "Unknown Account"}
              {" — "}
              {item.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WorkflowDetails;