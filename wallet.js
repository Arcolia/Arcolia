// Arcolia Wallet Connection Script with ARCO Token Gating
const { ethers } = window;

// DOM Elements
const enterButton = document.getElementById('enterButton');
const walletSection = document.getElementById('walletSection');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const walletStatus = document.getElementById('walletStatus');
const statusText = document.getElementById('statusText');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const walletBalance = document.getElementById('walletBalance');
const walletNetwork = document.getElementById('walletNetwork');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// ARCO Token Configuration
const ARCO_TOKEN_CONFIG = {
    // Polygon Mainnet - ARCO token
    137: '0x6a931530fb7946dC95fd9d7245157661D7B0B375',
};

// Minimum ARCO tokens required to enter (in token units, considering decimals)
const MIN_ARCO_REQUIRED = 1;

// ERC20 ABI for balance checking
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
];

// State
let provider = null;
let signer = null;
let userAddress = null;
let chainId = null;
let arcoBalance = 0;
let hasEnteredGate = false;

// Network mappings
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

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // Don't auto-check connection - wait for user to click Enter
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Enter button click - shows wallet section
    enterButton.addEventListener('click', handleEnterClick);
    
    // Wallet connect button
    connectWalletBtn.addEventListener('click', connectWallet);
    
    // Disconnect button
    disconnectBtn.addEventListener('click', disconnectWallet);
    
    // MetaMask events
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
    }
}

/**
 * Handle Enter Arcolia button click
 */
function handleEnterClick() {
    hasEnteredGate = true;
    
    // Hide the enter button
    enterButton.style.display = 'none';
    
    // Show wallet section with animation
    walletSection.classList.add('active');
    
    // Check if MetaMask is installed
    if (!window.ethereum) {
        showError('MetaMask is not installed. Please install it from metamask.io');
        connectWalletBtn.innerHTML = 'Install MetaMask';
        connectWalletBtn.onclick = () => {
            window.open('https://metamask.io/download/', '_blank');
        };
    }
}

/**
 * Connect wallet
 */
async function connectWallet() {
    if (!window.ethereum) {
        showError('MetaMask is not installed. Please install it to continue.');
        return;
    }
    
    try {
        hideError();
        connectWalletBtn.disabled = true;
        connectWalletBtn.innerHTML = '<span class="loading">Connecting...</span>';
        
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        // Get network info
        const network = await provider.getNetwork();
        chainId = Number(network.chainId);
        
        // Update wallet display first
        await updateWalletDisplay();
        
        // Check ARCO token balance
        const hasAccess = await checkArcoTokenAccess();
        
        if (hasAccess) {
            showWalletConnected();
            showAccessGranted();
        } else {
            showAccessDenied();
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        
        if (error.code === -32002) {
            showError('Connection request pending. Check your MetaMask extension.');
        } else if (error.code === 4001) {
            showError('Connection rejected. Please try again.');
        } else {
            showError(`Connection failed: ${error.message || 'Unknown error'}`);
        }
        
        resetConnectButton();
    }
}

/**
 * Check if user holds ARCO tokens
 */
async function checkArcoTokenAccess() {
    try {
        const tokenAddress = ARCO_TOKEN_CONFIG[chainId];
        
        // If no token address configured for this network, allow access (for demo)
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
            console.log('ARCO token not configured for this network. Demo mode: allowing access.');
            arcoBalance = 'Demo Mode';
            return true; // Demo mode - allow access
        }
        
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        
        // Get token balance
        const balance = await tokenContract.balanceOf(userAddress);
        const decimals = await tokenContract.decimals();
        
        // Convert to human-readable format
        arcoBalance = parseFloat(ethers.formatUnits(balance, decimals));
        
        console.log(`ARCO Balance: ${arcoBalance}`);
        
        return arcoBalance >= MIN_ARCO_REQUIRED;
        
    } catch (error) {
        console.error('Error checking ARCO balance:', error);
        // If error reading token, allow access in demo mode
        arcoBalance = 'Check Failed';
        return true; // Fail open for demo
    }
}

/**
 * Show access granted UI
 */
function showAccessGranted() {
    // Add ARCO balance to display
    const arcoDisplay = document.getElementById('arcoBalance');
    if (arcoDisplay) {
        arcoDisplay.textContent = `ARCO: ${arcoBalance}`;
        arcoDisplay.style.color = '#4ade80';
    }
    
    // Update status
    walletStatus.classList.add('connected');
    walletStatus.classList.add('access-granted');
    statusText.innerHTML = '✓ Access Granted - Welcome to Arcolia';
}

