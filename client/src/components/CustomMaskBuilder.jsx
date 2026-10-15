import React, { useState } from 'react';
import { CircleX } from 'lucide-react';

const CustomMaskBuilder = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    // State to manage checkbox and selected technique for each attribute
    const [isChecked, setIsChecked] = useState({});
    const [selectedTechniques, setSelectedTechniques] = useState({});

    // Close modal when clicking outside
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Update checkbox state
    const handleCheckedChange = (key) => (e) => {
        setIsChecked((prev) => ({
            ...prev,
            [key]: e.target.checked,
        }));
    };

    // Update selected technique state
    const handleTechniqueChange = (key) => (e) => {
        setSelectedTechniques((prev) => ({
            ...prev,
            [key]: e.target.value,
        }));
    };

    // Define the attributes with their corresponding masking techniques
    const leftAttributes = [
        { label: 'Name', key: 'name', techniques: ['Generalization', 'Mask Out', 'Null'] },
        { label: 'IC Number', key: 'icNumber', techniques: ['Mask Out', 'Random Number'] },
        { label: 'Birthdate', key: 'birthdate', techniques: ['Generalization', 'Mask Out'] },
        { label: 'Home Address', key: 'address', techniques: ['Generalization', 'Null'] },
        { label: 'Phone Number', key: 'phone', techniques: ['Random Number', 'Mask Out'] },
        { label: 'Gender', key: 'gender', techniques: ['Null', 'Generalization'] },
        { label: 'Email', key: 'email', techniques: ['Mask Out', 'Generalization'] },
    ];

    const rightAttributes = [
        { label: 'Health', key: 'health', techniques: ['Generalization', 'Null'] },
        { label: 'Age', key: 'age', techniques: ['Generalization', 'Random Number'] },
        { label: 'Place of Birth', key: 'POB', techniques: ['Generalization', 'Mask Out'] },
        { label: 'Religion', key: 'religion', techniques: ['Generalization', 'Null'] },
        { label: 'Parent Salary', key: 'parentSalary', techniques: ['Generalization', 'Mask Out'] },
        { label: 'CGPA/Pointer', key: 'pointer', techniques: ['Generalization', 'Null'] },
        { label: 'Department/Class', key: 'class', techniques: ['Generalization', 'Mask Out'] },
    ];

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
            onClick={handleOverlayClick}
        >
            <div className="relative bg-white rounded-lg shadow-lg w-[950px] h-[600px] overflow-y-auto">
                <h3 className="text-xl font-semibold mb-4 text-center mt-4">Custom Mask Builder</h3>
                <h2 className="text-black text-base font-medium mb-6 ml-6">
                    Choose attributes that you wish to mask
                </h2>

                <div className="grid grid-cols-2 gap-1 px-6">
                    {/* Left Column */}
                    <div>
                        {leftAttributes.map(({ label, key, techniques }) => (
                            <div key={key} className="grid grid-cols-12 items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    checked={isChecked[key] || false}
                                    onChange={handleCheckedChange(key)}
                                />
                                <span className="text-gray-700">{label}:</span>
                                <select
                                    className="w-[200px] h-8 bg-[#c0dbea] rounded-sm ml-14 text-sm font-medium text-gray-800"
                                    value={selectedTechniques[key] || ''}
                                    onChange={handleTechniqueChange(key)}
                                    disabled={!isChecked[key]}
                                >
                                    <option value="" disabled>
                                        Select technique
                                    </option>
                                    {techniques.map((technique) => (
                                        <option key={technique} value={technique}>
                                            {technique}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Right Column */}
                    <div>
                        {rightAttributes.map(({ label, key, techniques }) => (
                            <div key={key} className="grid grid-cols-12 items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    checked={isChecked[key] || false}
                                    onChange={handleCheckedChange(key)}
                                />
                                <span className="text-gray-700 mr-8">{label}:</span>
                                <select
                                    className="w-[200px] h-8 bg-[#c0dbea] rounded-sm ml-28 text-sm font-medium text-gray-800"
                                    value={selectedTechniques[key] || ''}
                                    onChange={handleTechniqueChange(key)}
                                    disabled={!isChecked[key]}
                                >
                                    <option value="" disabled>
                                        Select technique
                                    </option>
                                    {techniques.map((technique) => (
                                        <option key={technique} value={technique}>
                                            {technique}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Close Icon positioned at the top right */}
                <CircleX
                    color="red"
                    className="absolute top-4 right-4 cursor-pointer"
                    onClick={onClose}
                />
                <button className="bg-hover text-white py-2 px-6 rounded-full mb-2 absolute bottom-4 right-8 cursor-pointer">
                    Run
                </button>
            </div>
        </div>
    );
};

export default CustomMaskBuilder;
