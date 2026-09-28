import React, { useState } from 'react';
import Papa from 'papaparse';
import Sidebar from '../components/sideBar'; // Ensure correct import
import Navbar from '../components/Navbar';
import {  Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const FileDisplay = ({onLogout}) => {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    const handleToggleSidebar = (expanded) => {
        setSidebarExpanded(expanded);
    };

    const location = useLocation();
    const fileData = location.state?.fileData || [];

    


    const handleDownload = async () => {
        if (fileData && fileData.length > 0) {
            const csv = Papa.unparse(fileData);

            // Create a Blob with the CSV content
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

            // Create an anchor element for downloading the CSV file
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'file.csv'; // You can change the file name here
            link.click(); // Simulate a click on the link to start the download
        } else {
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#f4f4f4] w-full">
            {/* Sidebar Section */}
            <div className={`transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-20'}`}>
                <Sidebar onToggle={handleToggleSidebar} onLogout={onLogout} />
            </div>

            <div className="flex flex-col h-screen w-full">
                {/* Navbar Section */}
                <div
                    className={`fixed top-0 left-0 z-10 bg-primary transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}
                    style={{ width: `calc(100% - ${sidebarExpanded ? '16rem' : '5rem'})`, height: '75px' }}
                >
                    <Navbar />
                </div>

                {/* Header Section */}
                <div
                    style={{ top: '60px', zIndex: 9, backgroundColor: 'white', height: '50px', maxHeight: '800px', maxWidth: '95%' }}
                    className="fixed w-full flex justify-end space-x-3 p-5 transition-all duration-300"
                >
                    
                    <Download onClick={handleDownload} color="#872DFB" className="cursor-pointer" />
                </div>

                {/* Main Content Section */}
                <div style={{ maxWidth: '1440px' }} className="flex flex-col overflow-auto mt-[100px]" >
                    {fileData && fileData.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="min-w-full mt-4 border-collapse border border-gray-300 bg-white" style={{ maxHeight: '700px', maxWidth: '100%' }}>
                                <thead>
                                    <tr>
                                        {Object.keys(fileData[0]).map((header, index) => (
                                            <th
                                                key={index}
                                                className="border border-gray-300 p-2 bg-[#c98efb] sticky top-0"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fileData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {Object.values(row).map((value, colIndex) => (
                                                <td key={colIndex} className="border border-gray-300 p-2">
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
                </div>
            </div>
        </div>
    );
};

export default FileDisplay;