/**
 * Show access denied UI
 */
function showAccessDenied() {
    walletStatus.classList.add('connected');
    walletStatus.classList.add('access-denied');
    statusText.innerHTML = `✗ Access Denied - You need at least ${MIN_ARCO_REQUIRED} ARCO tokens`;
    
    // Show info but with denied styling
    walletInfo.style.display = 'flex';
    disconnectBtn.style.display = 'flex';
    connectWalletBtn.style.display = 'none';
    
    showError(`You need to hold at least ${MIN_ARCO_REQUIRED} ARCO token(s) to enter Arcolia. Current balance: ${arcoBalance}`);
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    userAddress = null;
    signer = null;
    provider = null;
    chainId = null;
    arcoBalance = 0;
    
    // Reset UI
    walletInfo.style.display = 'none';
    disconnectBtn.style.display = 'none';
    connectWalletBtn.style.display = 'flex';
    resetConnectButton();
    
    walletStatus.classList.remove('connected', 'access-granted', 'access-denied');
    statusText.textContent = 'Connect your wallet to enter';
    
    hideError();
}

/**
 * Update wallet display info
 */
async function updateWalletDisplay() {
    if (!userAddress || !provider) return;
    
    try {
        // Format address
        const shortAddress = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        walletAddress.textContent = shortAddress;
        
        // Get balance
        const balance = await provider.getBalance(userAddress);
        const balanceEth = ethers.formatEther(balance);
        const networkInfo = NETWORKS[chainId] || { symbol: 'ETH' };
        walletBalance.textContent = `Balance: ${parseFloat(balanceEth).toFixed(4)} ${networkInfo.symbol}`;
        
        // Get network name
        const networkName = NETWORKS[chainId]?.name || `Network ID: ${chainId}`;
        walletNetwork.textContent = networkName;
        
    } catch (error) {
        console.error('Error updating wallet display:', error);
    }
}

/**
 * Show wallet connected state
 */
function showWalletConnected() {
    walletStatus.classList.add('connected');
    statusText.textContent = 'Wallet Connected';
    
    connectWalletBtn.style.display = 'none';
    disconnectBtn.style.display = 'flex';
    walletInfo.style.display = 'flex';
}

/**
 * Reset connect button state
 */
function resetConnectButton() {
    connectWalletBtn.disabled = false;
    connectWalletBtn.innerHTML = `
        <svg class="metamask-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.37 3L13.06 9.24L14.57 5.52L21.37 3Z" fill="#E17726"/>
            <path d="M2.63 3L10.87 9.3L9.43 5.52L2.63 3Z" fill="#E27625"/>
            <path d="M18.44 16.16L16.31 19.5L20.92 20.77L22.24 16.23L18.44 16.16Z" fill="#E27625"/>
            <path d="M1.77 16.23L3.08 20.77L7.69 19.5L5.56 16.16L1.77 16.23Z" fill="#E27625"/>
            <path d="M7.42 10.73L6.14 12.62L10.71 12.85L10.55 7.94L7.42 10.73Z" fill="#E27625"/>
            <path d="M16.58 10.73L13.41 7.88L13.29 12.85L17.86 12.62L16.58 10.73Z" fill="#E27625"/>
            <path d="M7.69 19.5L10.44 18.17L8.07 16.26L7.69 19.5Z" fill="#E27625"/>
            <path d="M13.56 18.17L16.31 19.5L15.93 16.26L13.56 18.17Z" fill="#E27625"/>
        </svg>
        Connect MetaMask
    `;
}

/**
 * Handle account changes
 */
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (hasEnteredGate) {
        userAddress = accounts[0];
        await updateWalletDisplay();
        
        // Re-check token access
        const hasAccess = await checkArcoTokenAccess();
        if (hasAccess) {
            showAccessGranted();
        } else {
            showAccessDenied();
        }
    }
}

/**
 * Handle chain/network changes
 */
async function handleChainChanged(chainIdHex) {
    chainId = parseInt(chainIdHex, 16);
    if (userAddress && hasEnteredGate) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await updateWalletDisplay();
        
        // Re-check token access on new network
        const hasAccess = await checkArcoTokenAccess();
        if (hasAccess) {
            showAccessGranted();
        } else {
            showAccessDenied();
        }
    }
}

/**
 * Handle disconnect event
 */
function handleDisconnect() {
    disconnectWallet();
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.style.display = 'none';
}
