import React, { useEffect } from 'react';

export default function MeshBackground() {
  useEffect(() => {
    const blobs = document.querySelectorAll('.blob');

    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      blobs.forEach((blob, index) => {
        const speed = (index + 1) * 15;
        const moveX = (x - 0.5) * speed;
        const moveY = (y - 0.5) * speed;

        blob.style.transform = `translate(${moveX}px, ${moveY}px)`;
        blob.style.transition = 'transform 0.5s ease-out';
      });
    };

    const handleMouseLeave = () => {
      blobs.forEach((blob) => {
        blob.style.transform = 'translate(0px, 0px)';
        blob.style.transition = 'transform 1s ease-in-out';
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <div className="mesh-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>
      <div className="glass-overlay"></div>
    </>
  );
}
