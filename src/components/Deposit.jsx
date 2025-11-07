import React, { useState, useEffect } from "react";
import { useTonConnectUI, useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
import { ArrowDownToLine } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const Deposit = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [amount, setAmount] = useState("");
  const [transactionResult, setTransactionResult] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setloading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [oldSeqno, setOldSeqno] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);

  const wallet = useTonWallet();

  const getWalletInfo = async (address) => {
    try {
      const response = await axios.get(`https://toncenter.com/api/v2/getWalletInformation?address=${address}`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (wallet) {
      checkActivationStatus();
    }
  }, [wallet]);

  const checkActivationStatus = async () => {
    if (!wallet) return;

    try {
      const response = await axios.post(
        'https://tonmaker.org/dashboard/api/activation.php',
        {
          address: wallet.account.address
        },
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const status = response.data[1]?.replace('Status:', '').trim();
      setIsActivated(status === '200');
      
      // if (status !== '200') {
      //   showErrorAlert(
          
      //     ' Minimum deposit amount is 30 TON.'
         
      //   );
      // }
    } catch (error) {
      console.error('Activation check failed:', error);
      showErrorAlert(
        'Activation Check Failed',
        'Unable to verify account activation status',
        'Please try again later'
      );
    }
  };

  const showErrorAlert = (title, text, footer = '') => {
    Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      footer: footer,
      background: '#fff6f6',
      confirmButtonColor: '#d33',
      confirmButtonText: 'Okay',
      showClass: {
        popup: 'animate__animated animate__shakeX'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutDown'
      }
    });
  };

  const showSuccessAlert = (title, text, footer = '') => {
    Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      footer: footer,
      background: '#f0fff4',
      confirmButtonColor: '#28a745',
      showClass: {
        popup: 'animate__animated animate__bounceIn'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutDown'
      }
    });
  };

  const validateAmount = (amount) => {
    const minAmount = isActivated ? 10 : 30;
    if (!amount || isNaN(amount) || parseFloat(amount) < minAmount) {
      showErrorAlert(
        'Invalid Amount',
        `Minimum deposit amount is ${minAmount} TON`
      );
      return false;
    }
    return true;
  };

  const waitForTransaction = async (address, initialSeqno) => {
    let attempts = 0;
    const maxAttempts = 20; // Maximum number of attempts
    const delay = 3000; // 3 seconds between attempts

    while (attempts < maxAttempts) {
      try {
        const walletInfo = await getWalletInfo(address);
        const currentSeqno = parseInt(walletInfo.seqno);

        if (currentSeqno > initialSeqno) {
          // Transaction confirmed - return the hash
          return walletInfo.last_transaction_id.hash;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      } catch (error) {
        console.error('Error checking transaction:', error);
        throw error;
      }
    }

    throw new Error('Transaction confirmation timeout');
  };


  const postToBackendAPI = async (transactionDetails, hash) => {
    setloading(true);
    try {
      const formData = new FormData();
      formData.append('address', wallet.account.address);
      formData.append('amount', amount);
      formData.append('hash', hash);

      const response = await axios.post(
        'https://tonmaker.org/dashboard/api/fund.php',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const parsedResponse = {
        tonPrice: response.data['the-open-network']?.usd || null,
        message: response.data['0']?.replace('Message:', '').trim() || 'No message',
        status: response.data['1']?.replace('Status:', '').trim() || 'Unknown'
      };

      setApiResponse({
        status: parsedResponse.status === '200' ? 'success' : 'failed',
        message: parsedResponse.message,
        tonPrice: parsedResponse.tonPrice,
        raw: response.data
      });

      setloading(false);
      return parsedResponse;
    } catch (error) {
      setloading(false);
      console.error('API Post Error:', error);
      throw error;
    }
  };

  const deposit = async () => {
    if (!wallet) {
      showErrorAlert(
        'Wallet Not Connected', 
        'Please connect your TON wallet first'
      );
      return;
    }

    if (!validateAmount(amount)) {
      return;
    }

    setloading(true);

    try {
      // Get initial seqno
      const initialWalletInfo = await getWalletInfo(wallet.account.address);
      const initialSeqno = parseInt(initialWalletInfo.seqno);
      setOldSeqno(initialSeqno);

      // Get TON price and prepare transaction
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
      const tonPriceInUSD = response.data['the-open-network'].usd;
      const tonAmount = parseFloat(amount) / tonPriceInUSD;
      const amountInNanotons = (tonAmount * 1_000_000_000).toFixed(0);

      // Send transaction
      const transaction = {
        validUntil: Date.now() + 5 * 60 * 1000,
        messages: [
          {
            address: "UQBil3M3mHZhCEciGWG0wXlOdE4l_RgRkS_uYmMzNm3gjPw7",
            amount: amountInNanotons,
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      setTransactionResult({
        status: 'processing',
        boc: result.boc,
        timestamp: new Date().toLocaleString(),
        amount: amount,
        tonAmount: tonAmount.toFixed(6)
      });

      // Wait for transaction confirmation and get hash
      const txHash = await waitForTransaction(wallet.account.address, initialSeqno);
      setTransactionHash(txHash);

      // Post to backend with transaction hash
      await postToBackendAPI(result, txHash);

      showSuccessAlert(
        'Deposit Successful!', 
        `You deposited ${tonAmount.toFixed(6)} TON\nTransaction Hash: ${txHash}`, 
        `Current TON Price: $${tonPriceInUSD.toFixed(2)}`
      );
    } catch (error) {
      handleDepositError(error);
    } finally {
      setloading(false);
    }
  };

  const handleDepositError = (error) => {
    let errorDetails = {
      title: 'Deposit Failed',
      message: 'An unexpected error occurred',
      footer: ''
    };

    if (error.message.includes('User rejected')) {
      errorDetails = {
        title: 'Transaction Rejected',
        message: 'You cancelled the transaction',
        footer: 'No funds were deducted'
      };
    } else if (error.message.includes('confirmation timeout')) {
      errorDetails = {
        title: 'Transaction Timeout',
        message: 'Unable to confirm transaction completion',
        footer: 'Please check your wallet for transaction status'
      };
    }

    showErrorAlert(
      errorDetails.title, 
      errorDetails.message, 
      errorDetails.footer
    );

    setTransactionResult({
      status: 'failed',
      errorType: errorDetails.title,
      errorMessage: error.message,
      timestamp: new Date().toLocaleString(),
    });
  };


  const renderTransactionStatus = () => {
    if (!transactionResult) return null;

    return (
      <div className={`mt-6 bg-green-50 border-green-200 rounded-lg p-4 border`}>
        {loading ? <h4 className="text-center font-semibold mb-2">Loading... Do not refresh</h4> : ''}
        {apiResponse && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-center font-semibold mb-2">Transaction</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${apiResponse.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {apiResponse.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Message:</span>
                <span className="text-gray-800">{apiResponse.message}</span>
              </div>
              {apiResponse.tonPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-600">TON Price:</span>
                  <span className="text-blue-800 font-semibold">${apiResponse.tonPrice.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="deposit">
      <div className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full max-w-md">
          <div className="relative z-10 bg-white border-2 border-blue-600/30 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
            <div className="p-6 text-center relative overflow-hidden">
              <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">Deposit</h2>
              {!wallet ? (
                <div className="mb-6 flex justify-center">
                  <TonConnectButton />
                </div>
              ) : (
                <>
                 
                  <div className="mb-6">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter deposit amount"
                      className="w-full p-4 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {wallet && (
                <button
                  onClick={deposit}
                  disabled={!amount || isNaN(amount) || parseFloat(amount) <= 0}
                  className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 
                  ${amount && !isNaN(amount) && parseFloat(amount) > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-200 text-blue-400 cursor-not-allowed'
                    }`}
                >
                  <ArrowDownToLine className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Deposit</span>
                </button>
              )}

              {renderTransactionStatus()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deposit;