import type { ProfilePageResponse } from "../api/types";

export default function ProfileHeader({ data }: { data: ProfilePageResponse }) {
  const { user, profile, followersCount, followingCount, trees, posts, credits } = data;

  return (
    <div className="profile-header">
      {/* Profile Top Section - Instagram Style */}
      <div className="profile-top">
        {/* Avatar */}
        <div className="avatar-container">
          <div className="avatar-ring">
            <div className="avatar">
              {profile?.profilePic ? (
                <img src={profile.profilePic} alt={user.userName} />
              ) : (
                <span className="avatar-emoji">🌳</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats - Instagram Style */}
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-number">{trees.length}</span>
            <span className="stat-label">Trees</span>
          </div>
          <div className="stat">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat">
            <span className="stat-number">{followersCount}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="user-info">
        <div className="name-row">
          <h2 className="display-name">{user.userName}</h2>
          <span className="verified">✓</span>
        </div>
        <p className="username">@{user.userUsername}</p>
      </div>

      {/* Bio */}
      <div className="bio-section">
        {profile?.location && (
          <p className="location">
            <span>📍</span> {profile.location}
          </p>
        )}
        {profile?.bio ? (
          <p className="bio">{profile.bio}</p>
        ) : (
          <p className="bio-empty">Add a bio in the Edit tab ✨</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="actions">
        <button className="btn-follow">
          <span>🌱</span> Follow
        </button>
        <button className="btn-message">
          <span>💬</span> Message
        </button>
      </div>

      {/* Credits Banner */}
      <div className="credits-banner">
        <div className="credit-item">
          <span className="credit-icon">🍃</span>
          <span className="credit-value">
            {credits.filter(c => c.creditType === 'CARBON').reduce((s, c) => s + c.amount, 0)}
          </span>
          <span className="credit-label">Carbon</span>
        </div>
        <div className="credit-divider" />
        <div className="credit-item">
          <span className="credit-icon">💰</span>
          <span className="credit-value">
            {credits.filter(c => c.creditType === 'TREDIT').reduce((s, c) => s + c.amount, 0)}
          </span>
          <span className="credit-label">Tredits</span>
        </div>
        <div className="credit-divider" />
        <div className="credit-item">
          <span className="credit-icon">💚</span>
          <span className="credit-value">{followingCount}</span>
          <span className="credit-label">Following</span>
        </div>
      </div>

      <style>{`
        .profile-header {
          background: white;
          padding: 20px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        @media (min-width: 768px) {
          .profile-header {
            background: linear-gradient(145deg, #ffffff, #ecfdf5);
            border: 2px solid #a7f3d0;
            border-radius: 24px;
            padding: 28px;
            box-shadow: 0 10px 40px rgba(5, 150, 105, 0.1);
          }
        }

        /* Top Section */
        .profile-top {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 16px;
        }

        /* Avatar */
        .avatar-container {
          flex-shrink: 0;
        }

        .avatar-ring {
          padding: 3px;
          background: linear-gradient(135deg, #065f46, #059669, #facc15);
          border-radius: 50%;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: white;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .avatar {
            width: 100px;
            height: 100px;
          }
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-emoji {
          font-size: 2.5rem;
        }

        /* Stats Grid */
        .stats-grid {
          flex: 1;
          display: flex;
          justify-content: space-around;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .stat-number {
          font-family: 'Outfit', sans-serif;
          font-size: 1.4rem;
          font-weight: 800;
          color: #111827;
        }

        .stat-label {
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* User Info */
        .user-info {
          margin-bottom: 8px;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .display-name {
          font-family: 'Outfit', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .verified {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: #059669;
          color: white;
          border-radius: 50%;
          font-size: 0.6rem;
          font-weight: bold;
        }

        .username {
          color: #6b7280;
          font-size: 0.9rem;
          margin: 2px 0 0;
        }

        /* Bio */
        .bio-section {
          margin-bottom: 16px;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #059669;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .bio {
          color: #374151;
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0;
        }

        .bio-empty {
          color: #9ca3af;
          font-size: 0.85rem;
          font-style: italic;
          margin: 0;
        }

        /* Action Buttons */
        .actions {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .actions button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-follow {
          background: linear-gradient(135deg, #facc15, #fde047);
          color: #065f46;
          border: none;
        }

        .btn-follow:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(250, 204, 21, 0.4);
        }

        .btn-follow:active {
          transform: scale(0.96);
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
        }

        .btn-message {
          background: white;
          color: #059669;
          border: 2px solid #059669;
        }

        .btn-message:hover {
          background: #ecfdf5;
        }

        .btn-message:active {
          transform: scale(0.96);
        }

        /* Credits Banner */
        .credits-banner {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 14px;
          background: linear-gradient(135deg, #065f46, #059669);
          border-radius: 14px;
        }

        .credit-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .credit-icon {
          font-size: 1.2rem;
        }

        .credit-value {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }

        .credit-label {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .credit-divider {
          width: 1px;
          height: 30px;
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
