import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './GuildHall.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ARCO Token Configuration
const ARCO_TOKEN_ADDRESS = process.env.REACT_APP_ARCO_TOKEN_ADDRESS || '0x6D00EABF782Df498738f29e6558157d36518C663';
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC_URL = process.env.REACT_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

function GuildHall({ user, token, onLogout, onUpdateUser }) {
  const [walletAddress, setWalletAddress] = useState(user?.wallet_address || null);
  const [arcoBalance, setArcoBalance] = useState(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminSuccess, setAdminSuccess] = useState(null);
  
  // Settings state
  const [guildSettings, setGuildSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(null);
  const [editingRoles, setEditingRoles] = useState({});
  const [editingRooms, setEditingRooms] = useState({});

  // Determine member status - use custom role if set, otherwise calculate from ARCO balance
  const getMemberStatus = () => {
    // If user has a custom role assigned, use that
    if (user?.role) {
      return user.role;
    }
    // Otherwise calculate from token balance
    if (arcoBalance === null || arcoBalance === undefined) return 'Member';
    if (arcoBalance >= 10000) return 'Elder';
    if (arcoBalance >= 1000) return 'Noble';
    if (arcoBalance >= 100) return 'Knight';
    if (arcoBalance >= 10) return 'Squire';
    return 'Initiate';
  };

  const isFounder = user?.role === 'Founder';

  // Check ARCO balance when wallet is connected
  useEffect(() => {
    if (walletAddress) {
      checkArcoBalance();
    }
  }, [walletAddress]);

  const checkArcoBalance = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
      const tokenContract = new ethers.Contract(ARCO_TOKEN_ADDRESS, ERC20_ABI, provider);
      
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      const formattedBalance = parseFloat(ethers.formatUnits(balance, decimals));
      
      setArcoBalance(formattedBalance);
    } catch (err) {
      console.error('Error checking ARCO balance:', err);
      setArcoBalance(0);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletError('Please install MetaMask to connect your wallet');
      return;
    }

    setIsConnectingWallet(true);
    setWalletError(null);

    try {
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Check network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== POLYGON_CHAIN_ID) {
        // Try to switch to Polygon
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              }],
            });
          } else {
            throw new Error('Please switch to Polygon network');
          }
        }
      }

      // Link wallet to account via API
      const response = await fetch(`${API_URL}/api/auth/link-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ wallet_address: address })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to link wallet');
      }

      setWalletAddress(address.toLowerCase());
      onUpdateUser({ ...user, wallet_address: address.toLowerCase() });
      setShowWalletModal(false);

    } catch (err) {
      console.error('Wallet connection error:', err);
      setWalletError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/unlink-wallet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setWalletAddress(null);
        setArcoBalance(null);
        onUpdateUser({ ...user, wallet_address: null });
      }
    } catch (err) {
      console.error('Error unlinking wallet:', err);
    }
  };

  // Admin functions
  const fetchAllUsers = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch users');
      }
      const data = await response.json();
      setAllUsers(data.users);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, role: newRole })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update role');
      }
      const data = await response.json();
      setAdminSuccess(data.message);
      // Refresh user list
      fetchAllUsers();
      // If updating own role, update local state
      if (userId === user.id) {
        onUpdateUser({ ...user, role: newRole });
      }
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const banUser = async (userId) => {
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/ban-user?user_id=${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to ban user');
      }
      const data = await response.json();
      setAdminSuccess(data.message);
      fetchAllUsers();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const deleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${username}"? This action cannot be undone.`)) {
      return;
    }
    
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/delete-user?user_id=${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete user');
      }
      const data = await response.json();
      setAdminSuccess(data.message);
      fetchAllUsers();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const openAdminModal = () => {
    setShowAdminModal(true);
    fetchAllUsers();
  };

  // Settings functions
  const fetchSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch settings');
      }
      const data = await response.json();
      setGuildSettings(data);
      setEditingRoles(JSON.parse(JSON.stringify(data.roles || {})));
      setEditingRooms(JSON.parse(JSON.stringify(data.rooms || {})));
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roles: editingRoles, rooms: editingRooms })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save settings');
      }
      const data = await response.json();
      setSettingsSuccess('Settings saved successfully!');
      setGuildSettings(data.settings);
    } catch (err) {
      setSettingsError(err.message);
    }
  };

  const updateRoleDisplayName = (roleKey, newName) => {
    setEditingRoles(prev => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], displayName: newName }
    }));
  };

  const toggleRoomAccess = (roomKey, roleKey) => {
    setEditingRooms(prev => {
      const room = prev[roomKey];
      const currentRoles = room.allowedRoles || [];
      const newRoles = currentRoles.includes(roleKey)
        ? currentRoles.filter(r => r !== roleKey)
        : [...currentRoles, roleKey];
      return {
        ...prev,
        [roomKey]: { ...room, allowedRoles: newRoles }
      };
    });
  };

  const openSettingsModal = () => {
    setShowSettingsModal(true);
    fetchSettings();
  };

  const handleNavigation = (area) => {
    if (!walletAddress) {
      setShowWalletModal(true);
      return;
    }
    
    if (arcoBalance === null || arcoBalance < 1) {
      setWalletError('You need at least 1 ARCO token to access this area');
      setShowWalletModal(true);
      return;
    }

    // For now, show alert for areas under development
    if (area === 'sanctuary') {
      alert('The Sanctuary is under construction. Coming soon!');
    } else if (area === 'treasury') {
      alert('The Treasury awaits. Coming soon!');
    }
  };

  const handleComingSoon = (area) => {
    alert('This area is locked. Coming soon!');
  };

  return (
    <div className="guild-hall" data-testid="guild-hall">
      {/* Background */}
      <div className="guild-background">
        <img 
          src={process.env.REACT_APP_GUILD_HALL_IMAGE_URL}
          alt="Guild Hall"
          className="guild-bg-image"
        />
        <div className="guild-overlay"></div>
      </div>

      {/* Header */}
      <header className="guild-header">
        <h1 className="guild-title" data-testid="guild-title">The Guild Hall</h1>
        <div className="header-buttons">
          {isFounder && (
            <>
              <button className="admin-btn settings-btn" onClick={openSettingsModal} data-testid="settings-btn">
                🛡️ Guild Settings
              </button>
              <button className="admin-btn" onClick={openAdminModal} data-testid="admin-btn">
                👥 Manage Members
              </button>
            </>
          )}
          <button className="logout-btn" onClick={onLogout} data-testid="logout-btn">
            Leave Guild
          </button>
        </div>
      </header>

      {/* Coming Soon Areas - Top */}
      <div className="coming-soon-areas">
        <button 
          className="coming-soon-btn left"
          onClick={() => handleComingSoon('archives')}
          data-testid="coming-soon-left"
        >
          <span className="lock-icon">🔒</span>
          <span className="area-name">Archives</span>
          <span className="coming-soon-text">Coming Soon</span>
        </button>
        
        <button 
          className="coming-soon-btn right"
          onClick={() => handleComingSoon('council-chamber')}
          data-testid="coming-soon-right"
        >
          <span className="lock-icon">🔒</span>
          <span className="area-name">Council Chamber</span>
          <span className="coming-soon-text">Coming Soon</span>
        </button>
      </div>

      {/* Center Member Info */}
      <div className="member-info-center" data-testid="member-info">
        <div className="member-card">
          <div className="member-status" data-testid="member-status">
            <span className="status-badge">{getMemberStatus()}</span>
          </div>
          <div className="member-username" data-testid="member-username">
            {user?.username || 'Unknown'}
          </div>
          
          {walletAddress ? (
            <div className="wallet-linked">
              <div className="token-balance" data-testid="token-balance">
                <span className="token-icon">◈</span>
                <span className="balance-amount">
                  {arcoBalance !== null ? arcoBalance.toLocaleString() : '...'}
                </span>
                <span className="token-name">ARCO</span>
              </div>
              <button 
                className="wallet-action-btn unlink"
                onClick={disconnectWallet}
                data-testid="unlink-wallet-btn"
              >
                Unlink Wallet
              </button>
            </div>
          ) : (
            <button 
              className="wallet-action-btn connect"
              onClick={() => setShowWalletModal(true)}
              data-testid="connect-wallet-btn"
            >
              🔗 Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Navigation Areas - Bottom */}
      <div className="navigation-areas">
        <button 
          className={`nav-area-btn sanctuary ${!walletAddress ? 'locked' : ''}`}
          onClick={() => handleNavigation('sanctuary')}
          data-testid="nav-sanctuary"
        >
          <span className="nav-icon">{walletAddress ? '🕯️' : '🔒'}</span>
          <span className="nav-name">The Sanctuary</span>
          <span className="nav-hint">{walletAddress ? 'Find peace within' : 'Connect wallet to access'}</span>
        </button>

        <button 
          className={`nav-area-btn treasury ${!walletAddress ? 'locked' : ''}`}
          onClick={() => handleNavigation('treasury')}
          data-testid="nav-treasury"
        >
          <span className="nav-icon">{walletAddress ? '💰' : '🔒'}</span>
          <span className="nav-name">Treasury</span>
          <span className="nav-hint">{walletAddress ? 'Guild wealth' : 'Connect wallet to access'}</span>
        </button>
      </div>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWalletModal(false)}>×</button>
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to access deeper areas of Arcolia and verify your ARCO holdings.</p>
            
            {walletError && <div className="error-message">{walletError}</div>}
            
            <button 
              className="connect-wallet-btn"
              onClick={connectWallet}
              disabled={isConnectingWallet}
            >
              {isConnectingWallet ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>
            
            <p className="wallet-note">Make sure you're on Polygon network</p>
          </div>
        </div>
      )}

      {/* Admin Modal - Role Management */}
      {showAdminModal && isFounder && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdminModal(false)}>×</button>
            <h3>Manage Guild Roles</h3>
            <p className="admin-subtitle">As Founder, you can assign roles to guild members</p>
            
            {adminError && <div className="error-message">{adminError}</div>}
            {adminSuccess && <div className="success-message">{adminSuccess}</div>}
            
            {adminLoading ? (
              <div className="admin-loading">Loading members...</div>
            ) : (
              <div className="users-list">
                {allUsers.map((u) => (
                  <div key={u.id} className={`user-row ${u.is_banned ? 'user-banned' : ''}`}>
                    <div className="user-info">
                      <span className="user-name">
                        {u.username}
                        {u.is_banned && <span className="banned-badge">BANNED</span>}
                      </span>
                      <span className="user-email">{u.email}</span>
                    </div>
                    <div className="user-actions">
                      <select 
                        value={u.role || 'Member'} 
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                        className="role-select"
                        disabled={u.role === 'Founder' && u.id !== user.id}
                      >
                        <option value="Founder">Founder</option>
                        <option value="Elder">Elder</option>
                        <option value="Noble">Noble</option>
                        <option value="Knight">Knight</option>
                        <option value="Squire">Squire</option>
                        <option value="Initiate">Initiate</option>
                        <option value="Member">Member</option>
                      </select>
                      {u.role !== 'Founder' && u.id !== user.id && (
                        <>
                          <button 
                            className={`action-btn ban-btn ${u.is_banned ? 'unban' : ''}`}
                            onClick={() => banUser(u.id)}
                            title={u.is_banned ? 'Unban user' : 'Ban user'}
                          >
                            {u.is_banned ? '✓' : '🚫'}
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => deleteUser(u.id, u.username)}
                            title="Delete user permanently"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal - Guild Configuration */}
      {showSettingsModal && isFounder && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettingsModal(false)}>×</button>
            <h3>Guild Settings</h3>
            <p className="admin-subtitle">Configure roles and room access permissions</p>
            
            {settingsError && <div className="error-message">{settingsError}</div>}
            {settingsSuccess && <div className="success-message">{settingsSuccess}</div>}
            
            {settingsLoading ? (
              <div className="admin-loading">Loading settings...</div>
            ) : (
              <div className="settings-content">
                {/* Role Names Section */}
                <div className="settings-section">
                  <h4>Role Display Names</h4>
                  <p className="section-note">Customize how each role appears in the guild</p>
                  <div className="roles-list">
                    {Object.entries(editingRoles).sort((a, b) => a[1].order - b[1].order).map(([key, role]) => (
                      <div key={key} className="role-edit-row">
                        <span className="role-key">{key}</span>
                        <input
                          type="text"
                          value={role.displayName}
                          onChange={(e) => updateRoleDisplayName(key, e.target.value)}
                          className="role-name-input"
                          placeholder="Display name"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room Access Section */}
                <div className="settings-section">
                  <h4>Room Access Permissions</h4>
                  <p className="section-note">Control which roles can access each room</p>
                  <div className="rooms-access-grid">
                    {Object.entries(editingRooms).map(([roomKey, room]) => (
                      <div key={roomKey} className="room-access-card">
                        <div className="room-header">
                          <span className="room-name">{room.name}</span>
                          <span className="room-desc">{room.description}</span>
                        </div>
                        <div className="room-roles-toggles">
                          {Object.keys(editingRoles).sort((a, b) => editingRoles[a].order - editingRoles[b].order).map(roleKey => (
                            <label key={roleKey} className="role-toggle">
                              <input
                                type="checkbox"
                                checked={room.allowedRoles?.includes(roleKey) || false}
                                onChange={() => toggleRoomAccess(roomKey, roleKey)}
                              />
                              <span className="role-toggle-label">{editingRoles[roleKey]?.displayName || roleKey}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="save-settings-btn" onClick={saveSettings}>
                  Save Settings
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuildHall;
