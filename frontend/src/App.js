import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import GuildHall from './GuildHall';
import './App.css';

// Check for test mode via URL param
const urlParams = new URLSearchParams(window.location.search);
const testMode = urlParams.get('test') === 'guild';
const testWrongNetwork = urlParams.get('test') === 'wrongnet';

// ARCO Token Configuration
const ARCO_TOKEN_CONFIG = {
  137: '0x6D00EABF782Df498738f29e6558157d36518C663',
};

const MIN_ARCO_REQUIRED = 1;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

const NETWORKS = {
  1: { name: 'Ethereum Mainnet', symbol: 'ETH' },
  5: { name: 'Goerli Testnet', symbol: 'ETH' },
  11155111: { name: 'Sepolia Testnet', symbol: 'ETH' },
  42161: { name: 'Arbitrum One', symbol: 'ETH' },
  10: { name: 'Optimism', symbol: 'ETH' },
  137: { name: 'Polygon', symbol: 'MATIC' },
  56: { name: 'BNB Chain', symbol: 'BNB' },
  43114: { name: 'Avalanche', symbol: 'AVAX' },
};

function App() {
  // View state: 'gate' | 'guild'
  const [currentView, setCurrentView] = useState(testMode ? 'guild' : 'gate');
  
  // For test mode, set demo values
  const [hasEnteredGate, setHasEnteredGate] = useState(testMode || testWrongNetwork);
  const [provider, setProvider] = useState(null);
  const [userAddress, setUserAddress] = useState((testMode || testWrongNetwork) ? '0x1234567890abcdef1234567890abcdef12345678' : null);
  const [chainId, setChainId] = useState(testMode ? 137 : (testWrongNetwork ? 1 : null));
  const [balance, setBalance] = useState((testMode || testWrongNetwork) ? '10.5' : null);
  const [arcoBalance, setArcoBalance] = useState(testMode ? 1250 : null);
  const [accessGranted, setAccessGranted] = useState(testMode);
  const [error, setError] = useState(testWrongNetwork ? 'Please switch to Polygon network to check your ARCO balance' : null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(true);

  useEffect(() => {
    if (!window.ethereum) {
      setHasMetaMask(false);
    } else {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (hasEnteredGate) {
      setUserAddress(accounts[0]);
      await updateWalletInfo(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const handleEnterClick = () => {
    setHasEnteredGate(true);
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it from metamask.io');
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await newProvider.getNetwork();
      
      setProvider(newProvider);
      setUserAddress(accounts[0]);
      setChainId(Number(network.chainId));

      await updateWalletInfo(accounts[0], newProvider, Number(network.chainId));

    } catch (err) {
      if (err.code === -32002) {
        setError('Connection request pending. Check your MetaMask extension.');
      } else if (err.code === 4001) {
        setError('Connection rejected. Please try again.');
      } else {
        setError(`Connection failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const updateWalletInfo = async (address, prov = provider, chain = chainId) => {
    if (!address || !prov) return;

    try {
      const bal = await prov.getBalance(address);
      setBalance(ethers.formatEther(bal));

      const hasAccess = await checkArcoTokenAccess(address, prov, chain);
      setAccessGranted(hasAccess);
    } catch (err) {
      console.error('Error updating wallet info:', err);
    }
  };

  const checkArcoTokenAccess = async (address, prov, chain) => {
    try {
      const tokenAddress = ARCO_TOKEN_CONFIG[chain];

      if (!tokenAddress) {
        console.log('ARCO token not configured for this network.');
        setArcoBalance(null);
        setError('Please switch to Polygon network to check your ARCO balance');
        return false;
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, prov);
      const bal = await tokenContract.balanceOf(address);
      const decimals = await tokenContract.decimals();
      const formattedBalance = parseFloat(ethers.formatUnits(bal, decimals));
      
      setArcoBalance(formattedBalance);
      setError(null);
      return formattedBalance >= MIN_ARCO_REQUIRED;

    } catch (err) {
      console.error('Error checking ARCO balance:', err);
      setArcoBalance(null);
      setError('Error checking ARCO balance. Please try again.');
      return false;
    }
  };

  const switchToPolygon = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // 137 in hex
      });
    } catch (switchError) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
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
        } catch (addError) {
          setError('Failed to add Polygon network. Please add it manually.');
        }
      } else {
        setError('Failed to switch network. Please switch to Polygon manually.');
      }
    }
  };

  const disconnectWallet = () => {
    setUserAddress(null);
    setProvider(null);
    setChainId(null);
    setBalance(null);
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
    setHasEnteredGate(true); // Keep wallet section visible
  };

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const networkInfo = NETWORKS[chainId] || { name: `Network ${chainId}`, symbol: 'ETH' };

  // Show Guild Hall if user has entered
  if (currentView === 'guild') {
    return (
      <GuildHall 
        userAddress={userAddress}
        arcoBalance={arcoBalance}
        onLeaveGuild={leaveGuild}
      />
    );
  }

  // Show Gate (Landing Page)
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
            <div className={`wallet-section active`} data-testid="wallet-section">
              <div className={`wallet-status ${userAddress ? (accessGranted ? 'access-granted' : 'access-denied') : ''}`}>
                <span>
                  {!userAddress 
                    ? 'Connect your wallet to enter' 
                    : accessGranted 
                      ? '✓ Access Granted - Welcome to Arcolia'
                      : `✗ Access Denied - You need at least ${MIN_ARCO_REQUIRED} ARCO tokens`
                  }
                </span>
              </div>

              {!userAddress ? (
                <button 
                  className="wallet-button"
                  onClick={connectWallet}
                  disabled={isConnecting}
                  data-testid="connect-wallet-btn"
                >
                  {!hasMetaMask ? (
                    'Install MetaMask'
                  ) : isConnecting ? (
                    'Connecting...'
                  ) : (
                    <>
                      <svg className="metamask-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M21.37 3L13.06 9.24L14.57 5.52L21.37 3Z" fill="#E17726"/>
                        <path d="M2.63 3L10.87 9.3L9.43 5.52L2.63 3Z" fill="#E27625"/>
                        <path d="M18.44 16.16L16.31 19.5L20.92 20.77L22.24 16.23L18.44 16.16Z" fill="#E27625"/>
                        <path d="M1.77 16.23L3.08 20.77L7.69 19.5L5.56 16.16L1.77 16.23Z" fill="#E27625"/>
                      </svg>
                      Connect MetaMask
                    </>
                  )}
                </button>
              ) : (
                <>
                  {chainId !== 137 && (
                    <button 
                      className="wallet-button switch-network"
                      onClick={switchToPolygon}
                      data-testid="switch-network-btn"
                    >
                      Switch to Polygon
                    </button>
                  )}
                  {accessGranted && (
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
                    onClick={disconnectWallet}
                    data-testid="disconnect-wallet-btn"
                  >
                    Disconnect
                  </button>
                </>
              )}

              {userAddress && (
                <div className="wallet-info" data-testid="wallet-info">
                  <div className="wallet-address">{formatAddress(userAddress)}</div>
                  <div className="wallet-balance">Balance: {parseFloat(balance || 0).toFixed(4)} {networkInfo.symbol}</div>
                  {arcoBalance !== null && typeof arcoBalance === 'number' && (
                    <div className={`arco-balance ${accessGranted ? 'granted' : 'denied'}`}>
                      ARCO: {arcoBalance.toLocaleString()}
                    </div>
                  )}
                  <div className="wallet-network">{networkInfo.name}</div>
                </div>
              )}

              {error && (
                <div className="error-message" data-testid="error-message">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
