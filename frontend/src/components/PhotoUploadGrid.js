import React, { useRef, useState } from 'react';
import './PhotoUploadGrid.css';

/**
 * Dropzone + thumbnail grid for a photo gallery attached to one row (a
 * model booking, a location, a reel, ...). Uploads immediately on drop/pick
 * -- there is no separate "save" step, matching the rest of the wizard's
 * save-as-you-go behaviour.
 */
export default function PhotoUploadGrid({ label, photos, onUpload, onRemove, aspect = 'square', hint }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        // eslint-disable-next-line no-await-in-loop
        await onUpload(file);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rr-photogrid">
      {label && <label className="rr-photogrid__label">{label}</label>}
      <div
        className={`rr-photogrid__drop${dragOver ? ' rr-photogrid__drop--over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span>{busy ? 'Uploading…' : hint || 'Drag & drop images, or click to browse'}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {photos.length > 0 && (
        <div className="rr-photogrid__thumbs">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`rr-photogrid__thumb${aspect === 'portrait' ? ' rr-photogrid__thumb--portrait' : ''}`}
            >
              <img src={photo.image} alt="" onClick={() => window.open(photo.image, '_blank')} />
              <button type="button" onClick={() => onRemove(photo.id)} aria-label="Remove photo">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
