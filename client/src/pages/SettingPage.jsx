import { cacheKey } from '../utils/indexedDBUtils';
import { apiUrl } from '../utils/api.js';
import React, { useEffect, useState } from "react";
import Sidebar from '../components/sideBar'; // Ensure correct import
import Navbar from '../components/Navbar'; // Ensure correct import
import { people01, backgroundImage } from '../assets';
import axios from 'axios';
const SettingsPage = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState("profile");
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [profileImage, setProfileImage] = useState(people01);
    const [userInfo, setUserInfo] = useState({
        name: "",
        email: "",
        phone: "",
        job: "",

    });
    const [otpSent, setOtpSent] = useState(false); // Define otpSent state
    const [timer, setTimer] = useState(0); // Timer state
    const [canResend, setCanResend] = useState(false); // Resend OTP state
    const [loading, setLoading] = useState(false); // Loading state
    const [error, setError] = useState(''); // Error state
    const [message, setMessage] = useState(''); // Message state
    const [email, setEmail] = useState(''); // Email state
    const [otp, setOtp] = useState(''); // OTP state
    const [step, setStep] = useState('send'); // Step state (send OTP or reset password)
    const [otpVerified, setOtpVerified] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    // Timer countdown for OTP expiration

    useEffect(() => {
        let interval = null;
        if (otpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true); // Allow resending OTP
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [otpSent, timer]);

    // Format timer as MM:SS
    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle sending OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(apiUrl('/forgot-password'), { email });
            if (response.data.Status) {
                setMessage('OTP has been sent to your email.');
                setOtpSent(true); // Mark OTP as sent
                setTimer(300); // Reset timer to 10 minutes
                setCanResend(false); // Disable resend initially
            } else if (response.data.Error) {
                setError(response.data.Error);
            }
        } catch (err) {
            console.error("Error sending OTP:", err);

            // Handle rate limiting error (429)
            if (err.response && err.response.status === 429) {
                setError(err.response.data.Error || 'Too many attempts, please try again later after 15 minutes.');
            } else if (err.response && err.response.data && err.response.data.Error) {
                setError(err.response.data.Error);
            } else {
                setError('An error occurred while sending OTP. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };


    // Handle OTP verification
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(apiUrl('/verify-otp'), { email, otp });
            if (response.data.Status) {
                setOtpVerified(true);
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
    const handleSubmitNewPassword = async () => {


        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setError(
                "Password must be at least 8 characters long, include at least one special character, one number, one lowercase letter, and one uppercase letter."
            );
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            // API request to update password 
            const response = await axios.post(apiUrl('/reset-password'), {
                email,
                newPassword,
                otp,
            });

            if (response.data.success) {
                setMessage("Password updated successfully");
                setOtpVerified(false);
                // Reset all state variables to initial state
                setEmail('');
                setOtp('');
                setOtpSent(false);
                setNewPassword('');
                setConfirmPassword(''); // Reset OTP verification process
                setError('');
            } else {
                setError(response.data.Error || "Failed to update password");
            }
        } catch (error) {


            //handle the error response
            if (error.response && error.response.data && error.response.data.Error) {
                setError(error.response.data.Error);
            } else {
                setError("An error occurred while updating the password, please try again.");
            }
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        const savedUserInfo = localStorage.getItem(cacheKey('userInfo'));
        const savedProfileImage = localStorage.getItem(cacheKey('profileImage'));
        if (savedUserInfo) {
            setUserInfo(JSON.parse(savedUserInfo));

        }
        if (savedProfileImage) {
            setProfileImage(savedProfileImage);
        }
    }, []);
    const [isUpdate, setIsUpdate] = useState(false);

    const handleToggleSidebar = (expanded) => {
        setSidebarExpanded(expanded);
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
                localStorage.setItem(cacheKey('profileImage'), reader.result);// Set the new image as the profile image
            };
            reader.readAsDataURL(file); // Read the file as a data URL (base64)
        }
    };
    const handleSave = () => {
        setIsUpdate(false);
    }
    const handleUserProfileInput = (e) => {
        const { name, value } = e.target;
        setUserInfo((prev) => {
            const updatedUserInfo = { ...prev, [name]: value };
            localStorage.setItem(cacheKey('userInfo'), JSON.stringify(updatedUserInfo));
            return updatedUserInfo;
        })
    }

    const maskData = (value, type) => {
        if (!value) return "Not set"; // Default if no value exists

        if (type === "email") {
            const [localPart, domain] = value.split("@");
            const maskedLocal = localPart.slice(0, 2) + "*".repeat(Math.max(0, localPart.length - 2));
            return `${maskedLocal}@${domain}`;
        }

        if (type === "phone") {
            return value.replace(/.(?=.{4})/g, "*"); // Mask all except the last 4 digits
        }

        if (type === "name") {
            return value.charAt(0) + "*".repeat(Math.max(0, value.length - 1)); // Show only the first letter
        }

        return value; // For other fields, return as is
    };
    const handleEdit = () => {
        setIsUpdate(true); // Enable edit mode
        setUserInfo({
            name: maskData(userInfo.name, "name"),
            email: maskData(userInfo.email, "email"),
            phone: maskData(userInfo.phone, "phone"),
            job: userInfo.job, // No masking for job
        });
    };



    return (
        <div className="flex h-screen overflow-hidden bg-[#f4f4f4] w-full"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}>
            <div className={`transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-20'}`}>
                <Sidebar onToggle={handleToggleSidebar} expanded={sidebarExpanded} onLogout={onLogout} />
            </div>
            <div className="flex-1 flex flex-col">
                <div
                    className={`fixed top-0 left-0 w-full z-10 bg-primary transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}
                    style={{ width: `calc(100% - ${sidebarExpanded ? '16rem' : '5rem'})` }}
                >
                    <Navbar />

                </div>
                <div className="justify-center items-center h-[600px] mt-10 bg-white rounded-lg shadow-md mt-40 ml-20 mr-10">
                    <div className="flex">
                        <div className="w-1/4 h-[600px] bg-gray-100 p-4">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`tab w-full text-left px-4 py-2 font-semibold ${activeTab === "profile"
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-gray-600"
                                    }`}
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => setActiveTab("security")}
                                className={`tab w-full text-left px-4 py-2 font-semibold ${activeTab === "security"
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-gray-600"
                                    }`}
                            >
                                Security
                            </button>

                            <button
                                onClick={() => setActiveTab("logout")}
                                className={`tab w-full text-left px-4 py-2 font-semibold ${activeTab === "logout"
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-gray-600"
                                    }`}
                            >
                                Logout
                            </button>
                        </div>

                        <div className="w-3/4 p-6">
                            {activeTab === "profile" && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Profile</h2>
                                    <div className="flex items-center mb-4">
                                        <img
                                            src={profileImage}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full"
                                        // Trigger file input click
                                        />
                                        <input
                                            type="file"
                                            id="fileInput"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange} // Handle file selection
                                        />
                                        <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600" onClick={() => document.getElementById("fileInput").click()} >
                                            Change Picture
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                                            {isUpdate ? (
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={userInfo.name}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Name"
                                                />
                                            ) : (
                                                <p>{maskData(userInfo.name, "name")}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                            {isUpdate ? (
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={userInfo.email}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Email"
                                                />
                                            ) : (
                                                <p>{maskData(userInfo.email, "email")}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                                            {isUpdate ? (
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={userInfo.phone}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Phone"
                                                />
                                            ) : (
                                                <p>{maskData(userInfo.phone, "phone")}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Job</label>
                                            {isUpdate ? (
                                                <input
                                                    type="text"
                                                    name="job"
                                                    value={userInfo.job}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Job"
                                                />
                                            ) : (
                                                <p>{userInfo.job || "Not set"}</p>
                                            )}
                                        </div>
                                        <div>
                                            {!isUpdate ? (
                                                <button onClick={handleEdit} className="px-4 py-2 bg-blue-500 text-white rounded">
                                                    Edit
                                                </button>
                                            ) : (
                                                <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded">
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>


                                </div>
                            )}

                            {activeTab === "security" && (
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-poppins font-semibold mb-3">Security</h2>

                                    {/* Display Success or Error Messages */}
                                    {message && <p className="text-green-600 mb-4">{message}</p>}
                                    {error && <p className="text-red-600 mb-4">{error}</p>}

                                    {/* Email Field (only show if OTP is not sent) */}
                                    {!otpSent && !otpVerified && (
                                        <div>
                                            <label className="text-l font-normal font-['Roboto'] leading-normal mb-2" htmlFor="email">
                                                Enter your email address to update new password:
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full px-3 py-2 border rounded"
                                                placeholder="you@example.com"
                                            />
                                        </div>
                                    )}

                                    {/* Send OTP Button (only show if OTP is not sent) */}
                                    {!otpSent && !otpVerified && (
                                        <button
                                            className="w-[200px] h-[40px] bg-[#875eff] text-white rounded-[10px] border-2 border-[#875eff] mb-4 mt-10 hover:bg-[#6d4c9a] disabled:opacity-50"
                                            onClick={handleSendOtp}
                                            disabled={loading}
                                        >
                                            {loading ? 'Sending OTP...' : 'Send OTP'}
                                        </button>
                                    )}

                                    {/* OTP Input Fields & Verify OTP Button (only show if OTP is sent but not verified) */}
                                    {otpSent && !otpVerified && (
                                        <div>
                                            {/* OTP Input Field */}
                                            <div>
                                                <label className="text-l font-normal font-['Roboto'] leading-normal mb-5" htmlFor="otp">
                                                    Enter the OTP sent to your email:
                                                </label>
                                                <input
                                                    type="text"
                                                    id="otp"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)} // Handle OTP input
                                                    required
                                                    className="shadow-md w-full h-[50px] rounded border bg-gray-100 px-3"
                                                    placeholder="Enter OTP"
                                                />
                                            </div>

                                            {/* OTP Timer */}
                                            <div className="text-sm text-gray-600 mb-4">
                                                {timer > 0 ? (
                                                    <p>Time remaining: {formatTimer(timer)}</p>
                                                ) : (
                                                    <button
                                                        className="text-blue-500 hover:underline"
                                                        onClick={handleResendOtp}
                                                        disabled={!canResend || loading}
                                                    >
                                                        Resend OTP
                                                    </button>
                                                )}
                                            </div>

                                            {/* Verify OTP Button */}
                                            <button
                                                className="w-full h-[60px] bg-green-500 text-white rounded-[10px] border-2 border-green-500 mb-4 mt-10 hover:bg-green-600"
                                                onClick={handleVerifyOtp}
                                                disabled={timer === 0 || loading} // Disable Verify OTP if timer expired or loading
                                            >
                                                {loading ? 'Verifying OTP...' : 'Verify OTP'}
                                            </button>
                                        </div>
                                    )}

                                    {/* New Password Fields After OTP Verification */}
                                    {otpVerified && (
                                        <div>
                                            <div>
                                                <label className="text-l font-normal font-['Roboto'] leading-normal mb-2" htmlFor="new-password">
                                                    Enter New Password:
                                                </label>
                                                <input
                                                    type="password"
                                                    id="new-password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)} // Handle new password input
                                                    required
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Enter new password"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-l font-normal font-['Roboto'] leading-normal mb-2" htmlFor="confirm-password">
                                                    Confirm New Password:
                                                </label>
                                                <input
                                                    type="password"
                                                    id="confirm-password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)} // Handle confirm password input
                                                    required
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Confirm new password"
                                                />
                                            </div>

                                            {/* Submit New Password Button */}
                                            <button
                                                className="w-full h-[60px] bg-blue-500 text-white rounded-[10px] border-2 border-blue-500 mb-4 mt-10 hover:bg-blue-600"
                                                onClick={handleSubmitNewPassword} // Call the function to submit the new password
                                                disabled={loading || newPassword !== confirmPassword} // Disable if passwords don't match
                                            >
                                                {loading ? 'Updating Password...' : 'Update Password'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}


                            {activeTab === "logout" && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Logout</h2>
                                    <p className="text-gray-600 mb-4">Are you sure you want to log out?</p>
                                    <button className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600 " onClick={() => onLogout()}>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>

    );
};

export default SettingsPage;
