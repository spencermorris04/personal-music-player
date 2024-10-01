// src/components/NetworkStatusBanner.tsx

import React from 'react';
import useOnlineStatus from '~/hooks/useOnlineStatus';

const NetworkStatusBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="mb-4 p-2 bg-yellow-200 text-yellow-800 rounded text-center">
      You are currently offline. Displaying cached songs.
    </div>
  );
};

export default NetworkStatusBanner;
