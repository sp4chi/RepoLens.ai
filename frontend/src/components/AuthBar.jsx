import { useAuth } from '../context/AuthContext';

export default function AuthBar() {
  const { user, logout } = useAuth();

  return (
    <div className="auth-bar">
      <div className="auth-user">
        {user.avatar && <img src={user.avatar} alt="" className="auth-avatar" />}
        <div>
          <span className="auth-name">{user.name}</span>
          <span className="auth-email">{user.email}</span>
        </div>
      </div>
      <button type="button" className="logout-btn" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
