const WorkflowProgress = ({ workflow }) => {
  const total = workflow?.totalAccounts || 0;
  const completed = workflow?.completedAccounts || 0;
  const failed = workflow?.failedAccounts || 0;
  const skipped = workflow?.skippedAccounts || 0;
  const authRequired = workflow?.authRequiredAccounts || 0;
  const done = completed + failed + skipped + authRequired;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="progress-block">
      <div className="progress-row">
        <strong>{done} / {total}</strong>
        <span>{percent}% processed</span>
      </div>
      <div className="progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="metric-grid compact">
        <div><strong>{completed}</strong><span>Completed</span></div>
        <div><strong>{authRequired}</strong><span>Auth required</span></div>
        <div><strong>{failed}</strong><span>Errors</span></div>
        <div><strong>{skipped}</strong><span>Skipped</span></div>
      </div>
    </section>
  );
};

export default WorkflowProgress;
