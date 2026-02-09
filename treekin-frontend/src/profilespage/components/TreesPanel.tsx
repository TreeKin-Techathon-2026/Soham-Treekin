import { useState } from "react";
import type { ProfilePageResponse } from "../api/types";
import { profilesPageApi } from "../api/profilesPageApi";

export default function TreesPanel({
  data,
  onUpdated,
}: {
  data: ProfilePageResponse;
  onUpdated: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    relationType: "PLANT",
    location: "",
    status: "PLANTED",
  });
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function createTree() {
    setErr("");
    try {
      if (!form.relationType) throw new Error("Relation type required");
      await profilesPageApi.createTree({
        userId: data.user.userId,
        relationType: form.relationType,
        location: form.location || null,
        status: form.status,
      });
      setForm({ relationType: "PLANT", location: "", status: "PLANTED" });
      await onUpdated();
      setShowForm(false);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function remove(treeId: string) {
    setErr("");
    try {
      await profilesPageApi.deleteTree(treeId);
      await onUpdated();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  const relationTypes = [
    { value: "PLANT", icon: "🌱", color: "#059669" },
    { value: "ADOPT", icon: "🤝", color: "#f59e0b" },
    { value: "SPONSOR", icon: "💎", color: "#8b5cf6" },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PLANTED': return { bg: '#d1fae5', color: '#065f46', icon: '🌱' };
      case 'GROWING': return { bg: '#fef9c3', color: '#854d0e', icon: '🌿' };
      case 'MATURE': return { bg: '#dbeafe', color: '#1e40af', icon: '🌳' };
      case 'FRUITING': return { bg: '#fce7f3', color: '#9d174d', icon: '🍎' };
      default: return { bg: '#f3f4f6', color: '#374151', icon: '🌲' };
    }
  };

  return (
    <div className="trees-panel">
      {err && <div className="error-msg">{err}</div>}

      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <span className="header-icon">🌳</span>
          <h3>My Trees</h3>
          <span className="count-badge">{data.trees.length}</span>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+ Add'}
        </button>
      </div>

      {/* Add Tree Form */}
      {showForm && (
        <div className="add-form">
          <div className="form-row">
            <label>Type</label>
            <div className="type-pills">
              {relationTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`type-pill ${form.relationType === t.value ? 'active' : ''}`}
                  style={{ '--pill-color': t.color } as React.CSSProperties}
                  onClick={() => setForm((p) => ({ ...p, relationType: t.value }))}
                >
                  <span>{t.icon}</span>
                  <span>{t.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>📍 Location</label>
            <input
              type="text"
              placeholder="e.g., New Delhi, India"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>

          <div className="form-row">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="PLANTED">🌱 Planted</option>
              <option value="GROWING">🌿 Growing</option>
              <option value="MATURE">🌳 Mature</option>
              <option value="FRUITING">🍎 Fruiting</option>
            </select>
          </div>

          <button className="submit-btn" onClick={createTree}>
            <span>🌱</span> Plant Tree
          </button>
        </div>
      )}

      {/* Trees Grid */}
      <div className="trees-grid">
        {data.trees.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🌱</span>
            <p>No trees yet!</p>
            <span className="empty-hint">Plant your first tree</span>
          </div>
        ) : (
          data.trees.map((t, i) => {
            const statusStyle = getStatusStyle(t.status);
            const typeData = relationTypes.find(r => r.value === t.relationType);
            return (
              <div className="tree-card" key={t.treeId} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="tree-icon" style={{ background: typeData?.color }}>
                  {typeData?.icon || '🌳'}
                </div>
                <div className="tree-info">
                  <div className="tree-type">{t.relationType}</div>
                  <div
                    className="tree-status"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    <span>{statusStyle.icon}</span>
                    <span>{t.status.replace('_', ' ')}</span>
                  </div>
                  {t.location && (
                    <div className="tree-location">📍 {t.location}</div>
                  )}
                </div>
                <button className="delete-btn" onClick={() => remove(t.treeId)}>
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .trees-panel {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .error-msg {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-icon {
          font-size: 1.5rem;
        }

        .panel-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .count-badge {
          background: #059669;
          color: white;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .add-btn {
          padding: 10px 18px !important;
          font-size: 0.85rem !important;
          background: linear-gradient(135deg, #facc15, #fde047) !important;
          color: #065f46 !important;
        }

        .add-btn:active {
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.6) !important;
        }

        /* Add Form */
        .add-form {
          background: #fefce8;
          border: 2px dashed #facc15;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-row {
          margin-bottom: 16px;
        }

        .form-row label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .type-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .type-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px !important;
          background: white !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 999px !important;
          font-size: 0.85rem !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .type-pill:hover {
          border-color: var(--pill-color) !important;
          transform: translateY(-2px) !important;
          box-shadow: none !important;
        }

        .type-pill.active {
          background: var(--pill-color) !important;
          border-color: var(--pill-color) !important;
          color: white !important;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--pill-color) 40%, transparent) !important;
        }

        .add-form input,
        .add-form select {
          background: white;
          border: 2px solid #fde68a;
        }

        .add-form input:focus,
        .add-form select:focus {
          border-color: #facc15;
          box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.2);
        }

        .submit-btn {
          width: 100%;
          padding: 14px !important;
          background: linear-gradient(135deg, #facc15, #eab308) !important;
          color: #065f46 !important;
          font-size: 1rem !important;
        }

        .submit-btn:active {
          box-shadow: 0 0 25px rgba(250, 204, 21, 0.7) !important;
        }

        /* Trees Grid */
        .trees-grid {
          display: grid;
          gap: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          background: linear-gradient(145deg, #f9fafb, #f3f4f6);
          border-radius: 16px;
          border: 2px dashed #d1d5db;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 12px;
        }

        .empty-state p {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 4px;
        }

        .empty-hint {
          color: #9ca3af;
          font-size: 0.85rem;
        }

        /* Tree Card */
        .tree-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          transition: all 0.2s ease;
          animation: cardIn 0.4s ease-out both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .tree-card:hover {
          border-color: #a7f3d0;
          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.1);
        }

        .tree-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .tree-info {
          flex: 1;
          min-width: 0;
        }

        .tree-type {
          font-weight: 700;
          font-size: 0.95rem;
          color: #111827;
          margin-bottom: 4px;
        }

        .tree-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .tree-location {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .delete-btn {
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          padding: 0 !important;
          background: #fee2e2 !important;
          border-radius: 10px !important;
          font-size: 1rem !important;
          color: #dc2626 !important;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .tree-card:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          background: #fecaca !important;
          transform: scale(1.05) !important;
          box-shadow: none !important;
        }

        @media (hover: none) {
          .delete-btn {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
