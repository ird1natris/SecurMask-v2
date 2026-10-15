import React from 'react';
import { FolderLock, FolderKey } from 'lucide-react';

const Detail = () => {
  return (
    <div className="bg-gray-100 py-10 px-5 font-['Roboto']">
      <h2 className="text-4xl font-bold text-center text-[gray-800] mb-10">
        Data Masking vs Data Unmasking
      </h2>
      <div className="flex flex-col gap-y-8 max-w-5xl mx-auto">
        {/* Data Masking */}
        <div className="bg-linear-to-r from-[#D795F2] to-[#F4DBE8] shadow-lg rounded-lg p-6 flex flex-col items-center text-center">
          <FolderLock className="w-12 h-12 text-[#6C0595] mb-4" />
          <h3 className="text-3xl font-bold text-[#6C0595] mb-4">Data Masking</h3>
          <p className="text-black ">
            Data masking is a critical security measure used to protect sensitive information by transforming it into a format that is unintelligible or useless to unauthorized users.
             By using data masking techniques, businesses can safely share datasets with third parties or use them for testing, without exposing sensitive details. 
             This process also minimizes the risk of data breaches, ensuring that even if unauthorized access occurs, the exposed data will not be usable.
          </p>
        </div>
        {/* Data Unmasking */}
        <div className="bg-linear-to-r from-[#E892C0] to-[#F4DBE8] shadow-lg rounded-lg p-6 flex flex-col items-center text-center">
          <FolderKey className="w-12 h-12 text-[#6C0595] mb-4" />
          <h3 className="text-3xl font-bold text-[#6C0595] mb-4">Data Unmasking</h3>
          <p className="text-black ">
          Data unmasking is a sensitive and highly controlled process that involves restoring the originally masked data to its readable and usable format.
           It is typically performed by authorized personnel who have been granted specific permissions to access the sensitive information for legitimate business needs, such as for analysis, reporting, or compliance purposes. 
           Unmasking ensures that the data, once it is no longer required to be obfuscated, can be used effectively while still maintaining strict security protocols. 
          </p>
        </div>
      </div>
    </div>
  );
};

export default Detail;
