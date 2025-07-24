import React from 'react';

interface ShareLinkProps {
  link: string;
}

const ShareLink: React.FC<ShareLinkProps> = ({ link }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <strong>Share this link:</strong>
      <div style={{ wordBreak: 'break-all', marginTop: 8 }}>{link}</div>
      <button onClick={handleCopy} style={{ marginTop: 8, padding: 8 }}>
        Copy to Clipboard
      </button>
    </div>
  );
};

export default ShareLink; 