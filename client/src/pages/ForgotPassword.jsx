import { apiUrl } from '../utils/api.js';
import { useState, useEffect } from 'react';
import axios from 'axios'; // Ensure axios is installed
import styles from '../style';
import { logo, loginimage, Vector } from '../assets';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    // Step can be 'email', 'otp', or 'reset'
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(''); // For success messages
    const [error, setError] = useState(''); // For error messages
    const [loading, setLoading] = useState(false); // For loading state
    const [timer, setTimer] = useState(600); // 10 minutes in seconds
    const [canResend, setCanResend] = useState(false); // To control resend button

    // Base URL of your backend


    // Timer countdown for OTP expiration
    useEffect(() => {
        let interval = null;
        if (step === 'otp' && timer > 0) {
            interval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true); // Allow resending OTP
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    // Format timer as MM:SS
    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle email submission to request OTP
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(apiUrl('/forgot-password'), { email });
            if (response.data.Status) {
                setMessage('OTP has been sent to your email.');
                setStep('otp'); // Move to OTP verification step
                setTimer(300); // Reset timer to 10 minutes
                setCanResend(false); // Disable resend initially
            } else if (response.data.Error) {
                setError(response.data.Error);
            }
        } catch (err) {
            console.error(err);
            console.error('Error response:', err.response ? err.response.data : err.message);
            setError('An error occurred while sending OTP.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP submission to verify and move to password reset step
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(apiUrl('/verify-otp'), { email, otp });
            if (response.data.Status) {
                setMessage('OTP verified. Please enter your new password.');
                setStep('reset'); // Move to Password Reset step
            } else if (response.data.Error) {
                setError(response.data.Error);
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while verifying OTP.');
        } finally {
            setLoading(false);
        }
    };

    // Handle password reset submission
    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        // Basic client-side validation
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(apiUrl('/reset-password'), {
                email,
                otp,
                newPassword,
            });

            if (response.data.success) {
                // Display success message
                setMessage('Your password has been reset successfully.');
                setStep('email'); // Reset to the initial step (email input)
                setEmail('');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                // Display the error message from the backend
                setError(response.data.Error || 'An unknown error occurred.');
            }
        } catch (err) {
            console.error('Error during password reset:', err);

            // Check if the error is from the backend
            if (err.response && err.response.data && err.response.data.Error) {
                setError(err.response.data.Error);
            } else {
                setError('An error occurred while resetting your password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };


    // Handle Resend OTP
    const handleResendOtp = async () => {
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(apiUrl('/forgot-password'), { email });
            if (response.data.Status) {
                setMessage('A new OTP has been sent to your email.');
                setTimer(300); // Reset timer to 10 minutes
                setCanResend(false); // Disable resend button again
            } else if (response.data.Error) {
                setError(response.data.Error);
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while resending OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className={`bg-login flex ${styles.paddingY} h-screen w-full`}
            style={{
                backgroundImage: `url(${Vector})`,
                backgroundSize: '80%',
                backgroundPosition: 'right 50%',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="flex flex-col items-start justify-center mt-40 ml-20 p-5 pt-2 rounded shadow-md w-[386px] h-[450px] bg-white">
                <img src={logo} className="w-[175px] h-[36px]" alt="Logo" />

                {/* Dynamic Heading */}
                <h2 className="text-2xl font-poppins font-semibold mb-3">
                    {step === 'email' && 'Forgot Password'}
                    {step === 'otp' && 'Verify OTP'}
                    {step === 'reset' && 'Reset Password'}
                </h2>

                {/* Display Success or Error Messages */}
                {message && <p className="text-green-600 mb-4">{message}</p>}
                {error && <p className="text-red-600 mb-4">{error}</p>}

                {/* Render Forms Based on Current Step */}
                {step === 'email' && (
                    <form onSubmit={handleEmailSubmit}>
                        <div>
                            <label
                                className="text-l font-normal font-['Roboto'] leading-normal mb-5 "
                                htmlFor="email"
                            >
                                Enter your email address:
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={`shadow-md w-full h-[50px] rounded border bg-gray-100 px-3 `}
                                placeholder="you@example.com"
                            />
                        </div>
                        <button
                            className="w-full h-[60px] bg-[#875eff] text-white rounded-[10px] border-2 border-[#875eff] mb-4 mt-10 hover:bg-[#6d4c9a] disabled:opacity-50"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Sending OTP...' : 'Continue'}
                        </button>
                        <div className="flex flex-col items-end pr-3 mt-4 hover:underline">
                            <Link to="/" className="text-[#875eff] font-semibold">
                                Sign in?
                            </Link>

                        </div>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleOtpSubmit}>
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                We have sent an OTP to your email <strong>{email}</strong>.
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                Time remaining: <strong>{formatTimer(timer)}</strong>
                            </p>
                            <label
                                className="text-l font-normal font-['Roboto'] leading-normal mb-2"
                                htmlFor="otp"
                            >
                                Enter the OTP sent to your email:
                            </label>
                            <input
                                type="text"
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                className={`shadow-md w-full h-[50px] rounded border bg-gray-100 px-3`}
                                placeholder="Enter OTP"
                            />
                        </div>
                        <button
                            className="w-full h-[60px] bg-[#875eff] text-white rounded-[10px] border-2 border-[#875eff] mb-4 mt-10 hover:bg-[#6d4c9a] disabled:opacity-50"
                            type="submit"
                            disabled={loading || timer === 0}
                        >
                            {loading ? 'Verifying OTP...' : 'Verify OTP'}
                        </button>
                        {timer === 0 && (
                            <button
                                className="w-full h-[50px] bg-gray-300 text-black rounded-[10px] border-2 border-gray-300 mb-4 hover:bg-gray-400"
                                type="button"
                                onClick={handleResendOtp}
                                disabled={!canResend || loading}
                            >
                                {loading ? 'Resending OTP...' : 'Resend OTP'}
                            </button>
                        )}
                    </form>
                )}

                {step === 'reset' && (
                    <form onSubmit={handleResetSubmit}>
                        <div>
                            <label
                                className="text-l font-normal font-['Roboto'] leading-normal mb-2"
                                htmlFor="newPassword"
                            >
                                Enter your new password:
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className={`shadow-md w-full h-[50px] rounded border bg-gray-100 px-3`}
                                placeholder="New Password"
                            />
                        </div>
                        <div className="mt-4">
                            <label
                                className="text-l font-normal font-['Roboto'] leading-normal mb-2"
                                htmlFor="confirmPassword"
                            >
                                Confirm your new password:
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={`shadow-md w-full h-[50px] rounded border bg-gray-100 px-3`}
                                placeholder="Confirm Password"
                            />
                        </div>
                        <button
                            className="w-full h-[60px] bg-[#875eff] text-white rounded-[10px] border-2 border-[#875eff] mb-4 mt-10 hover:bg-[#6d4c9a] disabled:opacity-50"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
            <div className="flex-1 flex items-center justify-center pr-10">
                <img src={loginimage} alt="loginImage" className="w-[696px] h-[784px]" />
            </div>

            {/* Loading message */}
            {loading && (
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-500 bg-opacity-50 flex items-center justify-center ">
                    <span className="text-white font-semibold text-xl">Loading...</span>
                </div>
            )}


        </section>


    );

};

export default ForgotPassword;
