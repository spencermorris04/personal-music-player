// src/types.ts

export interface Song {
    id: number;
    r2Id: string;
    songTitle: string;
    artistName: string;
    genre: string;
    instruments: string;
    uploaderUserId: number;
    description: string;
    lyrics: string;
    createdAt: string;
  }
  
  export interface CachedSong extends Song {
    blob: Blob;
  }
  