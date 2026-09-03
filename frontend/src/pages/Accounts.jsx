// oxlint-disable react/set-state-in-effect
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import AddAccount from "../components/AddAccount";
import AccountTable from "../components/AccountTable";
import api from "../services/api";

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [message, setMessage] = useState("");

  const fetchAccounts = async () => {
    const response = await api.get("/accounts");
    setAccounts(response.data.accounts);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = account.username.includes(search.toLowerCase());
      const matchesStatus = status === "ALL" || account.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [accounts, search, status]);

  const handleDelete = async (id) => {
    if (!window.confirm("Kya aap is account ko remove karna chahte hain?")) {
      return;
    }

    await api.delete(`/accounts/${id}`);
    await fetchAccounts();
  };

  const handleReauth = async (id) => {
    const response = await api.post(`/accounts/${id}/reauth`);
    setMessage(response.data.message);

    if (response.data.authorizationUrl) {
      window.open(response.data.authorizationUrl, "_blank", "noopener,noreferrer");
    }

    await fetchAccounts();
  };

  return (
    <Layout title="Accounts" subtitle="Connect, search, filter, remove, aur re-authenticate accounts.">
      <AddAccount onAccountAdded={fetchAccounts} />

      {message && <div className="alert info">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Connected Accounts</h2>
            <p>Only authorized accounts yahan manage honge.</p>
          </div>
        </div>

        <div className="toolbar">
          <input
            type="search"
            placeholder="Search accounts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="CONNECTED">Connected</option>
            <option value="AUTH_REQUIRED">Auth required</option>
            <option value="ERROR">Error</option>
            <option value="DISCONNECTED">Disconnected</option>
          </select>
        </div>

        <AccountTable
          accounts={filteredAccounts}
          onDelete={handleDelete}
          onReauth={handleReauth}
        />
      </section>
    </Layout>
  );
};

export default Accounts;
