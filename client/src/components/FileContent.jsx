import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { RefreshCcw, Save, Download } from 'lucide-react';
import DefaultMaskBuilder from './DefaultMaskBuilder';

const FileContent = ({ fileName, fileData, fileId, onMaskedUpdate, columns }) => {
  const [isDefaultMaskBuilderOpen, setDefaultMaskBuilderOpen] = useState(false);
  const [displayedFileData, setDisplayedFileData] = useState([]);

  useEffect(() => {
    // Check session storage for existing masked data
    const storedData = sessionStorage.getItem(`fileData-${fileId}`);
    if (storedData) {
      setDisplayedFileData(JSON.parse(storedData));
    } else if (Array.isArray(fileData)) {
      setDisplayedFileData(fileData); // Load original file data if no masked data exists
    }
  }, [fileData, fileId]);

  

  const handleDownload = async () => {
    const fileContent = Papa.unparse(displayedFileData);

    const response = await fetch('http://localhost:8081/generate-signature', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileContent,
        fileId,
      }),
    });

    const { signature } = await response.json();
    const fileWithSignature = `${fileContent}\n\n--DIGITAL-SIGNATURE--\n${signature}`;

    const blob = new Blob([fileWithSignature], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const dynamicFileName = `masked-file-${fileId}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', dynamicFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMaskingTypeClick = () => {
    setDefaultMaskBuilderOpen(true);
  };

  const handleMasked = (updatedFileId, maskedContent) => {
    if (updatedFileId === fileId) {
      const parsedMaskedContent = Papa.parse(maskedContent, { header: true }).data;

      // Update state and session storage with the masked data
      setDisplayedFileData(parsedMaskedContent);
      sessionStorage.setItem(`fileData-${fileId}`, JSON.stringify(parsedMaskedContent));
    }
  };

  return (
    <div style={{ maxWidth: '1340px' }} className="relative mx-auto">
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }} className="h-[50px] flex justify-end space-x-3 p-5">
        <Download onClick={handleDownload} color="#872DFB" className="cursor-pointer" />
        <button onClick={handleMaskingTypeClick} className="bg-[#872DFB] cursor-pointer text-white w-[150px] h-[30px] rounded-lg">Mask Data</button>
      </div>

      {Array.isArray(displayedFileData) && displayedFileData.length > 0 ? (
        <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
          <table className="min-w-full mt-4 border border-collapse border-gray-300" style={{ tableLayout: 'auto', width: '100%' }}>
            <thead>
              <tr>
                {Object.keys(displayedFileData[0]).map((header, index) => (
                  <th key={index} className="border border-gray-300 p-2 bg-[#c98efb] sticky top-0">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedFileData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, colIndex) => (
                    <td key={colIndex} className="border border-gray-300 p-2" style={{ wordWrap: 'break-word', maxWidth: '150px' }}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No data available in this file.</p>
      )}

      <DefaultMaskBuilder
        isOpen={isDefaultMaskBuilderOpen}
        onClose={() => setDefaultMaskBuilderOpen(false)}
        fileId={fileId}
        onMaskedUpdate={onMaskedUpdate}
        HandleMaskedFile={handleMasked}
        fileName={fileName}
        columns={columns}
      />
    </div>
  );
};

export default FileContent;
