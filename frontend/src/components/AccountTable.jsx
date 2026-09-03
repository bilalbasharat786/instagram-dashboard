import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

const AccountTable = ({ accounts, onDelete, onReauth }) => {
  if (accounts.length === 0) {
    return <div className="empty-state">No accounts found.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Status</th>
            <th>Desktop session</th>
            <th>Token expiry</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account._id}>
              <td>
                <Link to={`/accounts/${account._id}`}>@{account.username}</Link>
              </td>
              <td><StatusBadge status={account.status} /></td>
              <td>{account.desktopSessionStatus || "NOT_CREATED"}</td>
              <td>
                {account.tokenExpiresAt
                  ? new Date(account.tokenExpiresAt).toLocaleDateString()
                  : "Not connected"}
              </td>
              <td className="action-cell">
                <button className="ghost-button" onClick={() => onReauth(account._id)}>
                  Re-auth
                </button>
                <button className="danger-button" onClick={() => onDelete(account._id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountTable;
