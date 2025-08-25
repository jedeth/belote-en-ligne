import React from 'react';

interface VideoControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '10px 15px',
    fontSize: '16px',
    cursor: 'pointer',
    borderRadius: '5px',
    border: '1px solid #ccc',
    margin: '0 5px',
  };

  return (
    <div style={{ display: 'flex', gap: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '10px' }}>
      <button onClick={onToggleAudio} style={{ ...buttonStyle, backgroundColor: isAudioEnabled ? '#4CAF50' : '#f44336' }}>
        {isAudioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={onToggleVideo} style={{ ...buttonStyle, backgroundColor: isVideoEnabled ? '#4CAF50' : '#f44336' }}>
        {isVideoEnabled ? 'Cam Off' : 'Cam On'}
      </button>
    </div>
  );
};

export default VideoControls;
