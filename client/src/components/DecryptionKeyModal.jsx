import { apiUrl } from '../utils/api.js';
import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Eye, EyeOff } from "lucide-react"; // Import icons from Lucide React

const DecryptionKeyModal = ({ isOpen, onSubmit, onClose }) => {
    const [decryptionKey, setDecryptionKey] = useState("");
    const [keyError, setKeyError] = useState("");
    const [captchaValue, setCaptchaValue] = useState(null); // Store the captcha response
    const [captchaError, setCaptchaError] = useState(""); // Store error related to captcha
    const [showPassword, setShowPassword] = useState(false); // Toggle for password visibility

    const handleSubmit = async () => {
        if (!decryptionKey) {
            setKeyError("Decryption key is required.");
            return;
        }

        if (!captchaValue) {
            setCaptchaError("Please complete the CAPTCHA.");
            return;
        }

        try {
            const response = await fetch(apiUrl('/verify-captcha'), {
                credentials: "include",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    captchaValue, // Send the captcha token
                }),
            });

            const data = await response.json();

            if (data.success) {
                // CAPTCHA verification successful
                onSubmit(decryptionKey);
                setDecryptionKey("");
                setCaptchaValue(null);
            } else {
                setCaptchaError("CAPTCHA verification failed.");
            }
        } catch (error) {
            console.error("Error verifying CAPTCHA:", error);
            setCaptchaError("An error occurred during CAPTCHA verification.");
        }
    };

    const handleCaptchaChange = (value) => {
        setCaptchaValue(value);
        setCaptchaError(""); // Clear error once user interacts with CAPTCHA
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg relative">
                <h2 className="text-xl font-semibold text-center mb-4">Enter Decryption Key</h2>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={decryptionKey}
                        onChange={(e) => {
                            setDecryptionKey(e.target.value);
                            setKeyError(""); // Clear error on input change
                        }}
                        placeholder="Enter your decryption key"
                        className="w-full p-2 border border-gray-300 rounded-md mb-2"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-2 flex items-center p-4 text-gray-500 hover:text-gray-700"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {keyError && <p className="text-red-500 text-sm mb-2">{keyError}</p>}

                {/* CAPTCHA */}
                <div className="my-4">
                    {import.meta.env.VITE_RECAPTCHA_SITE_KEY ? <ReCAPTCHA
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ""}
                        onChange={handleCaptchaChange}
                        onExpired={() => setCaptchaValue(null)}
                    /> : <p className="text-red-500">Verification is unavailable. Please contact the administrator.</p>}
                    {captchaError && <p className="text-red-500 text-sm mt-2">{captchaError}</p>}
                </div>

                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DecryptionKeyModal;
