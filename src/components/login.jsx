import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
import axios from 'axios';
import { LogIn, Wallet, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
    const [wallet, setWallet] = useState(null);
    const [loginStatus, setLoginStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const connectedWallet = useTonWallet();
    const navigate = useNavigate();

    // Update wallet state when connected
    useEffect(() => {
        if (connectedWallet) {
            setWallet(connectedWallet);
            handleLogin();
        }
    }, [connectedWallet]);

    const handleLogin = async () => {
        // Validate wallet connection
        if (!wallet) {
            console.log('Please connect your wallet first!');
            
            return;
        }

        setIsLoading(true);
        setLoginStatus(null);

        try {
            // Create FormData
            // const formData = new FormData();
            // formData.append('address', wallet.account.address);

            // // Make POST request
            // const response = await axios.post(
            //     'https://tonmaker.org/dashboard/api/login.php',
            //     formData,
            //     {
            //         headers: {
            //             'Content-Type': 'multipart/form-data'
            //         }
            //     }
            // );

            // // Parse the response
            // const responseData = response.data;
            // const message = responseData[0]?.replace('Message:', '').trim();
            // const status = responseData[1]?.replace('Status:', '').trim();
           const status = "200"
              const message = "Login successful"
            // Handle different login scenarios
            if (status === '200') {
                // Successful login
                setLoginStatus({
                    type: 'success',
                    message: message
                });

                // Redirect to dashboard
                // setTimeout(() => {
                //     window.location.href = 'https://tonmaker.org/User-Home';
                // }, 2000);
            } else {
                // Login failed
                setLoginStatus({
                    type: 'error',
                    message: message
                });

                // window.location.href = 'https://tonmaker.org/user/register';
              
            }
        } catch (error) {
            console.error('Login Error:', error);
            setLoginStatus({
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
                            <LogIn className="w-8 h-8 text-white/80" />
                            Wallet Login
                        </h1>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Wallet Connection Section */}
                        <div className="mb-6 flex justify-center">
                            <TonConnectButton className="transform transition-transform hover:scale-105 active:scale-95" />
                        </div>

                        {wallet && (
                            <>
                                {/* Wallet Address Display */}
                                {/* <div className="bg-blue-50 rounded-2xl p-5 mb-6 shadow-lg border border-blue-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Wallet className="w-6 h-6 text-blue-600" />
                                        <p className="text-sm text-gray-700 truncate">
                                            {wallet.account.address}
                                        </p>
                                    </div>
                                </div> */}

                                {/* Login Status */}
                                {loginStatus && (
                                    <div className={`
                    flex items-center p-4 rounded-xl mb-6
                    ${loginStatus.type === 'success'
                                            ? 'bg-green-50 border border-green-200 text-green-800'
                                            : 'bg-red-50 border border-red-200 text-red-800'}
                  `}>
                                        {loginStatus.type === 'success' ? (
                                            <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                                        ) : (
                                            <AlertCircle className="w-6 h-6 mr-3 text-red-600" />
                                        )}
                                        <span className="font-semibold">{loginStatus.message}</span>
                                    </div>
                                )}

                                {/* Login Button (if not already in process of logging in) */}
                                {!isLoading && loginStatus?.type !== 'success' && (
                                    <button
                                        onClick={handleLogin}
                                        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-95 transition-all duration-300"
                                    >
                                        Log In
                                    </button>
                                )}

                                {/* Loading State */}
                                {isLoading && (
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
                                    </div>
                                )}

                                {/* <div className="flex justify-center items-center">
                                    <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
                                </div> */}


                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;