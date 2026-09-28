import React, { useState, useEffect } from "react";
import { CircleX } from "lucide-react";
import { fetchFile } from "../utils/indexedDBUtils";
import axios from "axios";
import FileContent from "./FileContent";
import DecryptionKeyModal from "./DecryptionKeyModal";
import Swal from "sweetalert2";

const DefaultMaskBuilder = ({ isOpen, onClose, fileId, onMaskedUpdate, HandleMaskedFile }) => {
    const [isChecked, setIsChecked] = useState({});
    const [columnsToMask, setColumnsToMask] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [maskedContent, setMaskedContent] = useState(null);
    const [fileName, setFileName] = useState("");
    const [localColumns, setLocalColumns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDecryptionModal, setShowDecryptionModal] = useState(false);

    // Fetch columns from IndexedDB on mount
    useEffect(() => {
        const fetchColumns = async () => {
            try {
                setIsLoading(true);
                const fileData = await fetchFile(fileId);
                setFileName(fileData.fileName);

                // Assume fileData.content contains the columns array
                const columns = fileData.columns || [];
                console.log("Fetched columns:", columns);
                if (!Array.isArray(columns)) {
                    throw new Error("Invalid column data in the file.");
                }

                setLocalColumns(columns); // State update
                console.log("Set columns successfully"); // Log for debugging
                setError(null);
            } catch (err) {
                console.error("Error fetching columns from IndexedDB:", err);
                setError("Failed to load columns. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        if (fileId) {
            fetchColumns();
        }
    }, [fileId]);



    useEffect(() => {
        const selectedColumns = Object.keys(isChecked).filter((key) => isChecked[key]);
        setColumnsToMask(selectedColumns);
    }, [isChecked]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleCheckedChange = (key) => (e) => {
        setIsChecked((prev) => ({
            ...prev,
            [key]: e.target.checked,
        }));
    };

    const handleSelectAll = () => {
        const newSelectAll = !selectAll;
        setSelectAll(newSelectAll);
        const newCheckedState = {};
        localColumns.forEach((column) => {
            newCheckedState[column] = newSelectAll;
        });
        setIsChecked(newCheckedState);
    };

    const handleRunClick = async (decryptionKey) => {
        try {
            console.log("Columns to mask:", columnsToMask);

            // Step 1: Fetch the file from IndexedDB
            
            const response = await axios.post("http://localhost:8081/mask", {
                fileId,
                key: decryptionKey,
                columnsToMask,
                
            }, { withCredentials: true });

            if (!response.data || !response.data.content) {
                throw new Error("No masked content returned from the server.");
            }

            const maskedContent = response.data.content;
            setMaskedContent(maskedContent);
            HandleMaskedFile(fileId, maskedContent);
            onMaskedUpdate(fileId, maskedContent);

            Swal.fire({
                icon: "success",
                title: "Masking Completed",
                text: "The masking process has been completed successfully.",
            });

            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "An unknown error occurred during the masking process.";
            Swal.fire({
                icon: "error",
                title: "Masking Failed",
                text: errorMessage,
            });
        }
    };

    if (isLoading) {
        return <div>Loading columns...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    const leftColumns = localColumns.slice(0, Math.ceil(localColumns.length / 2));
    const rightColumns = localColumns.slice(Math.ceil(localColumns.length / 2));

    return (
        <div>
            {isOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
                    onClick={handleOverlayClick}
                >
                    <div className="relative bg-white rounded-lg shadow-lg w-[700px] h-[580px] overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4 text-center mt-4">Mask Builder</h3>
                        <h2 className="text-black text-base font-medium mb-6 ml-6">
                            Choose attributes that you wish to mask
                        </h2>

                        <div className="checkbox-list pl-8">
                            <h3>Select columns to mask:</h3>
                            <div className="checkbox-item mb-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="select-all"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                />
                                <label htmlFor="select-all">Select All</label>
                            </div>

                            <div className="grid grid-cols-2 gap-1 px-4">
                                <div>
                                    {leftColumns.map((column) => (
                                        <div key={column} className="checkbox-item mb-2">
                                            <input
                                                type="checkbox"
                                                id={column}
                                                checked={isChecked[column] || false}
                                                onChange={handleCheckedChange(column)}
                                            />
                                            <label htmlFor={column}>{column}</label>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    {rightColumns.map((column) => (
                                        <div key={column} className="checkbox-item mb-2">
                                            <input
                                                type="checkbox"
                                                id={column}
                                                checked={isChecked[column] || false}
                                                onChange={handleCheckedChange(column)}
                                            />
                                            <label htmlFor={column}>{column}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <CircleX
                            color="red"
                            className="absolute top-4 right-4 cursor-pointer"
                            onClick={onClose}
                        />
                        <button
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 mb-2 mt-2 absolute bottom-4 right-8 cursor-pointer"
                            onClick={() => setShowDecryptionModal(true)}
                        >
                            Run
                        </button>
                    </div>
                </div>
            )}

            

            <DecryptionKeyModal
                isOpen={showDecryptionModal}
                onSubmit={(key) => {
                    handleRunClick(key);
                    setShowDecryptionModal(false);
                }}
                onClose={() => setShowDecryptionModal(false)}
            />
        </div>
    );
};

export default DefaultMaskBuilder;
