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

  // Determine member status based on ARCO balance
  const getMemberStatus = () => {
    if (arcoBalance === null || arcoBalance === undefined) return 'Member';
    if (arcoBalance >= 10000) return 'Elder';
    if (arcoBalance >= 1000) return 'Noble';
    if (arcoBalance >= 100) return 'Knight';
    if (arcoBalance >= 10) return 'Squire';
    return 'Initiate';
  };

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
        <button className="logout-btn" onClick={onLogout} data-testid="logout-btn">
          Leave Guild
        </button>
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
    </div>
  );
}

export default GuildHall;
