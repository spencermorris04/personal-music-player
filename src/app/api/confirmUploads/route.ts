// src/app/api/confirmUploads/route.ts

import { db } from "~/server/db/index"; // Import your db connection
import { songs } from "~/server/db/schema"; // Import your schema for song insertion
import { TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth/next"; // Import getServerSession
import { authOptions } from "~/server/auth"; // Adjust the path based on your project structure
import { validate as uuidValidate } from "uuid";

interface ConfirmUploadData {
  r2Id: string;
  artistName: string;
  songTitle: string;
  fileType: string;
}

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

    const uploaderUserId = session.user.id;

    // Parse the incoming JSON
    const { uploads } = await request.json(); // Expecting an array of uploads

    if (!uploads || !Array.isArray(uploads)) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload." }),
        { status: 400 }
      );
    }

    const failedInserts: { r2Id: string; error: string }[] = [];

    // Process inserts in smaller batches to avoid overwhelming the system
    const BATCH_SIZE = 50; // Adjust based on your server's capacity

    for (let i = 0; i < uploads.length; i += BATCH_SIZE) {
      const batch = uploads.slice(i, i + BATCH_SIZE) as ConfirmUploadData[];

      const insertPromises = batch.map(async (upload) => {
        const { r2Id, artistName, songTitle, fileType } = upload;

        // Validate UUID
        if (!uuidValidate(r2Id)) {
          failedInserts.push({ r2Id, error: "Invalid UUID." });
          return;
        }

        try {
          // Insert metadata into the database with the authenticated user's ID
          await db.insert(songs).values({
            r2Id,
            artistName,
            songTitle,
            uploaderUserId, // Use the authenticated user's ID
            genre: "Unknown", // Default genre
            instruments: null,
            description: null,
            lyrics: null,
            createdAt: new Date(), // Pass Date object
          });
        } catch (error: any) {
          console.error(
            `Failed to insert record for r2Id ${r2Id}:`,
            error.message
          );
          failedInserts.push({ r2Id, error: error.message });
        }
      });

      // Await all inserts in the current batch
      await Promise.all(insertPromises);
    }

    if (failedInserts.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Some database entries failed to create.",
          failedInserts,
        }),
        { status: 207 } // 207 Multi-Status
      );
    }

    return new Response(
      JSON.stringify({ message: "All uploads confirmed successfully." }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error during confirmation of uploads:", error);

    if (error instanceof TRPCError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({ error: "Error confirming the uploads." }),
      { status: 500 }
    );
  }
}
