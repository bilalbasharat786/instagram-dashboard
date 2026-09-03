// oxlint-disable react/set-state-in-effect react-hooks/exhaustive-deps
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import api from "../services/api";

const AccountDetails = () => {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [authHistory, setAuthHistory] = useState([]);
  const [message, setMessage] = useState("");

  const fetchAccount = async () => {
    const response = await api.get(`/accounts/${id}`);
    setAccount(response.data.account);
    setAuthHistory(response.data.authHistory);
  };

  useEffect(() => {
    fetchAccount();
  }, [id]);

  const handleStatus = async () => {
    const response = await api.get(`/accounts/${id}/status`);
    setMessage(response.data.message || `Current status: ${response.data.status}`);
    await fetchAccount();
  };

  const handleReauth = async () => {
    const response = await api.post(`/accounts/${id}/reauth`);
    setMessage(response.data.message);

    if (response.data.authorizationUrl) {
      window.open(response.data.authorizationUrl, "_blank", "noopener,noreferrer");
    }

    await fetchAccount();
  };

  const handleDesktopLogin = async () => {
    const response = await api.post(`/accounts/${id}/desktop-session`, {
      markReady: false,
    });

    setMessage(response.data.message);

    if (window.instagramDesktop?.isElectron) {
      await window.instagramDesktop.openLoginSession({
        accountId: account._id,
        username: account.username,
      });
    } else {
      setMessage(
        "Instagram saved session ke liye Electron app use karo: frontend folder mein npm run desktop."
      );
    }

    await fetchAccount();
  };

  const handleMarkDesktopReady = async () => {
    const response = await api.post(`/accounts/${id}/desktop-session`, {
      markReady: true,
    });

    setMessage(response.data.message);
    await fetchAccount();
  };

  if (!account) {
    return <div className="loading">Loading account...</div>;
  }

  return (
    <Layout title={`@${account.username}`} subtitle="Account authorization aur history.">
      <Link className="back-link" to="/accounts">Back to accounts</Link>
      {message && <div className="alert info">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Account Details</h2>
            <p>Token values hidden hain; sirf expiry/status display hota hai.</p>
          </div>
          <StatusBadge status={account.status} />
        </div>

        <div className="detail-grid">
          <div><span>Platform</span><strong>{account.platform}</strong></div>
          <div><span>Auth type</span><strong>{account.authorizationType}</strong></div>
          <div><span>Desktop session</span><strong>{account.desktopSessionStatus}</strong></div>
          <div><span>Desktop login</span><strong>{account.lastDesktopLoginAt ? new Date(account.lastDesktopLoginAt).toLocaleString() : "Pending"}</strong></div>
          <div><span>Token expiry</span><strong>{account.tokenExpiresAt ? new Date(account.tokenExpiresAt).toLocaleString() : "Not connected"}</strong></div>
          <div><span>Last authenticated</span><strong>{account.lastAuthenticatedAt ? new Date(account.lastAuthenticatedAt).toLocaleString() : "Pending"}</strong></div>
        </div>

        {account.lastError && <div className="alert warning">{account.lastError}</div>}

        <div className="toolbar">
          <button className="primary-button" onClick={handleDesktopLogin}>Open Login Session</button>
          <button className="ghost-button" onClick={handleMarkDesktopReady}>Mark Session Ready</button>
          <button className="ghost-button" onClick={handleStatus}>Check Status</button>
          <button className="primary-button" onClick={handleReauth}>Re-authenticate Account</button>
        </div>
      </section>

      <section className="panel">
        <h2>Authentication History</h2>
        <div className="workflow-list">
          {authHistory.map((record) => (
            <div className="workflow-row" key={record._id}>
              <div>
                <strong>{record.method}</strong>
                <span>{record.message || "No message"}</span>
              </div>
              <StatusBadge status={record.status} />
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default AccountDetails;
