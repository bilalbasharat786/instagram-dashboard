import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Layout from "../components/Layout";
import AddAccount from "../components/AddAccount";
import CreateWorkflow from "../components/CreateWorkflow";
import StatusBadge from "../components/StatusBadge";

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [accountsResponse, workflowsResponse] = await Promise.all([
        api.get("/accounts"),
        api.get("/workflows"),
      ]);

      setAccounts(accountsResponse.data.accounts);
      setWorkflows(workflowsResponse.data.workflows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metrics = useMemo(() => {
    return {
      total: accounts.length,
      connected: accounts.filter((account) => account.status === "CONNECTED").length,
      authRequired: accounts.filter((account) => account.status === "AUTH_REQUIRED").length,
      running: workflows.filter((workflow) => workflow.status === "RUNNING").length,
      unfollow: workflows.filter((workflow) => workflow.actionType === "UNFOLLOW").length,
      reelLike: workflows.filter((workflow) => workflow.actionType === "LIKE_REEL").length,
    };
  }, [accounts, workflows]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <Layout
      title="Instagram Workflow Dashboard"
      subtitle="Authorized account management, follow/unfollow/reel workflows, aur resumable progress."
    >
      <section className="metric-grid">
        <div><strong>{metrics.total}</strong><span>Total accounts</span></div>
        <div><strong>{metrics.connected}</strong><span>Connected</span></div>
        <div><strong>{metrics.authRequired}</strong><span>Auth required</span></div>
        <div><strong>{metrics.running}</strong><span>Running workflows</span></div>
        <div><strong>{metrics.unfollow}</strong><span>Unfollow workflows</span></div>
        <div><strong>{metrics.reelLike}</strong><span>Reel like workflows</span></div>
      </section>

      {metrics.authRequired > 0 && (
        <div className="alert warning">
          {metrics.authRequired} account re-authentication required hai. Baaki connected accounts normally use ho sakte hain.
        </div>
      )}

      <div className="dashboard-grid">
        <AddAccount onAccountAdded={fetchDashboardData} />
        <CreateWorkflow accounts={accounts} onWorkflowCreated={fetchDashboardData} />
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Workflow History</h2>
            <p>Browser close ya logout ke baad bhi workflow yahan se resume ho sakta hai.</p>
          </div>
        </div>

        <div className="workflow-list">
          {workflows.length === 0 ? (
            <div className="empty-state">No workflows found.</div>
          ) : (
            workflows.map((workflow) => (
              <Link className="workflow-row" to={`/workflows/${workflow._id}`} key={workflow._id}>
                <div>
                  <strong>
                    {workflow.actionType === "LIKE_REEL"
                      ? "Reel Like"
                      : workflow.actionType === "UNFOLLOW"
                        ? "Unfollow"
                        : "Follow"}{" "}
                    {workflow.actionType === "LIKE_REEL" ? workflow.reelUrl : `@${workflow.targetUsername}`}
                  </strong>
                  <span>{workflow.completedAccounts || 0} / {workflow.totalAccounts} processed</span>
                </div>
                <StatusBadge status={workflow.status} />
              </Link>
            ))
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
