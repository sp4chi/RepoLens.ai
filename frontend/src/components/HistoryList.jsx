export default function HistoryList({ items, onSelect, activeId, userName }) {
  if (!items.length) {
    return (
      <aside className="history-panel">
        <h3>Your analyses</h3>
        <p className="empty-state">
          {userName ? `${userName}, ` : ''}you have not analyzed any repositories yet.
        </p>
      </aside>
    );
  }

  return (
    <aside className="history-panel">
      <h3>Your analyses</h3>
      <ul className="history-list">
        {items.map((item) => (
          <li key={item._id}>
            <button
              type="button"
              className={activeId === item._id ? 'active' : ''}
              onClick={() => onSelect(item._id)}
            >
              <span className="history-repo">
                {item.owner}/{item.repo}
              </span>
              <span className="history-meta">
                {item.analysis?.healthScore ?? '—'} · {item.repoData?.language || 'unknown'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
