import React, { useState, useEffect, useRef } from "react";
import { ArrowUpToLine, Loader2, Wallet } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useTonWallet, TonConnectButton } from "@tonconnect/ui-react";

const TonWithdrawal = () => {
  const [userWallet, setUserWallet] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [tonAmount, setTonAmount] = useState("");
  const [conversionRate, setConversionRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const checkIntervalRef = useRef(null);
  const useraddress = useTonWallet();

  useEffect(() => {
    const fetchConversionRate = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd"
        );
        const data = await response.json();
        setConversionRate(data['the-open-network'].usd);
      } catch (error) {
        console.error("Error fetching conversion rate:", error);
      }
    };

    fetchConversionRate();
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!useraddress?.account?.address) return;
      
      setLoadingBalance(true);
      try {
        const formData = new FormData();
        formData.append('address', useraddress.account.address);

        const response = await fetch('https://tonmaker.org/dashboard/api/usd_balance.php', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        console.log(data);
        
        setBalance(data);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [useraddress?.account?.address]);

  const showProcessingAlert = () => {
    Swal.fire({
      title: 'Processing Withdrawal',
      html: 'Please wait while we process your transaction...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  };

  const showSuccessAlert = (hash) => {
    Swal.fire({
      icon: 'success',
      title: 'Withdrawal Successful!',
      html: `Transaction Hash:<br><small>${hash}</small>`,
      background: '#f0fff4',
      confirmButtonColor: '#28a745',
      showClass: {
        popup: 'animate__animated animate__bounceIn'
      }
    });
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      icon: 'error',
      title: 'Withdrawal Failed',
      text: message,
      background: '#fff6f6',
      confirmButtonColor: '#d33',
      showClass: {
        popup: 'animate__animated animate__shakeX'
      }
    });
  };

  const startTransactionStatusCheck = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    checkIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("https://api.tonmaker.org/check-transaction");
        const data = await response.json();
        
        if (data.success && data.seqnoIncreased) {
          clearInterval(checkIntervalRef.current);
          Swal.close();
          showSuccessAlert(data.transactionId.hash);
          setLoading(false);
        }
      } catch (error) {
        console.error("Transaction status check error:", error);
        clearInterval(checkIntervalRef.current);
        Swal.close();
        showErrorAlert("Error checking transaction status");
        setLoading(false);
      }
    }, 5000);
  };

  const handleUsdAmountChange = (e) => {
    const usd = e.target.value;
    setUsdAmount(usd);
    if (conversionRate && usd && !isNaN(usd)) {
      setTonAmount((parseFloat(usd) / conversionRate).toFixed(6));
    } else {
      setTonAmount("");
    }
  };

  const handleWithdraw = async () => {
    if (!useraddress.account.address || !tonAmount || !useraddress) return;

    setLoading(true);
    showProcessingAlert();

    try {
      const response = await fetch("https://api.tonmaker.org/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: useraddress.account.address,
          amount: tonAmount,
          usdamount: usdAmount
        }),
      });

      const data = await response.json();

      if (data.success) {
        startTransactionStatusCheck();
      } else {
        throw new Error(data.message || "Withdrawal failed");
      }
    } catch (error) {
      Swal.close();
      showErrorAlert(error.message || "An error occurred during withdrawal");
      setLoading(false);
    }
  };

  // If wallet is not connected, show connect button
  if (!useraddress) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">
          Connect Your Wallet
        </h2>
        <div className="mb-4">
          <TonConnectButton />
        </div>
        <p className="text-gray-600 text-center">
          Please connect your TON wallet to proceed with withdrawal
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-blue-600/30 rounded-3xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">
            Withdrawal
          </h2>

          {/* Balance Display */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wallet className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-gray-600">Available Balance:</span>
              </div>
              {loadingBalance ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <span className="font-semibold text-blue-600">
                  ${balance !== null ? balance.toFixed(2) : '0.00'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="number"
              value={usdAmount}
              onChange={handleUsdAmountChange}
              placeholder="Enter withdrawal amount in USD"
              className="w-full p-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-gray-600">1 TON = {conversionRate} USD</p>

            <button
              onClick={handleWithdraw}
              disabled={!tonAmount || !useraddress.account.address || loading || (balance !== null && parseFloat(usdAmount) > balance)}
              className={`w-full flex items-center justify-center p-4 rounded-2xl transition-all duration-300 ${
                loading || !tonAmount || !useraddress.account.address || (balance !== null && parseFloat(usdAmount) > balance)
                  ? "bg-blue-200 text-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
              ) : (
                <ArrowUpToLine className="w-6 h-6 mr-2" />
              )}
              <span className="font-semibold">
                {loading ? "Processing..." : "Withdraw"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TonWithdrawal;