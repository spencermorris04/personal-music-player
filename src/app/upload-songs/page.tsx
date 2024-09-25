// src/app/upload/page.tsx

"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid"; // For generating UUIDs
import pLimit from "p-limit"; // For concurrency control

interface SignedUrl {
  r2Id: string;
  url: string;
}

interface ConfirmUploadData {
  r2Id: string;
  artistName: string;
  songTitle: string;
  fileType: string;
}

interface UploadResult {
  success: boolean;
  file: File;
  r2Id: string;
  error?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [deletionMessage, setDeletionMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failedUploads, setFailedUploads] = useState<
    { fileName: string; error: string }[]
  >([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  /**
   * Validates file names to match the "Artist - SongTitle.ext" format.
   * Allows special characters in artist and song title.
   * @param fileName - The name of the file.
   */
  const isValidFileName = (fileName: string): boolean => {
    // Regex to match "Artist - SongTitle.ext" with special characters
    const regex = /^.+\s-\s.+\.\w+$/;
    return regex.test(fileName);
  };

  /**
   * Parses the file name to extract artist name and song title.
   * @param fileName - The name of the file.
   */
  const parseFileName = (fileName: string): {
    artistName: string;
    songTitle: string;
  } => {
    const splitIndex = fileName.indexOf(" - ");
    const artistName = fileName.substring(0, splitIndex).trim();
    let songTitleWithExt = fileName.substring(splitIndex + 3).trim();
    const lastDotIndex = songTitleWithExt.lastIndexOf(".");
    const songTitle = songTitleWithExt.substring(0, lastDotIndex).trim();
    return { artistName, songTitle };
  };

  /**
   * Sleeps for the specified number of milliseconds.
   * @param ms - Milliseconds to sleep.
   */
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  /**
   * Uploads a single file to R2 using the signed URL with retry logic.
   * @param signedUrl - The signed URL for the upload.
   * @param file - The file to upload.
   */
  const uploadFileToR2 = async (
    signedUrl: string,
    file: File
  ): Promise<UploadResult> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000; // 1 second

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const uploadResponse = await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(
            `Upload failed with status ${uploadResponse.status}: ${errorText}`
          );
        }

        return {
          success: true,
          file,
          r2Id: extractR2IdFromSignedUrl(signedUrl),
        };
      } catch (error: any) {
        console.error(
          `Attempt ${attempt} failed for file ${file.name}:`,
          error.message
        );

        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        } else {
          // All retries failed
          return {
            success: false,
            file,
            r2Id: "",
            error: error.message,
          };
        }
      }
    }

    // Should not reach here
    return { success: false, file, r2Id: "", error: "Unknown error" };
  };

  /**
   * Extracts the r2Id from the signed URL.
   * Assumes that the r2Id is the last segment of the URL path.
   * @param signedUrl - The signed URL.
   */
  const extractR2IdFromSignedUrl = (signedUrl: string): string => {
    try {
      const url = new URL(signedUrl);
      const pathname = url.pathname;
      const segments = pathname.split("/");
      const r2Id = segments.pop() || "";
      return r2Id;
    } catch (error) {
      console.error("Error extracting r2Id from signed URL:", error);
      return "";
    }
  };

  /**
   * Uploads all files with concurrency control.
   */
  const handleUpload = async () => {
    if (!files) {
      setMessage("Please select files first.");
      return;
    }

    const fileArray = Array.from(files);

    // Validate file names
    for (const file of fileArray) {
      if (!isValidFileName(file.name)) {
        setMessage(
          `Invalid file name: ${file.name}. Expected format "Artist - SongTitle.ext"`
        );
        return;
      }
    }

    setUploading(true);
    setMessage("");
    setProgress(0);
    setFailedUploads([]);

    try {
      // Step 1: Request signed URLs
      const filesData = fileArray.map((file) => ({
        fileName: file.name,
        fileType: file.type,
        fileUUID: uuidv4(), // Generate a unique UUID for each file
      }));

      const response = await fetch("/api/s3Uploader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: filesData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate signed URLs.");
      }

      const data = await response.json();
      const signedUrls: SignedUrl[] = data.signedUrls;

      if (signedUrls.length !== fileArray.length) {
        throw new Error(
          "Mismatch between requested and received signed URLs."
        );
      }

      // Step 2: Upload files to R2 with concurrency control
      const concurrencyLimit = 50; // Adjust based on your server's capacity
      const limit = pLimit(concurrencyLimit);

      const uploadPromises = signedUrls.map((signedUrlObj, index) =>
        limit(async () => {
          const file = fileArray[index];
          if (!file) {
            throw new Error(`File at index ${index} is undefined.`);
          }
          const result = await uploadFileToR2(signedUrlObj.url, file);
          return { ...result, r2Id: signedUrlObj.r2Id };
        })
      );

      const uploadResults = await Promise.all(uploadPromises);

      // Separate successful and failed uploads
      const successfulUploads = uploadResults.filter(
        (result) => result.success
      );
      const failed = uploadResults.filter((result) => !result.success);

      // Step 3: Confirm successful uploads and create database entries
      if (successfulUploads.length > 0) {
        const confirmData: ConfirmUploadData[] = successfulUploads.map(
          (result) => {
            const { artistName, songTitle } = parseFileName(result.file.name);
            return {
              r2Id: result.r2Id,
              artistName,
              songTitle,
              fileType: result.file.type,
            };
          }
        );

        const confirmResponse = await fetch("/api/confirmUploads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uploads: confirmData }),
        });

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          throw new Error(errorData.error || "Failed to confirm uploads.");
        }
      }

      // Update progress
      const successfulCount = successfulUploads.length;
      const totalCount = fileArray.length;
      setProgress((successfulCount / totalCount) * 100);

      // Set messages
      if (failed.length === 0) {
        setMessage("All files uploaded successfully!");
      } else {
        setMessage(
          "Some files failed to upload. Please check the details below."
        );
        setFailedUploads(
          failed.map((f) => ({
            fileName: f.file.name,
            error: f.error || "Unknown error",
          }))
        );
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      setMessage(`Error uploading files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handles deletion of all songs.
   */
  const handleDeleteAllSongs = async () => {
    const confirmDeletion = window.confirm(
      "Are you sure you want to delete ALL songs from the R2 bucket and the database? This action cannot be undone."
    );

    if (!confirmDeletion) {
      return;
    }

    setIsDeleting(true);
    setDeletionMessage("");

    try {
      const response = await fetch("/api/deleteR2Songs", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete songs.");
      }

      const data = await response.json();
      setDeletionMessage(
        data.message || "All songs have been deleted successfully."
      );
    } catch (error: any) {
      console.error("Error deleting songs:", error);
      setDeletionMessage(error.message || "Error deleting songs.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Upload Files to Cloudflare R2</h1>

      {/* Upload Section */}
      <div className="mb-8">
        <input
          type="file"
          multiple
          accept=".opus"
          onChange={handleFileChange}
          className="mb-4"
        />
        <button
          onClick={handleUpload}
          className={`bg-blue-500 text-white px-4 py-2 rounded ${
            !files || uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!files || uploading}
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
        {message && <p className="mt-4">{message}</p>}
        {uploading && <p className="mt-2">Progress: {progress.toFixed(2)}%</p>}
        {failedUploads.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Failed Uploads:</h2>
            <ul className="list-disc list-inside">
              {failedUploads.map((fail, index) => (
                <li key={index}>
                  {fail.fileName}: {fail.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Delete Section */}
      <div className="mb-8">
        <button
          onClick={handleDeleteAllSongs}
          className={`bg-red-500 text-white px-4 py-2 rounded ${
            isDeleting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete All Songs"}
        </button>
        {deletionMessage && <p className="mt-4">{deletionMessage}</p>}
      </div>
    </div>
  );
}
