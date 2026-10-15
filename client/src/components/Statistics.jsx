import React from 'react';

const Statistics = () => {
  return (
    <div className="bg-[#43005D] p-20 w-full mx-auto font-['Roboto']">
      <h2 className="text-4xl font-bold text-center text-white mb-10">Why Privacy Matter</h2>
      <div className="flex flex-row gap-6 justify-center">
        <div className="bg-linear-to-b from-[#E892C0] to-[#F4DBE8] shadow-md rounded-lg p-6 text-center flex-1">
          <h3 className="text-4xl font-extrabold text-[#6C0595] mb-2">80%</h3>
          <p className="text-black">of users feel their data is unsafe online.</p>
        </div>
        <div className="bg-linear-to-b from-[#E892C0] to-[#F4DBE8] shadow-md rounded-lg p-6 text-center flex-1">
          <h3 className="text-4xl font-extrabold text-[#6C0595] mb-2">50%</h3>
          <p className="text-black">of organizations report a data breach annually.</p>
        </div>
        <div className="bg-linear-to-b from-[#E892C0] to-[#F4DBE8] shadow-md rounded-lg p-6 text-center flex-1">
          <h3 className="text-4xl font-extrabold text-[#6C0595] mb-2">4.1 Billion</h3>
          <p className="text-black">personal records were exposed in 2023.</p>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
