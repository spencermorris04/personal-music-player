// src/app/api/createUser/route.ts

import { db } from "~/server/db/index"; // Assumes you're using Drizzle ORM with a `db` connection
import { users } from "~/server/db/schema"; // Import the users schema
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  image: z.string().nullable(), // Allow image to be null
});

export async function POST(request: Request) {
  try {
    console.log("Create User API: Received request");
    
    const body = await request.json();
    console.log("Create User API: Request body parsed", body);
    
    const parsedData = createUserSchema.parse(body);
    console.log("Create User API: Request body validated", parsedData);

    // Insert the new user into the database
    const [createdUser] = await db
      .insert(users)
      .values({
        name: parsedData.name,
        email: parsedData.email,
        image: parsedData.image, // This will now correctly accept null
      })
      .returning();

    console.log("Create User API: User inserted into database", createdUser);

    if (!createdUser) {
      console.error("Create User API: Insertion returned no user");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user",
      });
    }

    return new Response(JSON.stringify(createdUser), { status: 201 });
  } catch (error: any) {
    console.error("Create User API: Error creating user:", error);
    return new Response(JSON.stringify({ error: "Failed to create user" }), { status: 500 });
  }
}
