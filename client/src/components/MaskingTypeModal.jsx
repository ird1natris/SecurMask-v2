import React, { useState } from 'react';
import DefaultMaskBuilder from './DefaultMaskBuilder';
import CustomMaskBuilder from './CustomMaskBuilder';

const MaskingTypeModal = ({ isOpen, onClose ,onSelectCustom,fileId,onMaskedUpdate,HandleMaskedFile,fileName}) => {
  const [isDefaultMaskBuilderOpen, setDefaultMaskBuilderOpen] = useState(false);
  const [isCustomMaskBuilderOpen, setCustomMaskBuilderOpen] = useState(false);

  const handleSelectDefault = () => {
    setDefaultMaskBuilderOpen(true);
    onClose(); // Close the MaskingTypeModal
  };
  const handleSelectCustom = () => {
    setCustomMaskBuilderOpen(true);
    onClose(); // Close the MaskingTypeModal
  };
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50" onClick={handleOverlayClick}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-[300px] text-center">
            <h3 className="text-lg font-semibold mb-4">Select Masking Type</h3>
            <button onClick={handleSelectDefault} className="bg-hover text-white py-2 px-4 rounded-md mb-2 w-full">
              Default Masking
            </button>
            <button onClick={handleSelectCustom} className="bg-[#5A2EBB] text-white py-2 px-4 rounded-md w-full">
              Custom Masking
            </button>
            
            <button onClick={onClose} className="mt-4 text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
      <DefaultMaskBuilder
        isOpen={isDefaultMaskBuilderOpen}
        onClose={() => setDefaultMaskBuilderOpen(false)}
        fileId={fileId}
        onMaskedUpdate={onMaskedUpdate}
        HandleMaskedFile={HandleMaskedFile}
        
        
      />
      <CustomMaskBuilder
      isOpen={isCustomMaskBuilderOpen}
      onClose={() => setCustomMaskBuilderOpen(false)}

      />
    </>
  );
};

export default MaskingTypeModal;
