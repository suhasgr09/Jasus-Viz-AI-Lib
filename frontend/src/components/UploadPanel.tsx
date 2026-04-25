import React, { useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { logEvent } from '../utils/analytics';

export default function UploadPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { setResult } = useUpload();
  const navigate = useNavigate();

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);
    form.append('schema_json', '{}');
    form.append('relationships', '');

    setStatus('uploading');
    setMessage('');
    try {
      const res = await axios.post('/api/process', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const rows = res.data?.viz_data?.meta?.row_count ?? '?';
      setStatus('done');
      setMessage(`✓ Processed ${rows} rows`);
      setResult({ ...res.data, fileName: file.name });
      logEvent('file_upload', `Upload: ${file.name}`, 'Upload', { fileName: file.name, rows: String(rows), status: 'success' });
      navigate('/upload-results');
    } catch {
      setStatus('error');
      setMessage('Upload failed');
      logEvent('file_upload', `Upload: ${file.name}`, 'Upload', { fileName: file.name, status: 'error' });
    }
  };

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid #2d3148' }}>
      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Upload Dataset
      </div>
      <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }}
        onChange={handleUpload} />
      <button onClick={() => fileRef.current?.click()} style={upBtn}>
        + Upload CSV / JSON
      </button>
      {status === 'uploading' && <div style={statusStyle('#94a3b8')}>Uploading…</div>}
      {status === 'done' && <div style={statusStyle('#34d399')}>{message}</div>}
      {status === 'error' && <div style={statusStyle('#f87171')}>{message}</div>}
    </div>
  );
}

const upBtn: React.CSSProperties = {
  width: '100%',
  padding: '7px 0',
  background: 'transparent',
  border: '1px dashed #3d4268',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '0.78rem',
};

const statusStyle = (color: string): React.CSSProperties => ({
  fontSize: '0.75rem',
  color,
  marginTop: 5,
});
