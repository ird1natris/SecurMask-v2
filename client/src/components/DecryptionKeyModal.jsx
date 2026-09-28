import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // Import icons from Lucide React

const DecryptionKeyModal = ({ isOpen, onSubmit, onClose }) => {
    const [decryptionKey, setDecryptionKey] = useState("");
    const [keyError, setKeyError] = useState("");
    const [showPassword, setShowPassword] = useState(false); // Toggle for password visibility

    const handleSubmit = async () => {
        if (!decryptionKey) {
            setKeyError("Decryption key is required.");
            return;
        }

        await onSubmit(decryptionKey);
        setDecryptionKey("");
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
