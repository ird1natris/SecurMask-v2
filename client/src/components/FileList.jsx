import { apiUrl, escapeHtml } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import axios from 'axios';
import PasswordValidation from './PasswordValidation';  // Import PasswordValidation component
import { addFileToIndexedDB, getFilesFromIndexedDB, deleteFileFromIndexedDB, updateFileWithMaskedContent, fetchFile } from "../utils/indexedDBUtils";
import Swal from "sweetalert2";
import ExcelJS from 'exceljs';


const FileList = ({ uploadedFiles, setUploadedFiles, onTab, onDelete, newTab }) => {
  const [localFiles, setLocalFiles] = useState([]);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [decryptionKey, setDecryptionKey] = useState('');
  const [columns, setColumns] = useState([]);





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



  // Function to validate file type (CSV, XLSX)
  const validateFiletype = (file) => {
    const validTypes = ['application/vnd.ms-excel', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const fileType = file.type;

    if (!validTypes.includes(fileType)) {
      alert("Invalid file type. Please upload a CSV or XLSX file.");
      return false;
    }
    return true;
  };


  const handleFileUpload = async (event) => {
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

    // Show loading message while detecting columns
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
        });

        // Proceed with showing the password validation form
        setShowPasswordValidation(true); // Show password validation component when files are selected
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
            text: `${fileName} has been uploaded successfully. Note that your file that has not been mask will be remove in 1 hour time`,
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

    uploadFiles();  // Start uploading the files after the password is validated
  };


  const handleViewFile = async (file) => {
    try {
      if (file.status === 'mask') {
        const updatedFile = await fetchFile(file.id);

        if (updatedFile?.content) {
          Papa.parse(updatedFile.content, {
            header: true,
            complete: (results) => {
              onTab(file.name, results.data, file.id, onMaskedUpdate, file.status, columns);
            },
          });
        } else {
          alert("Masked file content is not available.");
        }
      } else if (file.fileObject) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension === 'csv') {
          // Process CSV files
          const reader = new FileReader();
          reader.onload = (e) => {
            Papa.parse(e.target.result, {
              header: true,
              complete: (results) => {
                //console.log("Parsed unmasked data for file:", file.id, results.data);
                onTab(file.name, results.data, file.id, onMaskedUpdate, file.status, columns);
              },
            });
          };
          reader.readAsText(file.fileObject);
        } else if (fileExtension === 'xlsx') {
          // Process Excel files
          const reader = new FileReader();
          reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);  // Load the Excel data into the workbook

            const sheet = workbook.worksheets[0];
            const headers = [];
            const jsonData = [];

            // Extract headers from the first row
            sheet.getRow(1).eachCell((cell, colNumber) => {
              headers.push(cell.text.trim()); // Collect header names
            });

            // Loop through rows and map data to headers
            sheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) { // Skip the header row
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                  let cellValue = cell.text;

                  // Check if the cell contains a date and format it
                  if (cell.type === ExcelJS.ValueType.Date) {
                    const formattedDate = formatDate(cell.value);
                    rowData[headers[colNumber - 1]] = formattedDate; // Use header for key
                  } else {
                    rowData[headers[colNumber - 1]] = cellValue;
                  }
                });
                jsonData.push(rowData);
              }
            });

            //console.log("Parsed Excel data for file:", file.id, jsonData);
            onTab(file.name, jsonData, file.id, onMaskedUpdate, file.status, columns);
          };
          reader.readAsArrayBuffer(file.fileObject);
        } else {
          alert("Unsupported file type.");
        }
      } else {
        alert("Original file data is not available.");
      }
    } catch (error) {
      console.error("Error retrieving file content:", error);
      alert("Failed to retrieve file content.");
    }
  };

  // Helper function to format the date in dd/mm/yy format
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const year = String(d.getFullYear()).slice(-2); // Get the last two digits of the year
    return `${day}/${month}/${year}`;
  };





  const onMaskedUpdate = async (fileId, maskedContent) => {
    try {
      await updateFileWithMaskedContent(fileId, maskedContent);
      const updatedFiles = await getFilesFromIndexedDB();
      setLocalFiles(updatedFiles);
      setUploadedFiles(updatedFiles);
    } catch (error) {
      console.error('Error updating masked file:', error);
    }
  };

  const handleDeleteCell = async (file) => {
    try {
      // Send a request to the backend to delete the file from the database
      const response = await fetch(apiUrl('/deleteFile'), {
        credentials: 'include',
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: file.id }), // Send the file ID to the backend
      });

      const result = await response.json();

      if (response.ok) {
        // Remove the file from IndexedDB
        await deleteFileFromIndexedDB(file.id);

        // Update the local state
        const updatedFiles = localFiles.filter((f) => f.id !== file.id);
        setLocalFiles(updatedFiles);
        setUploadedFiles(updatedFiles);

        // Notify user about the successful deletion
        Swal.fire({
          icon: "success",
          title: "File Deleted",
          text: `The file "${file.name}" has been successfully deleted.`,
          confirmButtonText: "OK",
        });

        // Trigger the delete callback
        onDelete(file.name);
      } else {
        // Handle server-side errors
        Swal.fire({
          icon: "error",
          title: "Failed to Delete",
          text: result.message || "An error occurred while deleting the file.",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      // Handle client-side errors
      console.error("Error deleting file:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete the file. Please try again later.",
        confirmButtonText: "OK",
      });
    }
  };


  // Close PasswordValidation component
  const handleClosePasswordValidation = () => {
    setShowPasswordValidation(false);
  };

  return (
    <div className="text-center p-20">
      <div className="mb-4 flex items-center justify-center">
        <label htmlFor="fileInput" className="mr-4 text-black font-bold">Select file to mask:</label>
        <input
          id="fileInput"
          type="file"
          accept="csv,xlsx"
          multiple
          onChange={handleFileUpload}
          className="p-2 "
        />
      </div>
      {showPasswordValidation && <PasswordValidation onValidPassword={handleValidPassword} onClose={handleClosePasswordValidation} />}
      <table className="w-full mt-20px border-collapse">
        <thead>
          <tr>
            <th className="bg-[#c98efb] text-black font-bold p-15 text-center border-2 border-white-300">No.</th>
            <th className="bg-[#c98efb] text-black font-bold p-15 text-center border-2 border-white-300">Id</th>
            <th className="bg-[#c98efb] text-black font-bold p-15 text-center border-2 border-white-300">File Name</th>
            <th className="bg-[#c98efb] text-black font-bold p-15 text-center border-2 border-white-300">Status</th>
            <th className="bg-[#c98efb] text-black font-bold p-15 text-center border-2 border-white-300">Action</th>
          </tr>
        </thead>
        <tbody>
          {localFiles.map((file, index) => (
            <tr key={file.id} className="bg-[#e3dee5]"><td className="p-15 text-center text-black border-2 border-white-300">{index + 1}</td><td className="p-15 text-center text-black border-2 border-white-300">{file.id}</td><td className="p-15 text-center text-black border-2 border-white-300">{file.name}</td><td className="p-15 text-center text-black border-2 border-white-300">{file.status}</td><td className="p-15 text-center text-black border-2 border-white-300">
              <div className="flex space-x-7 items-center justify-center">
                <SquareArrowOutUpRight onClick={() => handleViewFile(file)} color="blue" />
                <Trash2 onClick={() => handleDeleteCell(file)} color="red" />
              </div>
            </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;
