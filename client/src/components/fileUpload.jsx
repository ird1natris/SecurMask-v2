import { apiUrl, escapeHtml } from '../utils/api.js';
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import FileDisplay from "../pages/FileDisplay";
import { useNavigate } from 'react-router-dom';
import DecryptionKeyModal from "./DecryptionKeyModal"; // Import the DecryptionKeyModal
import Swal from "sweetalert2";
import { FolderLock, FolderKey } from 'lucide-react';
import PasswordValidation from "./PasswordValidation"; // Assuming it's in the same directory
import { addFileToIndexedDB, getFilesFromIndexedDB } from "../utils/indexedDBUtils";
const FileUpload = ({ uploadedFiles, setUploadedFiles }) => {
    const navigate = useNavigate();
    const [parsedFileData, setParsedFileData] = useState(null); // State to store parsed file data
    const [isModalVisible, setIsModalVisible] = useState(false); // State to control modal visibility
    const [decryptionKey, setDecryptionKey] = useState("");  // State to store decryption key
    const [selectedFileId, setSelectedFileId] = useState(null);  // Store the file ID for unmasking
    const [showPasswordValidation, setShowPasswordValidation] = useState(false);
    const [columns, setColumns] = useState([])
    const [localFiles, setLocalFiles] = useState([]);
    const fileInputRef = useRef(null);

    // You can now use `localFiles` to display the files from IndexedDB in your component
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const files = await getFilesFromIndexedDB();
                setLocalFiles(files); // Update the state to reflect the fetched files
            } catch (error) {
                console.error("Error fetching files from IndexedDB:", error);
            }
        };

        fetchFiles();
    }, [uploadedFiles]);

    const extractFileContentAndSignature = async (file) => {
        const fileText = await file.text(); // Read the file as text

        // Split file content and signature using the marker '--DIGITAL-SIGNATURE--'
        const parts = fileText.split('\n\n--DIGITAL-SIGNATURE--\n');

        if (parts.length !== 2) {
            throw new Error('Invalid file format. Missing digital signature.');
        }

        const fileContent = parts[0]; // Content before the signature
        const signature = parts[1];  // The signature after the marker

        return { fileContent, signature };
    };

    const extractFileId = (fileName) => {
        // Use a regular expression to match the pattern "masked-file-{fileId}.csv" where fileId is a UUID
        const match = fileName.match(/masked-file-([a-f0-9-]+)\.csv/i);

        // If there's a match, return the captured fileId; otherwise, return null
        return match ? match[1] : null;
    };


    const parseCSV = (csvString) => {
        return new Promise((resolve, reject) => {
            Papa.parse(csvString, {
                complete: (result) => {
                    resolve(result.data); // Resolve with the parsed data
                },
                header: true, // Assuming the first row contains column headers
                skipEmptyLines: true, // Skip empty lines
            });
        });
    };

    const unmaskFile = async (fileId) => {

        try {
            const response = await axios.post(apiUrl('/file'), {

                decryptionKey,
                fileId,

            }, { withCredentials: true });

            const encryptedCSV = response.data.content;

            if (encryptedCSV) {
                const parsedData = await parseCSV(encryptedCSV);
                setParsedFileData(parsedData);
                // Navigate to the FileDisplay page after the file is successfully unmasked
                navigate("/display", { state: { fileData: parsedData } });
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "File unmasked successfully!",
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Unmasking Failed",
                    text: "Decrypted content is empty or invalid.",
                });
            }
        } catch (error) {
            console.error("Error decrypting file content:", error);
            if (error.response && error.response.data && error.response.data.message) {
                // If there is a custom error message from the server, display it
                Swal.fire({
                    icon: "error",
                    title: "Unmasking Failed",
                    text: error.response.data.message, // Display the backend error message
                });
            } else {
                // If the error doesn't have a response or message, show a generic error
                Swal.fire({
                    icon: "error",
                    title: "Unmasking Failed",
                    text: "An unknown error occurred during the unmasking process.",
                });
            }
        }
    };
    const validateFiletype = (file) => {
        const validTypes = ['application/vnd.ms-excel', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const fileType = file.type;

        if (!validTypes.includes(fileType)) {
            alert("Invalid file type. Please upload a CSV or XLSX file.");
            return false;
        }
        return true;
    };
    const handleMaskUpload = async (event) => {
        const selectedFiles = Array.from(event.target.files);

        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        // Validate each selected file
        for (const file of selectedFiles) {
            if (file.size > MAX_FILE_SIZE) {
                Swal.fire({
                    icon: "error",
                    title: "File Too Large",
                    text: `The file "${file.name}" exceeds the 5 MB size limit. Please upload a smaller file.`,
                });
                return; // Stop if any file exceeds the size limit
            }

            if (!validateFiletype(file)) {
                return; // Stop if any file is invalid
            }
        }

        // Before proceeding to password validation, detect columns
        const formData = new FormData();
        formData.append('file', selectedFiles[0]); // Only send the first file for column detection
        Swal.fire({
            title: 'Detecting Columns...',
            text: 'We are processing your file. It might take a while...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
            const response = await fetch(apiUrl('/detect_columns'), {
        credentials: 'include',
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            Swal.close();
            if (data.columns) {
                // Set the detected columns
                setColumns(data.columns);

                // Create an HTML table from the detected columns
                const tableHTML = `
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 3px;">Column Index</th>
                                <th style="border: 1px solid #ddd; padding: 3px;">Column Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.columns
                        .map(
                            (column, index) => `
                                    <tr>
                                        <td style="border: 1px solid #ddd; padding: 3px;">${index + 1}</td>
                                        <td style="border: 1px solid #ddd; padding: 3px;">${escapeHtml(column)}</td>
                                    </tr>
                                `
                        )
                        .join("")}
                        </tbody>
                    </table>
                `;

                // Show the table in the SweetAlert2 modal
                Swal.fire({
                    icon: "success",
                    title: "Detected Columns",
                    html: tableHTML, // Use the HTML property to display the table
                    confirmButtonText: "OK",
                }).then(() => {
                    // Once the SweetAlert modal is closed, show the password validation
                    setShowPasswordValidation(true); // Now this should trigger the password validation modal
                });

            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.error || "Failed to detect columns.",
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error detecting columns.",
            });
        }


    };
    // Add `uploadedFiles` to the dependency array


    const handleValidPassword = (password) => {
        setDecryptionKey(password);  // Set the decryption key after validation
        setShowPasswordValidation(false);  // Hide the password validation form


        // Proceed with the file upload
        const uploadFiles = async () => {
            const selectedFiles = Array.from(document.querySelector('input[type="file"]').files);

            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('key', password);

                try {
                    const response = await axios.post(apiUrl('/upload'), formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        withCredentials: true,
                    });

                    const { fileId, fileName } = response.data;


                    Swal.fire({
                        icon: "success",
                        title: "Upload Completed",
                        text: `${fileName} has been uploaded successfully! Note that your file that has not been mask will be remove in 1 hour time. Navigate to folders to view you file`,
                    });
                    const fileData = {
                        id: fileId,
                        name: fileName,
                        status: 'unmask',
                        fileObject: file,
                        uploadedAt: new Date().toISOString(),
                        columns: columns,
                    };

                    const localFileId = await addFileToIndexedDB(fileData);
                    const newFile = { ...fileData, id: localFileId };

                    setUploadedFiles((prevFiles) => [...prevFiles, newFile]);

                    const updatedFiles = await getFilesFromIndexedDB();
                    setLocalFiles(updatedFiles);
                    setUploadedFiles(updatedFiles);
                } catch (error) {
                    console.error("Error uploading file:", error.response?.data || error.message);
                    const errorMessage = error.response?.data?.message || "Error uploading file";
                    Swal.fire({
                        icon: "error",
                        title: "Upload Error",
                        text: `Failed to upload ${file.name}: ${errorMessage}`, // Include the error message here
                    });
                }
            }
        };

        uploadFiles();
        //navigate("/folder", { state: { localFiles } });


        // Start uploading the files after the password is validated
    };




    const handleUnMaskUpload = async (event) => {
        const selectedFiles = Array.from(event.target.files);
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        // Validate each selected file
        for (const file of selectedFiles) {
            if (file.size > MAX_FILE_SIZE) {
                Swal.fire({
                    icon: "error",
                    title: "File Too Large",
                    text: `The file "${file.name}" exceeds the 5 MB size limit. Please upload a smaller file.`,
                });
                return; // Stop if any file exceeds the size limit
            }

            if (!validateFiletype(file)) {
                return; // Stop if any file is invalid
            }
        }
        for (const file of selectedFiles) {
            try {
                const { fileContent, signature: extractedSignature } = await extractFileContentAndSignature(file);
                const fileId = extractFileId(file.name);

                if (!fileId) {
                    Swal.fire({
                        icon: "error",
                        title: "Invalid File",
                        text: `The file ${file.name} is invalid. Unable to extract file ID.`,
                        confirmButtonText: "OK",
                    });
                    continue;
                }



                const response = await fetch(apiUrl('/verify-signature'), {
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileContent, signature: extractedSignature, fileId }),
                });

                const result = await response.json();

                if (response.ok && result.isValid) {
                    setSelectedFileId(fileId);  // Store the file ID
                    setIsModalVisible(true);  // Show the modal to ask for decryption key
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "File Verification Failed",
                        text: `The file ${file.name} failed verification: ${result.message}`,
                        confirmButtonText: "OK",
                    });

                }
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
            }
        }

    };

    const handleDecryptionKeySubmit = (key) => {
        setDecryptionKey(key);  // Set the decryption key
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);  // Close the modal without submitting
    };


    // Using useEffect to trigger the unmasking when the decryptionKey and fileId are set
    useEffect(() => {
        if (decryptionKey && selectedFileId) {
            unmaskFile(selectedFileId);  // Call the unmaskFile function when the decryption key and file ID are available
        }
    }, [decryptionKey, selectedFileId]);  // Dependency array ensures this effect runs when either decryptionKey or selectedFileId changes

    return (
        <section>
            <div
                className="flex justify-center items-start mx-auto my-auto relative pt-10 mt-20"
                style={{
                    width: '395.5px',
                    height: '314.895px',
                    flexShrink: 0,
                    border: '1.075px solid #BB93EF',
                    backgroundColor: '#332C81',
                }}
            >
                <FolderLock size={68} color="#FFFFFF" />

                <div
                    className="absolute bottom-0 left-0"
                    style={{
                        width: '100%',
                        height: '55%',
                        backgroundColor: '#EEEDED',
                        border: '0.54px solid #787575',
                    }}
                >
                    <div className="w-[319.19px] h-[49.44px] text-center text-black text-[21.49px] font-bold font-['Roboto'] pt-4 pl-20 mb-10"
                    >
                        Upload .csv or .xlsx file to mask your data
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef} // Attach the ref to the input
                        multiple
                        accept="csv,xlsx"
                        onChange={handleMaskUpload} // Call handleFileUpload directly
                        className="mb-4 "
                        style={{
                            padding: '10px 80px', // Optional: Add some padding for aesthetics
                            cursor: 'pointer', // Add a pointer cursor for better UX
                        }}
                    />
                </div>
            </div>

            <div
                className="flex justify-center items-start mx-auto my-auto relative mt-8 mb-10 pt-10"
                style={{
                    width: '395.5px',
                    height: '314.895px',
                    flexShrink: 0,
                    border: '1.075px solid #BB93EF',
                    backgroundColor: '#332C81',
                }}
            >
                <FolderKey size={68} color="#FFFFFF" />
                <div
                    className="absolute bottom-0 left-0"
                    style={{
                        width: '100%',
                        height: '55%',
                        backgroundColor: '#EEEDED',
                        border: '0.54px solid #787575',
                    }}
                >
                    <div className="w-[319.19px] text-center text-black text-[21.49px] font-bold font-['Roboto'] pt-4 pl-20 flex justify-center items-center"
                        style={{
                            marginBottom: '10px', // Add some spacing between text and input
                        }}>
                        Upload .csv or .xlsx file to unmask your data
                    </div>
                    <input
                        type="file"
                        multiple
                        accept="csv,xlsx"
                        onChange={handleUnMaskUpload} // Call handleFileUpload directly
                        className="mb-4 "
                        style={{
                            padding: '10px 80px', // Optional: Add some padding for aesthetics
                            cursor: 'pointer', // Add a pointer cursor for better UX
                        }}
                    />
                </div>
            </div>

            {/* Display the parsed data from FileDisplay component */}
            {parsedFileData && <FileDisplay displayedFileData={parsedFileData} />}
            {showPasswordValidation && (
                <PasswordValidation
                    onValidPassword={handleValidPassword} // Handle the password validation submit
                    onClose={() => setShowPasswordValidation(false)} // Optionally handle cancel
                />
            )}
            {/* DecryptionKeyModal */}
            <DecryptionKeyModal
                isOpen={isModalVisible}
                onSubmit={handleDecryptionKeySubmit}
                onClose={handleCloseModal}
            />
        </section>
    );
};

export default FileUpload;
