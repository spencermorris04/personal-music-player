// src/types.ts

export type Song = {
    id: number;
    r2Id: string;
    songTitle: string;
    artistName: string; // Required field
    uploaderUserId: string;
    genre: string;
    instruments: string;
    description: string;
    lyrics: string;
    createdAt: string;
  };
  