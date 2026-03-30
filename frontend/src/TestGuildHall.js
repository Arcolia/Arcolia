import React from 'react';
import GuildHall from './GuildHall';

// Test component to preview Guild Hall
function TestGuildHall() {
  return (
    <GuildHall 
      userAddress="0x1234567890abcdef1234567890abcdef12345678"
      arcoBalance={1250}
      onLeaveGuild={() => alert('Leaving guild...')}
    />
  );
}

export default TestGuildHall;
