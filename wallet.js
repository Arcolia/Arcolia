// Arcolia Wallet Connection Script
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

// State
let provider = null;
let signer = null;
let userAddress = null;
let chainId = null;

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
    checkExistingConnection();
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
    // Hide the enter button
    enterButton.style.display = 'none';
    
    // Show wallet section with animation
    walletSection.classList.add('active');
    
    // Check if MetaMask is installed
    if (!window.ethereum) {
        showError('MetaMask is not installed. Please install it from metamask.io');
        connectWalletBtn.textContent = 'Install MetaMask';
        connectWalletBtn.addEventListener('click', () => {
            window.open('https://metamask.io/download/', '_blank');
        }, { once: true });
    }
}

/**
 * Check for existing wallet connection
 */
async function checkExistingConnection() {
    if (!window.ethereum) return;
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            userAddress = accounts[0];
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            
            const network = await provider.getNetwork();
            chainId = Number(network.chainId);
            
            // Auto-show wallet section if already connected
            enterButton.style.display = 'none';
            walletSection.classList.add('active');
            await updateWalletDisplay();
            showWalletConnected();
        }
    } catch (error) {
        console.error('Error checking existing connection:', error);
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
        
        // Update UI
        await updateWalletDisplay();
        showWalletConnected();
        
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
 * Disconnect wallet
 */
function disconnectWallet() {
    userAddress = null;
    signer = null;
    provider = null;
    chainId = null;
    
    // Reset UI
    walletInfo.style.display = 'none';
    disconnectBtn.style.display = 'none';
    connectWalletBtn.style.display = 'flex';
    resetConnectButton();
    
    walletStatus.classList.remove('connected');
    statusText.textContent = 'Connect your wallet to enter';
    
    showError('Wallet disconnected');
    setTimeout(hideError, 3000);
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
    } else {
        userAddress = accounts[0];
        await updateWalletDisplay();
    }
}

/**
 * Handle chain/network changes
 */
async function handleChainChanged(chainIdHex) {
    chainId = parseInt(chainIdHex, 16);
    if (userAddress) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await updateWalletDisplay();
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
