// src/components/PlayerVideo.tsx
import React, { useEffect, useRef } from 'react';

interface PlayerVideoProps {
  stream: MediaStream;
  isMuted?: boolean;
}

const PlayerVideo: React.FC<PlayerVideoProps> = ({ stream, isMuted = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      style={{
        width: '160px',
        height: '120px',
        borderRadius: '8px',
        objectFit: 'cover',
        backgroundColor: 'black',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        transform: 'scaleX(-1)', // Mirror the video for a more natural feel
      }}
    />
  );
};

export default PlayerVideo;
