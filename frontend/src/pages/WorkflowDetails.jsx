// oxlint-disable react/set-state-in-effect react-hooks/exhaustive-deps
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import WorkflowProgress from "../components/WorkflowProgress";
import StatusBadge from "../components/StatusBadge";
import api, { API_BASE_URL } from "../services/api";

const WorkflowDetails = () => {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchWorkflow = async () => {
    const response = await api.get(`/workflows/${id}`);
    setWorkflow(response.data.workflow);
    setItems(response.data.items);
    setCurrentItem(response.data.currentItem);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  const currentAccount = currentItem?.accountId;
  const actionType = workflow?.actionType || "FOLLOW";
  const actionLabel = actionType === "UNFOLLOW" ? "Unfollow" : "Follow";

  const grouped = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const openDesktopTarget = async (item = currentItem, targetWorkflow = workflow) => {
    const account = item?.accountId;

    if (!item?.targetProfileUrl || !account?._id) {
      return false;
    }

    if (!window.instagramDesktop?.isElectron) {
      window.open(item.targetProfileUrl, "_blank", "noopener,noreferrer");
      return false;
    }

    await window.instagramDesktop.openTargetSession({
      accountId: account._id,
      username: account.username,
      targetUsername: targetWorkflow.targetUsername,
      actionType: targetWorkflow.actionType || "FOLLOW",
      workflowId: targetWorkflow._id,
      authToken: localStorage.getItem("token"),
      apiBaseUrl: API_BASE_URL,
    });

    return true;
  };

  const runAction = async (path, options = {}) => {
    setMessage("");
    const response = await api.post(`/workflows/${id}/${path}`);
    setWorkflow(response.data.workflow);
    setCurrentItem(response.data.currentItem || null);
    setMessage(response.data.message);
    await fetchWorkflow();

    if (options.openNext && response.data.currentItem) {
      await openDesktopTarget(response.data.currentItem, response.data.workflow);
    }
  };

  const openTarget = async () => {
    const opened = await openDesktopTarget();
    setMessage(
      opened
        ? "Target account ke saved Electron session mein open ho gaya."
        : "Electron app use karo taake saved Instagram session reuse ho."
    );
  };

  if (loading) {
    return <div className="loading">Loading workflow...</div>;
  }

  return (
    <Layout
      title={`${actionLabel} Workflow: @${workflow.targetUsername}`}
      subtitle={`System selected accounts ke saved sessions mein target profile open karta hai aur ${actionLabel.toLowerCase()} action run karta hai.`}
    >
      <Link className="back-link" to="/dashboard">Back to dashboard</Link>

      {message && <div className="alert info">{message}</div>}

      <div className="workflow-detail-grid">
        <section className="panel current-account">
          <div className="section-heading">
            <div>
              <h2>Current Account</h2>
              <p>{actionLabel} action ke baad next account automatically open hoga. Backup ke liye Next Account available hai.</p>
            </div>
            <StatusBadge status={workflow.status} />
          </div>

          {currentItem && currentAccount ? (
            <div className="target-card">
              <span className="eyebrow">Account</span>
              <h3>@{currentAccount.username}</h3>
              <p>Target: @{workflow.targetUsername}</p>
              <p>Action: {actionLabel}</p>
              <StatusBadge status={currentItem.status} />
              <div className="action-row">
                <button className="primary-button" onClick={openTarget}>
                  Open Target Session
                </button>
                <button className="ghost-button" onClick={() => runAction("next", { openNext: true })}>
                  Next Account
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">Abhi koi active account nahi hai.</div>
          )}

          <div className="toolbar">
            <button className="primary-button" onClick={() => runAction("start", { openNext: true })}>
              Start {actionLabel} Workflow
            </button>
            <button className="ghost-button" onClick={() => runAction("pause")}>
              Pause Workflow
            </button>
            <button className="ghost-button" onClick={() => runAction("resume")}>
              Resume Workflow
            </button>
            <button className="danger-button" onClick={() => runAction("complete")}>
              Complete
            </button>
          </div>
        </section>

        <WorkflowProgress workflow={workflow} />
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Workflow Items</h2>
            <p>Pending, completed, auth required, error aur skipped items saved hain.</p>
          </div>
          <span>{Object.keys(grouped).length} status groups</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Status</th>
                <th>Target</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>@{item.accountId?.username || "unknown"}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    {item.targetProfileUrl ? (
                      <a href={item.targetProfileUrl} target="_blank" rel="noreferrer">
                        Open target
                      </a>
                    ) : (
                      "Not ready"
                    )}
                  </td>
                  <td>{item.errorMessage || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
};

export default WorkflowDetails;
