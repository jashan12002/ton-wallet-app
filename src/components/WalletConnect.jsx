import React, { useEffect } from "react";
import { useTonWallet } from '@tonconnect/ui-react';

const WalletConnect = ({ onWalletConnected }) => {
  const { connect, wallet, error } = useTonWallet();

  useEffect(() => {
    if (wallet) {
      onWalletConnected(wallet);
    }
  }, [wallet, onWalletConnected]);

  return (
    <div>
      <button onClick={connect} className="btn-connect">
        Connect Wallet
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default WalletConnect;
