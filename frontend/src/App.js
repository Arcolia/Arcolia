import React, { useState, useEffect } from 'react';
import { WagmiProvider, useAccount, useDisconnect, useChainId, useBalance } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { polygon } from 'wagmi/chains';
import { ethers } from 'ethers';
import { wagmiConfig } from './walletConfig';
import GuildHall from './GuildHall';
import './App.css';

const queryClient = new QueryClient();

// ARCO Token Configuration
const ARCO_TOKEN_ADDRESS = '0x6D00EABF782Df498738f29e6558157d36518C663';
const MIN_ARCO_REQUIRED = 1;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Main App wrapper with providers
function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ArcoliaApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Inner app component with wallet logic
function ArcoliaApp() {
  const { open } = useWeb3Modal();
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({ address });

  const [currentView, setCurrentView] = useState('gate');
  const [hasEnteredGate, setHasEnteredGate] = useState(false);
  const [arcoBalance, setArcoBalance] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  // Check ARCO balance when connected
  useEffect(() => {
    if (isConnected && address && chainId === polygon.id) {
      checkArcoBalance();
    } else if (isConnected && chainId !== polygon.id) {
      setError('Please switch to Polygon network');
      setArcoBalance(null);
      setAccessGranted(false);
    }
  }, [isConnected, address, chainId]);

  const checkArcoBalance = async () => {
    if (!address) return;
    
    setIsCheckingAccess(true);
    setError(null);
    
    try {
      // Use a public Polygon RPC
      const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      const tokenContract = new ethers.Contract(ARCO_TOKEN_ADDRESS, ERC20_ABI, provider);
      
      const balance = await tokenContract.balanceOf(address);
      const decimals = await tokenContract.decimals();
      const formattedBalance = parseFloat(ethers.formatUnits(balance, decimals));
      
      console.log('ARCO Balance:', formattedBalance);
      setArcoBalance(formattedBalance);
      setAccessGranted(formattedBalance >= MIN_ARCO_REQUIRED);
      
      if (formattedBalance < MIN_ARCO_REQUIRED) {
        setError(`You need at least ${MIN_ARCO_REQUIRED} ARCO token to enter`);
      }
    } catch (err) {
      console.error('Error checking ARCO balance:', err);
      setError('Could not verify ARCO balance. Please try again.');
      setArcoBalance(null);
      setAccessGranted(false);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const handleEnterClick = () => {
    setHasEnteredGate(true);
  };

  const handleConnectWallet = () => {
    open();
  };

  const handleDisconnect = () => {
    disconnect();
    setArcoBalance(null);
    setAccessGranted(false);
    setError(null);
    setCurrentView('gate');
    setHasEnteredGate(false);
  };

  const enterGuildHall = () => {
    if (accessGranted) {
      setCurrentView('guild');
    }
  };

  const leaveGuild = () => {
    setCurrentView('gate');
    setHasEnteredGate(true);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const isOnPolygon = chainId === polygon.id;
  const nativeBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0';

  // Show Guild Hall
  if (currentView === 'guild') {
    return (
      <GuildHall 
        userAddress={address}
        arcoBalance={arcoBalance}
        onLeaveGuild={leaveGuild}
      />
    );
  }

  // Show Gate
  return (
    <div className="app">
      <div className="background-container">
        <img 
          src={process.env.REACT_APP_GATE_IMAGE_URL || "https://customer-assets.emergentagent.com/job_5f4ad191-281f-40c5-b666-9b6aafb80095/artifacts/uidem9rb_Doors.png"} 
          alt="Arcolia Gate" 
          className="background-image"
        />
        <div className="background-overlay"></div>
      </div>

      <main className="main-content">
        <div className="content-wrapper">
          {!hasEnteredGate ? (
            <button 
              className="enter-button" 
              onClick={handleEnterClick}
              data-testid="enter-arcolia-btn"
            >
              Enter Arcolia
            </button>
          ) : (
            <div className="wallet-section active" data-testid="wallet-section">
              {/* Status */}
              <div className={`wallet-status ${isConnected ? (accessGranted ? 'access-granted' : 'access-denied') : ''}`}>
                <span>
                  {!isConnected 
                    ? 'Connect your wallet to enter' 
                    : isCheckingAccess
                      ? 'Checking ARCO balance...'
                      : !isOnPolygon
                        ? '⚠️ Please switch to Polygon network'
                        : accessGranted 
                          ? '✓ Access Granted - Welcome to Arcolia'
                          : `✗ Access Denied - You need ${MIN_ARCO_REQUIRED} ARCO`
                  }
                </span>
              </div>

              {/* Connect/Action Buttons */}
              {!isConnected ? (
                <button 
                  className="wallet-button"
                  onClick={handleConnectWallet}
                  data-testid="connect-wallet-btn"
                >
                  🔗 Connect Wallet
                </button>
              ) : (
                <>
                  {!isOnPolygon && (
                    <button 
                      className="wallet-button switch-network"
                      onClick={() => open({ view: 'Networks' })}
                      data-testid="switch-network-btn"
                    >
                      🔗 Switch to Polygon
                    </button>
                  )}
                  
                  {accessGranted && isOnPolygon && (
                    <button 
                      className="wallet-button enter-guild"
                      onClick={enterGuildHall}
                      data-testid="enter-guild-btn"
                    >
                      Enter the Guild Hall
                    </button>
                  )}
                  
                  <button 
                    className="wallet-button secondary"
                    onClick={handleDisconnect}
                    data-testid="disconnect-wallet-btn"
                  >
                    Disconnect
                  </button>
                </>
              )}

              {/* Wallet Info */}
              {isConnected && (
                <div className="wallet-info" data-testid="wallet-info">
                  <div className="wallet-address">{formatAddress(address)}</div>
                  <div className="wallet-balance">
                    Balance: {nativeBalance} {isOnPolygon ? 'MATIC' : 'ETH'}
                  </div>
                  {arcoBalance !== null && (
                    <div className={`arco-balance ${accessGranted ? 'granted' : 'denied'}`}>
                      ARCO: {arcoBalance.toLocaleString()}
                    </div>
                  )}
                  <div className="wallet-network">
                    {isOnPolygon ? 'Polygon' : `Chain ${chainId}`}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="error-message" data-testid="error-message">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Install PWA prompt for mobile */}
      <InstallPrompt />
    </div>
  );
}

// PWA Install Prompt Component
function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay if not already installed
      setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt">
      <p>Install Arcolia for quick access</p>
      <button onClick={handleInstall}>Install App</button>
      <button onClick={() => setShowPrompt(false)}>Not now</button>
    </div>
  );
}

export default App;
