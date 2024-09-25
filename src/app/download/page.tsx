// src/app/download/page.tsx

'use client';

import React, { useState } from 'react';

const DownloadPage: React.FC = () => {
  const [objectId, setObjectId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAudio, setIsAudio] = useState<boolean>(false);

  const handleDownload = async () => {
    if (!objectId) {
      setError('Please enter a valid Object ID.');
      setDownloadUrl(null);
      setIsAudio(false);
      return;
    }

    try {
      const response = await fetch(`/api/download/${objectId}`);

      if (response.ok) {
        const data = await response.json();
        setDownloadUrl(data.url);
        setError(null);

        // Simple check to determine if the file is an audio file based on objectId
        // You might want to enhance this logic based on your actual data
        // For example, maintain a mapping of objectIds to file types
        const audioExtensions = ['.ogg', '.opus', '.mp3', '.wav', '.flac'];
        const isAudioFile = audioExtensions.some((ext) =>
          objectId.toLowerCase().endsWith(ext)
        );
        setIsAudio(isAudioFile);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate download URL.');
        setDownloadUrl(null);
        setIsAudio(false);
      }
    } catch (err) {
      console.error('Error fetching download URL:', err);
      setError('An unexpected error occurred.');
      setDownloadUrl(null);
      setIsAudio(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6">Download File from R2 Bucket</h1>
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <label htmlFor="objectId" className="block text-sm font-medium text-gray-700 mb-2">
          Enter Object ID:
        </label>
        <input
          type="text"
          id="objectId"
          value={objectId}
          onChange={(e) => setObjectId(e.target.value)}
          placeholder="e.g., 502cd56b-25b4-496e-96fe-543df2920cee"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleDownload}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Generate Download Link
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {downloadUrl && (
          <div className="mt-6">
            {isAudio ? (
              <div>
                <h2 className="text-xl font-semibold mb-2">Audio Preview:</h2>
                <audio controls src={downloadUrl} className="w-full">
                  Your browser does not support the audio element.
                </audio>
                <a
                  href={downloadUrl}
                  download
                  className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Download Audio
                </a>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-2">Download Link:</h2>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  Click here to download
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadPage;
