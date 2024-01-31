// BatchControls.js

import React, { useState } from 'react';

const BatchControls = ({ onBatchUpload }) => {
  const [batchFile, setBatchFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setBatchFile(file);
  };

  const handleUploadClick = () => {
    if (batchFile) {
      // Call the onBatchUpload function with the selected file
      onBatchUpload(batchFile);
      // Optionally, you can reset the file state after upload
      setBatchFile(null);
    } else {
      // Handle case where no file is selected
      console.error('No batch file selected.');
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl md:text-2xl mb-2">Batch Controls</h2>
      <div className="mb-4">
        <label className="block text-lg md:text-xl mb-1">Select Batch File:</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="bg-white rounded-md p-2 md:p-3 ml-2"
        />
      </div>
      <button
        onClick={handleUploadClick}
        className="bg-white text-blue-500 py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
      >
        Upload Batch File
      </button>
    </div>
  );
};

export default BatchControls;
