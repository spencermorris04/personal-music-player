// src/server/api/routers/s3Uploader.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// Removed db and songs imports since we're no longer inserting into the database
import { TRPCError } from "@trpc/server";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.NEXT_PUBLIC_CLOUDFLARE_ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(request: Request) {
  try {
    const { files } = await request.json(); // Expecting an array of files
    const signedUrls: { url: string; r2Id: string }[] = [];

    // Process uploads in smaller batches to avoid overwhelming the system
    const BATCH_SIZE = 10; // You can tune this number based on your system's capacity

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      const uploadPromises = batch.map(async (file: any) => {
        const { fileName, fileType, fileUUID } = file;

        // Prepare S3 command for file upload
        const command = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_BUCKET_NAME as string,
          Key: fileUUID, // Use fileUUID as the key
          ContentType: fileType,
        });

        // Get signed URL for file upload
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return { url, r2Id: fileUUID };
      });

      // Wait for this batch to finish before processing the next one
      const batchSignedUrls = await Promise.all(uploadPromises);
      signedUrls.push(...batchSignedUrls);
    }

    return new Response(JSON.stringify({ signedUrls }), { status: 200 });
  } catch (error) {
    console.error("Error during bulk file upload:", error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error processing the uploads',
    });
  }
}
