// src/app/api/s3Uploader/route.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "~/server/auth";
import { validate as uuidValidate } from "uuid";

interface FileData {
  fileName: string;
  fileType: string;
  fileUUID: string;
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.NEXT_PUBLIC_CLOUDFLARE_ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY as string,
  },
});

/**
 * Sleeps for the specified number of milliseconds.
 * @param ms - Milliseconds to sleep.
 */
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Generates a signed URL for a single file with retry logic.
 * @param file - The file data.
 */
const generateSignedUrl = async (
  file: FileData
): Promise<{ r2Id: string; url: string } | null> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000; // 1 second

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { fileName, fileType, fileUUID } = file;

      // Validate UUID
      if (!uuidValidate(fileUUID)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid UUID for fileUUID: ${fileUUID}`,
        });
      }

      // Parse artistName and songTitle from fileName
      const splitIndex = fileName.indexOf(" - ");
      if (splitIndex === -1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid file name format for file: ${fileName}. Expected format "Artist - SongTitle.ext"`,
        });
      }

      const artistName = fileName.substring(0, splitIndex).trim();
      let songTitleWithExt = fileName.substring(splitIndex + 3).trim();

      // Remove the file extension from songTitle
      const lastDotIndex = songTitleWithExt.lastIndexOf(".");
      if (lastDotIndex === -1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File name does not contain an extension: ${fileName}`,
        });
      }

      const songTitle = songTitleWithExt.substring(0, lastDotIndex).trim();

      // Prepare S3 command for file upload
      const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME as string,
        Key: fileUUID, // Use fileUUID as the key
        ContentType: fileType,
      });

      // Get signed URL for file upload
      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL valid for 1 hour
      });

      return { r2Id: fileUUID, url: signedUrl };
    } catch (error: any) {
      console.error(
        `Attempt ${attempt} failed for file ${file.fileName}:`,
        error.message
      );

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        await sleep(1000 * Math.pow(2, attempt - 1));
      } else {
        console.error(`All 3 attempts failed for file ${file.fileName}.`);
        return null;
      }
    }
  }

  return null;
};

export async function POST(request: Request) {
  try {
    // Retrieve the session to get the authenticated user's ID
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User is not authenticated",
      });
    }

    // Parse the incoming JSON
    const { files } = await request.json(); // Expecting an array of files

    if (!files || !Array.isArray(files)) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload." }),
        { status: 400 }
      );
    }

    const signedUrls: { r2Id: string; url: string }[] = [];
    const failedUploads: { fileName: string; error: string }[] = [];

    // Process uploads in smaller batches to avoid overwhelming the system
    const BATCH_SIZE = 50; // Adjust based on your server's capacity

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE) as FileData[];

      const uploadPromises = batch.map(async (file: FileData) => {
        const result = await generateSignedUrl(file);

        if (result) {
          signedUrls.push(result);
        } else {
          failedUploads.push({
            fileName: file.fileName,
            error: "Failed to generate signed URL after multiple attempts.",
          });
        }
      });

      // Await all signed URL generations in the current batch
      await Promise.all(uploadPromises);
    }

    if (failedUploads.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Some files failed to generate signed URLs.",
          failedUploads,
        }),
        { status: 207 } // 207 Multi-Status
      );
    }

    return new Response(JSON.stringify({ signedUrls }), { status: 200 });
  } catch (error: any) {
    console.error("Error during bulk file upload:", error);

    if (error instanceof TRPCError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({ error: "Error processing the uploads" }),
      { status: 500 }
    );
  }
}
