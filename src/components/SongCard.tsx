// src/components/SongCard.tsx

import React from 'react';
import { FaMusic } from 'react-icons/fa';
import { Song } from '~/types'; // Importing the shared Song type

interface SongCardProps {
  song: Song;
  onSongSelect: (song: Song) => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, onSongSelect }) => {
  const handleClick = () => {
    onSongSelect(song);
  };

  return (
    <div
      className="border rounded-lg p-4 hover:bg-gray-100 cursor-pointer flex flex-col"
      onClick={handleClick}
    >
      <div className="h-32 bg-gray-200 flex items-center justify-center mb-4">
        <FaMusic size={48} className="text-gray-400" />
      </div>
      <div className="flex-grow">
        <h3 className="text-xl font-semibold mb-2">{song.songTitle}</h3>
        <p className="text-gray-600">Artist: {song.artistName}</p> {/* Displaying artistName */}
        <p className="text-gray-600">Genre: {song.genre}</p>
        <p className="text-gray-600">Instruments: {song.instruments}</p>
      </div>
    </div>
  );
};

export default SongCard;
