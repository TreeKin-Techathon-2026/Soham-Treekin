import { useEffect, useMemo, useState } from "react";
import "./ProfilePage.css";
import { profilesPageApi } from "../api/profilesPageApi";
import type { ProfilePageResponse, UserResponse } from "../api/types";
import ProfileHeader from "../components/ProfileHeader";
import ProfileEditor from "../components/ProfileEditor";
import TreesPanel from "../components/TreesPanel";
import PostsPanel from "../components/PostsPanel";
import CreditsPanel from "../components/CreditsPanel";

type Tab = "trees" | "posts" | "editor" | "credits";

export default function ProfilePage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("trees");

  const [data, setData] = useState<ProfilePageResponse | null>(null);
  const [err, setErr] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  const [newUser, setNewUser] = useState({
    userName: "",
    userUsername: "",
    userEmail: "",
    userPass: "",
  });

  const [showDevPanel, setShowDevPanel] = useState(true);

  const canCreateUser = useMemo(() => {
    return (
      newUser.userName.trim() &&
      newUser.userUsername.trim() &&
      newUser.userEmail.trim() &&
      newUser.userPass.trim()
    );
  }, [newUser]);

  async function refreshUsers() {
    const list = await profilesPageApi.listUsers();
    setUsers(list);
    if (!selectedUserId && list[0]?.userId) setSelectedUserId(list[0].userId);
  }

  async function loadProfilePage(userId: string) {
    setErr("");
    setMsg("");
    setData(null);
    try {
      const res = await profilesPageApi.getProfilePage(userId);
      setData(res);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function reloadCurrent() {
    if (!selectedUserId) return;
    await loadProfilePage(selectedUserId);
  }

  async function createUser() {
    setErr("");
    setMsg("");
    try {
      const u = await profilesPageApi.createUser(newUser);
      setMsg("User created successfully! 🎉");
      await refreshUsers();
      setSelectedUserId(u.userId);
      await loadProfilePage(u.userId);
      setNewUser({ userName: "", userUsername: "", userEmail: "", userPass: "" });
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    refreshUsers().catch((e) => setErr(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUserId) loadProfilePage(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "trees", label: "Trees", icon: "🌳" },
    { key: "posts", label: "Posts", icon: "📸" },
    { key: "editor", label: "Edit", icon: "✏️" },
    { key: "credits", label: "Credits", icon: "💎" },
  ];

  return (
    <div className="profile-page">
      {/* Error/Success Banners */}
      {err && (
        <div className="error-banner">
          <span>⚠️</span> {err}
        </div>
      )}
      {msg && (
        <div className="success-banner">
          <span>✅</span> {msg}
        </div>
      )}

      {/* Developer Panel (Collapsible) */}
      <div className={`admin-panel card ${showDevPanel ? '' : 'collapsed'}`}>
        <button
          className="dev-toggle"
          onClick={() => setShowDevPanel(!showDevPanel)}
        >
          {showDevPanel ? '🔧 Hide Developer Panel' : '🔧 Show Developer Panel'}
        </button>

        {showDevPanel && (
          <>
            <h2 className="admin-panel-header">👤 User Management</h2>

            <div className="row">
              <div className="user-selector stack">
                <h3>Select User</h3>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {users.length === 0 && (
                    <option value="">No users found</option>
                  )}
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.userName} (@{u.userUsername})
                    </option>
                  ))}
                </select>

                <button
                  className="button secondary"
                  onClick={reloadCurrent}
                  disabled={!selectedUserId}
                >
                  🔄 Refresh Profile
                </button>
              </div>

              <div className="create-user-form stack">
                <h3>Create New User</h3>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newUser.userName}
                  onChange={(e) => setNewUser((p) => ({ ...p, userName: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.userUsername}
                  onChange={(e) => setNewUser((p) => ({ ...p, userUsername: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.userEmail}
                  onChange={(e) => setNewUser((p) => ({ ...p, userEmail: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.userPass}
                  onChange={(e) => setNewUser((p) => ({ ...p, userPass: e.target.value }))}
                />
                <button className="button" onClick={createUser} disabled={!canCreateUser}>
                  ✨ Create User
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Profile Content */}
      <div className="profile-content">
        {!data ? (
          <div className="card loading-card">
            <div className="loading-content">
              <span className="loading-tree">🌳</span>
              <p>Loading profile...</p>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <ProfileHeader data={data} />

            {/* Tab Navigation */}
            <nav className="profile-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Tab Content */}
            <div className="tab-content" key={activeTab}>
              <div className="card">
                {activeTab === "trees" && <TreesPanel data={data} onUpdated={reloadCurrent} />}
                {activeTab === "posts" && <PostsPanel data={data} onUpdated={reloadCurrent} />}
                {activeTab === "editor" && <ProfileEditor data={data} onUpdated={reloadCurrent} />}
                {activeTab === "credits" && <CreditsPanel data={data} onUpdated={reloadCurrent} />}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        /* Dev Toggle Button */
        .dev-toggle {
          position: absolute;
          top: 12px;
          right: 16px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .dev-toggle:hover {
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .admin-panel.collapsed {
          padding: 16px;
          min-height: auto;
        }

        .admin-panel.collapsed .dev-toggle {
          position: static;
          width: 100%;
        }

        /* Loading Animation */
        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px;
        }

        .loading-tree {
          font-size: 4rem;
          animation: bounce 1s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.1); }
        }

        .loading-content p {
          color: #6b7280;
          font-weight: 500;
          font-size: 1.1rem;
        }

        .loading-dots {
          display: flex;
          gap: 8px;
        }

        .loading-dots span {
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          animation: dotPulse 1.4s ease-in-out infinite;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Tab Enhancements */
        .profile-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: transparent;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .tab-icon {
          font-size: 1.2rem;
        }

        .tab-button::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #22c55e, #4ade80, #facc15);
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: inherit;
          z-index: -1;
        }

        .tab-button:hover {
          color: #22c55e;
          transform: translateY(-2px);
        }

        .tab-button.active {
          color: white;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
        }

        .tab-button.active::before {
          opacity: 1;
        }

        /* Responsive Adjustments */
        @media (max-width: 640px) {
          .tab-button {
            padding: 10px 16px;
            flex-direction: column;
            gap: 4px;
          }

          .tab-label {
            font-size: 0.75rem;
          }

          .dev-toggle {
            font-size: 0.75rem;
            padding: 6px 12px;
          }
        }
      `}</style>
    </div>
  );
}
