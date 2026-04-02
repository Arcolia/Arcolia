import React, { useState, useEffect } from 'react';
import GuildHall from './GuildHall';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function App() {
  const [currentView, setCurrentView] = useState('gate');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('arcolia_token'));
  const [loading, setLoading] = useState(true);
  const [urlToken, setUrlToken] = useState(null);
  const [urlTokenType, setUrlTokenType] = useState(null);

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify');
    const resetToken = params.get('reset');
    
    if (verifyToken) {
      setUrlToken(verifyToken);
      setUrlTokenType('verify');
      setCurrentView('verify');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (resetToken) {
      setUrlToken(resetToken);
      setUrlTokenType('reset');
      setCurrentView('reset-password');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
        if (currentView === 'gate' || currentView === 'login') {
          setCurrentView('guild');
        }
      } else {
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
          src={process.env.REACT_APP_GATE_IMAGE_URL} 
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
              onSwitchToForgot={() => setCurrentView('forgot-password')}
              onBack={() => setCurrentView('gate')}
            />
          )}

          {currentView === 'signup' && (
            <SignupForm 
              onSuccess={() => setCurrentView('verify')}
              onSwitchToLogin={() => setCurrentView('login')}
              onBack={() => setCurrentView('gate')}
            />
          )}

          {currentView === 'verify' && (
            <VerifyForm 
              initialToken={urlTokenType === 'verify' ? urlToken : null}
              onSuccess={() => {
                setUrlToken(null);
                setUrlTokenType(null);
                setCurrentView('login');
              }}
              onBack={() => setCurrentView('login')}
            />
          )}

          {currentView === 'forgot-password' && (
            <ForgotPasswordForm 
              onSuccess={() => setCurrentView('login')}
              onBack={() => setCurrentView('login')}
            />
          )}

          {currentView === 'reset-password' && (
            <ResetPasswordForm 
              token={urlToken}
              onSuccess={() => {
                setUrlToken(null);
                setUrlTokenType(null);
                setCurrentView('login');
              }}
              onBack={() => setCurrentView('login')}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Login Form Component
function LoginForm({ onSuccess, onSwitchToSignup, onSwitchToForgot, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if error is about email verification
        if (response.status === 403 && data.detail?.toLowerCase().includes('verify')) {
          setNeedsVerification(true);
        }
        throw new Error(data.detail || 'Login failed');
      }

      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setResendSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend verification email');
      }

      setResendSuccess('Verification email sent! Check your inbox.');
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
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
        {resendSuccess && <div className="success-message">{resendSuccess}</div>}

        {needsVerification && !resendSuccess && (
          <button 
            type="button"
            className="resend-verification-btn"
            onClick={handleResendVerification}
            disabled={resending}
            data-testid="resend-verification-btn"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )}

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
        <button onClick={onSwitchToForgot} className="link-btn">Forgot password?</button>
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

      onSuccess();
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
function VerifyForm({ initialToken, onSuccess, onBack }) {
  const [token, setToken] = useState(initialToken || '');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);

  // Auto-verify if token provided in URL
  useEffect(() => {
    if (initialToken) {
      handleVerify(initialToken);
    }
  }, [initialToken]);

  const handleVerify = async (verifyToken) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed');
      }

      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResending(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend');
      }

      setSuccess('Verification email sent! Check your inbox.');
      setShowResend(false);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify(token);
  };

  return (
    <div className="auth-form" data-testid="verify-form">
      <h2>Verify Your Email</h2>
      <p className="auth-subtitle">
        {initialToken 
          ? 'Verifying your email...' 
          : 'Check your email for a verification link, or enter the code below'}
      </p>
      
      {!initialToken && !showResend && (
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
      )}

      {!initialToken && showResend && (
        <form onSubmit={handleResend}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="resend-email"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={resending}
            data-testid="resend-submit"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </form>
      )}

      {initialToken && (
        <>
          {loading && <div className="loading-spinner" style={{margin: '20px auto'}}></div>}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </>
      )}

      <div className="auth-footer">
        {!initialToken && !showResend && (
          <button onClick={() => setShowResend(true)} className="link-btn">
            Didn't receive the email? Resend
          </button>
        )}
        {showResend && (
          <button onClick={() => setShowResend(false)} className="link-btn">
            ← Back to verification
          </button>
        )}
        <button onClick={onBack} className="back-btn">← Back to Login</button>
      </div>
    </div>
  );
}

// Forgot Password Form
function ForgotPasswordForm({ onSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed');
      }

      setSuccess('If an account exists with this email, a reset link has been sent. Check your inbox!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form" data-testid="forgot-password-form">
      <h2>Forgot Password</h2>
      <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="forgot-email"
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading || success}
          data-testid="forgot-submit"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="auth-footer">
        <button onClick={onBack} className="back-btn">← Back to Login</button>
      </div>
    </div>
  );
}

// Reset Password Form
function ResetPasswordForm({ token, onSuccess, onBack }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Reset failed');
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form" data-testid="reset-password-form">
      <h2>Reset Password</h2>
      <p className="auth-subtitle">Enter your new password</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="password"
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            data-testid="reset-new-password"
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            data-testid="reset-confirm-password"
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading || success}
          data-testid="reset-submit"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <div className="auth-footer">
        <button onClick={onBack} className="back-btn">← Back to Login</button>
      </div>
    </div>
  );
}

export default App;
