import { useState, useMemo } from "react";
import type { ProfilePageResponse } from "../api/types";
import { profilesPageApi } from "../api/profilesPageApi";
import { calculateTredits, calculateTotalKgFromTrees, formatTredits, TREDITS_PER_TREE } from "../../lib/tredits";

export default function CreditsPanel({
  data,
  onUpdated,
}: {
  data: ProfilePageResponse;
  onUpdated: () => Promise<void>;
}) {
  const [form, setForm] = useState({ creditType: "CARBON", amount: "1" });
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function addCredit() {
    setErr("");
    try {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be a positive number.");

      await profilesPageApi.createCredit({
        userId: data.user.userId,
        creditType: form.creditType,
        amount,
      });
      await onUpdated();
      setShowForm(false);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function remove(creditId: string) {
    setErr("");
    try {
      await profilesPageApi.deleteCredit(creditId);
      await onUpdated();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  const carbonTotal = data.credits.filter(c => c.creditType === 'CARBON').reduce((s, c) => s + c.amount, 0);
  const treditTotal = data.credits.filter(c => c.creditType === 'TREDIT').reduce((s, c) => s + c.amount, 0);

  // Calculate tredits from tree data
  const treeDates = useMemo(() => data.trees.map(t => t.createdAt), [data.trees]);
  const treditsBreakdown = useMemo(
    () => calculateTredits(data.trees.length, treeDates),
    [data.trees.length, treeDates]
  );
  const o2ReleasedKg = useMemo(() => calculateTotalKgFromTrees(treeDates), [treeDates]);

  return (
    <div className="credits-panel">
      {err && <div className="error-msg">{err}</div>}

      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <span className="header-icon">💎</span>
          <h3>My Credits</h3>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+ Earn'}
        </button>
      </div>

      {/* Tredits Breakdown */}
      <div className="stats-row">
        <div className="stat-card tredit">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <span className="stat-value">{formatTredits(treditsBreakdown.total)}</span>
            <span className="stat-label">Total Tredits</span>
          </div>
        </div>
        <div className="stat-card carbon">
          <span className="stat-icon">🌳</span>
          <div className="stat-info">
            <span className="stat-value">+{formatTredits(treditsBreakdown.fromTrees)}</span>
            <span className="stat-label">{data.trees.length} Trees x {TREDITS_PER_TREE}</span>
          </div>
        </div>
      </div>
      <div className="stats-row" style={{ marginTop: '-8px' }}>
        <div className="stat-card carbon">
          <span className="stat-icon">🍃</span>
          <div className="stat-info">
            <span className="stat-value">{treditsBreakdown.co2AbsorbedKg}kg</span>
            <span className="stat-label">CO2 Absorbed</span>
          </div>
        </div>
        <div className="stat-card carbon">
          <span className="stat-icon">💧</span>
          <div className="stat-info">
            <span className="stat-value">{treditsBreakdown.waterFilteredKg}kg</span>
            <span className="stat-label">Water Filtered</span>
          </div>
        </div>
      </div>
      <div className="stats-row" style={{ marginTop: '-8px' }}>
        <div className="stat-card carbon">
          <span className="stat-icon">🌬️</span>
          <div className="stat-info">
            <span className="stat-value">{o2ReleasedKg}kg</span>
            <span className="stat-label">O2 Released</span>
          </div>
        </div>
        <div className="stat-card carbon">
          <span className="stat-icon">🍃</span>
          <div className="stat-info">
            <span className="stat-value">{carbonTotal}</span>
            <span className="stat-label">Carbon Credits</span>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="add-form">
          <div className="form-row">
            <label>Type</label>
            <div className="type-toggle">
              <button
                type="button"
                className={`toggle-btn ${form.creditType === 'CARBON' ? 'active carbon' : ''}`}
                onClick={() => setForm(p => ({ ...p, creditType: 'CARBON' }))}
              >
                <span>🍃</span> Carbon
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.creditType === 'TREDIT' ? 'active tredit' : ''}`}
                onClick={() => setForm(p => ({ ...p, creditType: 'TREDIT' }))}
              >
                <span>💰</span> Tredit
              </button>
            </div>
          </div>

          <div className="form-row">
            <label>Amount</label>
            <input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>

          <button className="submit-btn" onClick={addCredit}>
            <span>✨</span> Add Credit
          </button>
        </div>
      )}

      {/* Credit History */}
      <div className="history-section">
        <h4>📊 History</h4>
        <div className="history-list">
          {data.credits.length === 0 ? (
            <div className="empty-state">
              <span>💎</span>
              <p>No credits yet</p>
            </div>
          ) : (
            data.credits.map((c, i) => (
              <div
                className={`credit-item ${c.creditType.toLowerCase()}`}
                key={c.creditId}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="credit-icon">{c.creditType === 'CARBON' ? '🍃' : '💰'}</span>
                <div className="credit-info">
                  <span className="credit-type">{c.creditType}</span>
                  <span className="credit-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="credit-amount">+{c.amount}</span>
                <button className="delete-btn" onClick={() => remove(c.creditId)}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .credits-panel {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

        .add-btn {
          padding: 10px 18px !important;
          font-size: 0.85rem !important;
          background: linear-gradient(135deg, #facc15, #fde047) !important;
          color: #065f46 !important;
        }

        .add-btn:active {
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.6) !important;
        }

        /* Stats Cards */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          transition: transform 0.2s ease;
        }

        .stat-card:active {
          transform: scale(0.98);
        }

        .stat-card.carbon {
          background: linear-gradient(135deg, #d1fae5, #ecfdf5);
          border: 2px solid #a7f3d0;
        }

        .stat-card.tredit {
          background: linear-gradient(135deg, #fef9c3, #fefce8);
          border: 2px solid #fde68a;
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-family: 'Outfit', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: #111827;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Add Form */
        .add-form {
          background: linear-gradient(145deg, #faf5ff, #f3e8ff);
          border: 2px dashed #c4b5fd;
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

        .type-toggle {
          display: flex;
          gap: 8px;
        }

        .toggle-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px !important;
          background: white !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 12px !important;
          font-size: 0.9rem !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
        }

        .toggle-btn:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .toggle-btn.active.carbon {
          background: linear-gradient(135deg, #d1fae5, #ecfdf5) !important;
          border-color: #059669 !important;
          color: #065f46 !important;
        }

        .toggle-btn.active.tredit {
          background: linear-gradient(135deg, #fef9c3, #fefce8) !important;
          border-color: #facc15 !important;
          color: #854d0e !important;
        }

        .add-form input {
          background: white;
          border: 2px solid #ddd6fe;
        }

        .add-form input:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.2);
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

        /* History Section */
        .history-section h4 {
          font-size: 1rem;
          color: #374151;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .empty-state {
          text-align: center;
          padding: 24px;
          color: #9ca3af;
        }

        .empty-state span {
          font-size: 2rem;
          display: block;
          margin-bottom: 8px;
        }

        .credit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          animation: itemIn 0.3s ease-out both;
        }

        @keyframes itemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .credit-item.carbon {
          border-left: 4px solid #059669;
        }

        .credit-item.tredit {
          border-left: 4px solid #facc15;
        }

        .credit-icon {
          font-size: 1.2rem;
        }

        .credit-info {
          flex: 1;
        }

        .credit-type {
          display: block;
          font-weight: 600;
          font-size: 0.9rem;
          color: #111827;
        }

        .credit-date {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .credit-amount {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #059669;
        }

        .delete-btn {
          width: 28px !important;
          height: 28px !important;
          min-width: 28px !important;
          padding: 0 !important;
          background: #fee2e2 !important;
          color: #dc2626 !important;
          border-radius: 8px !important;
          font-size: 0.8rem !important;
          opacity: 0;
        }

        .credit-item:hover .delete-btn {
          opacity: 1;
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
