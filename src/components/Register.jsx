import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTonConnectUI, useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Wallet, UserPlus, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';

const Register = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [wallet, setWallet] = useState(null);
  const [refId, setRefId] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feeTransactionResult, setFeeTransactionResult] = useState(null);
  const [feesdata, setfeesdata] = useState(0);

  const connectedWallet = useTonWallet();
  const navigate = useNavigate();
  const location = useLocation();



  useEffect(() => {
    const fetchFeesdata = async () => {
      const regfees = await axios.get('https://tonmaker.org/dashboard/api/ton_rate.php')
      const data = regfees.data;
      console.log(data);
      setfeesdata(data);
    }

    fetchFeesdata()


  }, [])






  const REGISTRATION_FEE = feesdata; // 0.01 TON registration fee

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

  // Extract referral ID from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlRefId = searchParams.get('refid');

    if (urlRefId) {
      setRefId(urlRefId);
    } else {
      // Redirect or show an error if refId is missing
      setRegistrationStatus({
        type: 'error',
        message: 'Referral ID is missing in the URL.'
      });
    }
  }, [location]);

  // Update wallet state when connected
  useEffect(() => {
    if (connectedWallet) {
      setWallet(connectedWallet);
    }
  }, [connectedWallet]);

  const deductRegistrationFee = async () => {
    // Wallet connection check
    if (!wallet) {
      showErrorAlert(
        'Wallet Not Connected',
        'Please connect your TON wallet first',
        'Use the TonConnect button to connect'
      );
      return false;
    }

    try {
      // Fetch the current TON price in USD from the backend
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
      const tonPriceInUSD = response.data['the-open-network'].usd;

      // Convert 0.01 TON to nanotons
      const amountInNanotons = (REGISTRATION_FEE * 1_000_000_000).toFixed(0);

      // Prepare the transaction
      const transaction = {
        validUntil: Date.now() + 5 * 60 * 1000, // Transaction valid for 5 minutes
        messages: [
          {
            address: "UQCdgXFuAFM2lkeR82aNWi-bxSQ9BkhSIDiaJgnY9MYCyWu9", // Replace with your actual wallet address
            amount: amountInNanotons,
          },
        ],
      };

      // Send the transaction via TonConnect
      const result = await tonConnectUI.sendTransaction(transaction);

      setFeeTransactionResult({
        status: 'success',
        boc: result.boc,
        timestamp: new Date().toLocaleString(),
        amount: REGISTRATION_FEE,
        tonPrice: tonPriceInUSD,
        raw: result,
      });

     
      return true;
    } catch (error) {
      let errorDetails = {
        title: 'Fee Payment Failed',
        message: 'An unexpected error occurred',
        footer: ''
      };

      if (error.message.includes('User rejected')) {
        errorDetails = {
          title: 'Transaction Rejected',
          message: 'You cancelled the registration fee payment',
          footer: 'No funds were deducted'
        };
      } else if (error.message.includes('Insufficient funds')) {
        errorDetails = {
          title: 'Insufficient Funds',
          message: `Your wallet balance is too low for the ${REGISTRATION_FEE} TON registration fee`,
          footer: 'Please add funds and try again'
        };
      }

      showErrorAlert(
        errorDetails.title,
        errorDetails.message,
        errorDetails.footer
      );

      return false;
    }
  };

  const handleRegister = async () => {
    if (!wallet) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!refId) {
      alert("Referral ID is required!");
      return;
    }

    // Step 1: Validate user registration and referral ID
    try {
      const formData = new FormData();
      formData.append('address', wallet.account.address);
      formData.append('refid', refId);
      const validationResponse = await axios.post(
        `https://tonmaker.org/dashboard/api/register1.php?address=${wallet.account.address}&refid=${refId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const responseData = validationResponse.data;
      const message = responseData[0]?.replace('Message:', '').trim();
      const status = responseData[1]?.replace('Status:', '').trim();

      console.log("Validation Response:", responseData);

      if (status !== '200') {
        showErrorAlert("Validation Failed", message, "Please check the referral ID and try again.");
        return; // Stop further processing
      }
    } catch (error) {
      console.error("Validation API Error:", error);
      showErrorAlert("Network Error", "Unable to validate referral ID. Please try again later.");
      return;
    }

    // Step 2: Deduct registration fee after successful validation
    const feePaid = await deductRegistrationFee();
    if (!feePaid) {
      return; // Stop if fee payment fails
    }

    // Step 3: Proceed with final registration
    setIsLoading(true);
    setRegistrationStatus(null);

    try {
      const formData = new FormData();
      formData.append('address', wallet.account.address);
      formData.append('refid', refId);

      const response = await axios.post(
        'https://tonmaker.org/dashboard/api/register.php',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const responseData = response.data;
      const message = responseData[0]?.replace('Message:', '').trim();
      const status = responseData[1]?.replace('Status:', '').trim();

      if (status === '200') {
        setRegistrationStatus({
          type: 'success',
          message: message
        });

        showSuccessAlert(
          'Registration Successful!',
          `Registration completed`,
          `Referral ID: ${refId}`
        );

        window.location.href = 'https://tonmaker.org/User-Home';
      } else {
        setRegistrationStatus({
          type: 'error',
          message: message
        });
      }
    } catch (error) {
      console.error('Registration Error:', error);
      setRegistrationStatus({
        type: 'error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden">
      <div className="relative w-full max-w-md">
        <div className="relative z-10 bg-white border-2 border-blue-600/30 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
          <div className="bg-blue-600 p-6 text-center relative overflow-hidden">
            <h1 className="text-3xl font-extrabold text-white relative z-10 flex items-center justify-center gap-3">
              <UserPlus className="w-8 h-8 text-white/80" />
              Register Wallet
            </h1>
          </div>

          <div className="p-6 space-y-6">
            <div className="mb-6 flex justify-center">
              <TonConnectButton className="transform transition-transform hover:scale-105 active:scale-95" />
            </div>

            {wallet && (
              <>
                <div className="bg-blue-50 rounded-2xl p-5 mb-6 shadow-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Wallet className="w-6 h-6 text-blue-600" />
                    <p className="text-sm text-gray-700 overflow-x-scroll">
                      {wallet.account.address}
                    </p>
                  </div>
                </div>

                

                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Referral ID:
                  </label>
                  <div className="px-4 py-3 border border-blue-200 rounded-xl bg-gray-100 text-gray-700 overflow-x-scroll">
                    {refId || 'Loading...'}
                  </div>
                </div>

                {registrationStatus && (
                  <div className={`
                    flex items-center p-4 rounded-xl mb-6
                    ${registrationStatus.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'}
                  `}>
                    {registrationStatus.type === 'success' ? (
                      <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 mr-3 text-red-600" />
                    )}
                    <span className="font-semibold">{registrationStatus.message}</span>
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className={`
                    w-full py-4 rounded-2xl text-white font-semibold transition-all duration-300
                    ${isLoading
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
                  `}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;