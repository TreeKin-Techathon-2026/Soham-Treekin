import { useState } from "react";
import type { ProfilePageResponse } from "../api/types";
import { profilesPageApi } from "../api/profilesPageApi";

export default function PostsPanel({
  data,
  onUpdated,
}: {
  data: ProfilePageResponse;
  onUpdated: () => Promise<void>;
}) {
  const [form, setForm] = useState({ treeId: "", postUrl: "" });
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function addPost() {
    setErr("");
    try {
      const treeId = form.treeId || data.trees[0]?.treeId;
      if (!treeId) throw new Error("Create a tree first.");
      if (!form.postUrl) throw new Error("Post URL is required.");

      await profilesPageApi.createPost({
        userId: data.user.userId,
        treeId,
        postUrl: form.postUrl,
      });
      setForm((p) => ({ ...p, postUrl: "" }));
      await onUpdated();
      setShowForm(false);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function remove(postId: string) {
    setErr("");
    try {
      await profilesPageApi.deletePost(postId);
      await onUpdated();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div className="posts-panel">
      {err && <div className="error-msg">{err}</div>}

      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <span className="header-icon">📸</span>
          <h3>My Posts</h3>
          <span className="count-badge">{data.posts.length}</span>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+ Post'}
        </button>
      </div>

      {/* Add Post Form */}
      {showForm && (
        <div className="add-form">
          <div className="form-row">
            <label>🌳 Tree</label>
            <select
              value={form.treeId}
              onChange={(e) => setForm((p) => ({ ...p, treeId: e.target.value }))}
            >
              <option value="">Auto select first tree</option>
              {data.trees.map((t) => (
                <option key={t.treeId} value={t.treeId}>
                  {t.relationType} • {t.status}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>🔗 Image/Video URL</label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={form.postUrl}
              onChange={(e) => setForm((p) => ({ ...p, postUrl: e.target.value }))}
            />
          </div>

          <button className="submit-btn" onClick={addPost}>
            <span>📤</span> Share Post
          </button>
        </div>
      )}

      {/* Posts Grid - Instagram 3-Column */}
      <div className="posts-grid">
        {data.posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📷</span>
            <p>No posts yet!</p>
            <span className="empty-hint">Share your first photo</span>
          </div>
        ) : (
          data.posts.map((p, i) => (
            <div className="post-card" key={p.postId} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="post-media">
                {p.postUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={p.postUrl}
                    alt="Post"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.add('show');
                    }}
                  />
                ) : null}
                <div className="post-placeholder">
                  <span>🌳</span>
                </div>
              </div>
              <div className="post-overlay">
                <div className="overlay-actions">
                  <button className="action-btn">❤️</button>
                  <button className="action-btn">💬</button>
                </div>
                <button className="delete-action" onClick={() => remove(p.postId)}>
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .posts-panel {
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

        .count-badge {
          background: #facc15;
          color: #854d0e;
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

        /* Posts Grid - Instagram Style */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
        }

        .empty-state {
          grid-column: 1 / -1;
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

        /* Post Card */
        .post-card {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: #f3f4f6;
          animation: postIn 0.4s ease-out both;
        }

        @keyframes postIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .post-media {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .post-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .post-placeholder {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #d1fae5, #ecfdf5);
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .post-placeholder.show,
        .post-media:not(:has(img)) .post-placeholder {
          display: flex;
        }

        .post-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .post-card:hover .post-overlay,
        .post-card:active .post-overlay {
          opacity: 1;
        }

        .overlay-actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          width: 40px !important;
          height: 40px !important;
          padding: 0 !important;
          background: rgba(255,255,255,0.2) !important;
          backdrop-filter: blur(10px);
          border-radius: 50% !important;
          font-size: 1.1rem !important;
        }

        .action-btn:hover {
          background: rgba(255,255,255,0.3) !important;
          transform: scale(1.1) !important;
          box-shadow: none !important;
        }

        .delete-action {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 32px !important;
          height: 32px !important;
          padding: 0 !important;
          background: rgba(220, 38, 38, 0.8) !important;
          border-radius: 8px !important;
          font-size: 0.9rem !important;
        }

        .delete-action:hover {
          background: #dc2626 !important;
          box-shadow: none !important;
        }

        @media (hover: none) {
          .post-overlay {
            opacity: 1;
            background: linear-gradient(transparent 60%, rgba(0,0,0,0.6));
          }
          
          .overlay-actions {
            display: none;
          }
        }

        @media (max-width: 400px) {
          .posts-grid {
            gap: 2px;
          }
        }
      `}</style>
    </div>
  );
}
