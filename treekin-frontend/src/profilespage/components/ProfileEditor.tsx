import { useMemo, useState } from "react";
import type { ProfilePageResponse, ProfileUpsertRequest } from "../api/types";
import { profilesPageApi } from "../api/profilesPageApi";

export default function ProfileEditor({
  data,
  onUpdated,
}: {
  data: ProfilePageResponse;
  onUpdated: () => Promise<void>;
}) {
  const initial = useMemo(
    () => ({
      profilePic: data.profile?.profilePic || "",
      bannerPic: data.profile?.bannerPic || "",
      location: data.profile?.location || "",
      bio: data.profile?.bio || "",
    }),
    [data]
  );

  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setMsg("");
    setErr("");
    setSaving(true);
    try {
      const payload: ProfileUpsertRequest = {
        profilePic: form.profilePic || null,
        bannerPic: form.bannerPic || null,
        location: form.location || null,
        bio: form.bio || null,
      };
      await profilesPageApi.upsertProfile(data.user.userId, payload);
      setMsg("Profile saved! 🎉");
      await onUpdated();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const bioLength = form.bio.length;
  const maxBio = 150;

  return (
    <div className="profile-editor">
      {/* Preview */}
      <div className="preview-section">
        <div className="preview-banner">
          {form.bannerPic ? (
            <img src={form.bannerPic} alt="Banner" />
          ) : (
            <div className="banner-placeholder">🖼️</div>
          )}
        </div>
        <div className="preview-avatar">
          {form.profilePic ? (
            <img src={form.profilePic} alt="Avatar" />
          ) : (
            <span>🌳</span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="editor-form">
        <h3>✏️ Edit Profile</h3>

        {err && <div className="error-toast">{err}</div>}
        {msg && <div className="success-toast">{msg}</div>}

        <div className="form-group">
          <label>📷 Profile Picture URL</label>
          <input
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={form.profilePic}
            onChange={(e) => setForm((p) => ({ ...p, profilePic: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>🖼️ Banner URL</label>
          <input
            type="url"
            placeholder="https://example.com/banner.jpg"
            value={form.bannerPic}
            onChange={(e) => setForm((p) => ({ ...p, bannerPic: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>📍 Location</label>
          <input
            type="text"
            placeholder="New Delhi, India"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>
            📝 Bio
            <span className="char-count" style={{ color: bioLength > maxBio ? '#dc2626' : '#6b7280' }}>
              {bioLength}/{maxBio}
            </span>
          </label>
          <textarea
            placeholder="Tell us about yourself..."
            value={form.bio}
            maxLength={maxBio + 20}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          />
        </div>

        <button className="save-btn" onClick={save} disabled={saving}>
          {saving ? (
            <>⏳ Saving...</>
          ) : (
            <>💾 Save Profile</>
          )}
        </button>
      </div>

      <style>{`
        .profile-editor {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Preview */
        .preview-section {
          position: relative;
          margin-bottom: 60px;
        }

        .preview-banner {
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, #d1d5db, #9ca3af);
        }

        .preview-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .banner-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }

        .preview-avatar {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: white;
          border: 4px solid white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .preview-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-avatar span {
          font-size: 2rem;
        }

        /* Form */
        .editor-form h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 20px;
        }

        .error-toast,
        .success-toast {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .error-toast {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          color: #dc2626;
        }

        .success-toast {
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          color: #059669;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .char-count {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #059669;
          box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15);
        }

        .form-group textarea {
          min-height: 100px;
          resize: none;
        }

        .save-btn {
          width: 100%;
          padding: 16px !important;
          background: linear-gradient(135deg, #facc15, #eab308) !important;
          color: #065f46 !important;
          font-size: 1.1rem !important;
          font-weight: 700 !important;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(250, 204, 21, 0.5);
        }

        .save-btn:active:not(:disabled) {
          transform: scale(0.98);
          box-shadow: 0 0 30px rgba(250, 204, 21, 0.7) !important;
        }

        .save-btn:disabled {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
