import React, { useState, useEffect } from 'react';
import GuildHall from './GuildHall';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function App() {
  const [currentView, setCurrentView] = useState('gate'); // gate, login, signup, verify, guild
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('arcolia_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setCurrentView('guild');
      } else {
        // Token invalid, clear it
        localStorage.removeItem('arcolia_token');
        setToken(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('arcolia_token');
    setToken(null);
    setUser(null);
    setCurrentView('gate');
  };

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('arcolia_token', newToken);
    setToken(newToken);
    setUser(userData);
    setCurrentView('guild');
  };

  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner"></div>
        <p>Entering Arcolia...</p>
      </div>
    );
  }

  // Guild Hall View
  if (currentView === 'guild' && user) {
    return (
      <GuildHall 
        user={user}
        token={token}
        onLogout={handleLogout}
        onUpdateUser={setUser}
      />
    );
  }

  // Gate View (Landing)
  return (
    <div className="app">
      <div className="background-container">
        <img 
          src="https://customer-assets.emergentagent.com/job_5f4ad191-281f-40c5-b666-9b6aafb80095/artifacts/uidem9rb_Doors.png" 
          alt="Arcolia Gate" 
          className="background-image"
        />
        <div className="background-overlay"></div>
      </div>

      <main className="main-content">
        <div className="content-wrapper">
          {currentView === 'gate' && (
            <button 
              className="enter-button" 
              onClick={() => setCurrentView('login')}
              data-testid="enter-arcolia-btn"
            >
              Enter Arcolia
            </button>
          )}

          {currentView === 'login' && (
            <LoginForm 
              onSuccess={handleLoginSuccess}
              onSwitchToSignup={() => setCurrentView('signup')}
              onBack={() => setCurrentView('gate')}
            />
          )}

          {currentView === 'signup' && (
            <SignupForm 
              onSuccess={(verificationToken) => {
                setCurrentView('verify');
              }}
              onSwitchToLogin={() => setCurrentView('login')}
              onBack={() => setCurrentView('gate')}
            />
          )}

          {currentView === 'verify' && (
            <VerifyForm 
              onSuccess={() => setCurrentView('login')}
              onBack={() => setCurrentView('login')}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Login Form Component
function LoginForm({ onSuccess, onSwitchToSignup, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form" data-testid="login-form">
      <h2>Welcome Back</h2>
      <p className="auth-subtitle">Enter your credentials to access the Guild</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="login-email"
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="login-password"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading}
          data-testid="login-submit"
        >
          {loading ? 'Entering...' : 'Enter the Guild'}
        </button>
      </form>

      <div className="auth-footer">
        <p>New to Arcolia? <button onClick={onSwitchToSignup} className="link-btn">Create Account</button></p>
        <button onClick={onBack} className="back-btn">← Back to Gate</button>
      </div>
    </div>
  );
}

// Signup Form Component
function SignupForm({ onSuccess, onSwitchToLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
      }

      onSuccess(data.verification_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form" data-testid="signup-form">
      <h2>Join Arcolia</h2>
      <p className="auth-subtitle">Create your account to enter the Guild</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9]+"
            title="Letters and numbers only"
            data-testid="signup-username"
          />
        </div>

        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="signup-email"
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            data-testid="signup-password"
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            data-testid="signup-confirm-password"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading}
          data-testid="signup-submit"
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        <p>Already have an account? <button onClick={onSwitchToLogin} className="link-btn">Log In</button></p>
        <button onClick={onBack} className="back-btn">← Back to Gate</button>
      </div>
    </div>
  );
}

// Email Verification Form
function VerifyForm({ onSuccess, onBack }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed');
      }

      setSuccess('Email verified! You can now log in.');
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form" data-testid="verify-form">
      <h2>Verify Your Email</h2>
      <p className="auth-subtitle">Enter the verification code sent to your email</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Verification code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            data-testid="verify-token"
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading}
          data-testid="verify-submit"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className="auth-footer">
        <button onClick={onBack} className="back-btn">← Back to Login</button>
      </div>
    </div>
  );
}

export default App;
