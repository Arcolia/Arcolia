import React from 'react';
import './GuildHall.css';

function GuildHall({ userAddress, arcoBalance, onLeaveGuild }) {
  const formatAddress = (addr) => {
    if (!addr) return 'Unknown';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Determine member status based on ARCO balance
  const getMemberStatus = () => {
    if (typeof arcoBalance !== 'number') return 'Member';
    if (arcoBalance >= 10000) return 'Elder';
    if (arcoBalance >= 1000) return 'Noble';
    if (arcoBalance >= 100) return 'Knight';
    if (arcoBalance >= 10) return 'Squire';
    return 'Initiate';
  };

  const handleNavigation = (area) => {
    // For now, show alert for areas under development
    if (area === 'library') {
      alert('The Library is under construction. Coming soon!');
    } else if (area === 'treasury') {
      alert('The Treasury awaits. Coming soon!');
    }
  };

  const handleComingSoon = (area) => {
    alert(`This area is locked. Coming soon!`);
  };

  return (
    <div className="guild-hall" data-testid="guild-hall">
      {/* Background */}
      <div className="guild-background">
        <img 
          src="https://customer-assets.emergentagent.com/job_page-builder-225/artifacts/0bd60lpe_Guild%20Hall.png"
          alt="Guild Hall"
          className="guild-bg-image"
        />
        <div className="guild-overlay"></div>
      </div>

      {/* Header */}
      <header className="guild-header">
        <h1 className="guild-title" data-testid="guild-title">The Guild Hall</h1>
      </header>

      {/* Coming Soon Areas - Top */}
      <div className="coming-soon-areas">
        <button 
          className="coming-soon-btn left"
          onClick={() => handleComingSoon('left-archive')}
          data-testid="coming-soon-left"
        >
          <span className="lock-icon">🔒</span>
          <span className="area-name">Archives</span>
          <span className="coming-soon-text">Coming Soon</span>
        </button>
        
        <button 
          className="coming-soon-btn right"
          onClick={() => handleComingSoon('throne-room')}
          data-testid="coming-soon-right"
        >
          <span className="lock-icon">🔒</span>
          <span className="area-name">Throne Room</span>
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
            {formatAddress(userAddress)}
          </div>
          <div className="token-balance" data-testid="token-balance">
            <span className="token-icon">◈</span>
            <span className="balance-amount">
              {typeof arcoBalance === 'number' ? arcoBalance.toLocaleString() : arcoBalance}
            </span>
            <span className="token-name">ARCO</span>
          </div>
        </div>
      </div>

      {/* Navigation Areas - Bottom */}
      <div className="navigation-areas">
        <button 
          className="nav-area-btn library"
          onClick={() => handleNavigation('library')}
          data-testid="nav-library"
        >
          <span className="nav-icon">📚</span>
          <span className="nav-name">The Library</span>
          <span className="nav-hint">Knowledge awaits</span>
        </button>

        <button 
          className="nav-area-btn throne"
          onClick={() => handleNavigation('treasury')}
          data-testid="nav-treasury"
        >
          <span className="nav-icon">💰</span>
          <span className="nav-name">Treasury</span>
          <span className="nav-hint">Guild wealth</span>
        </button>
      </div>

      {/* Leave Guild Button */}
      <div className="leave-guild-container">
        <button 
          className="leave-guild-btn"
          onClick={onLeaveGuild}
          data-testid="leave-guild-btn"
        >
          Leave Guild
        </button>
      </div>
    </div>
  );
}

export default GuildHall;
