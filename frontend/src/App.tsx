import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API = "http://localhost:8000";

interface Video {
  id: number;
  filename: string;
  url?: string;
  created_at: string;
  annotations?: Annotation[];
}

interface Annotation {
  id: number;
  start_time: number;
  end_time: number;
  comment: string;
  created_at: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr);
}

function Navbar() {
  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link className="navbar-brand" to="/">▶ VideoAnnotate</Link>
      </div>
    </nav>
  );
}

function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchVideos() {
    try {
      const { data } = await axios.get<Video[]>(`${API}/videos`);
      setVideos(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVideos(); }, []);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", selectedFile);
    try {
      await axios.post(`${API}/videos`, form);
      setSelectedFile(null);
      fetchVideos();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation(); // Prevent navigating to the video page
    if (!window.confirm("Are you sure you want to delete this video and all its annotations?")) return;
    try {
      await axios.delete(`${API}/videos/${id}`);
      fetchVideos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete video");
    }
  }

  return (
    <>
      <Navbar />
      <div className="container page">
        <div className="page-header">
          <h1>My Videos</h1>
        </div>

        <div className="upload-area">
          <p>Select a video file to upload</p>
          <label htmlFor="file-input" className="btn btn-ghost btn-sm">Choose file</label>
          <input id="file-input" type="file" accept="video/*" onChange={e => { setSelectedFile(e.target.files?.[0] || null); setUploadError(""); }} />
          {selectedFile && <p className="selected-file">📎 {selectedFile.name}</p>}
          {uploadError && <div className="error-msg" style={{marginTop: "10px"}}>{uploadError}</div>}
          {selectedFile && (
            <div className="upload-actions">
              <button className="btn btn-sm" onClick={handleUpload} disabled={uploading}>
                {uploading && <span className="spinner" />}
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFile(null)}>Cancel</button>
            </div>
          )}
        </div>

        <p className="section-title">Uploaded Videos</p>
        {loading ? (
          <div className="loading"><span className="spinner" /> Loading…</div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎬</div>
            <p>No videos yet. Upload one above!</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map(v => (
              <div key={v.id} className="video-card" onClick={() => navigate(`/video/${v.id}`)} style={{ position: 'relative' }}>
                <button 
                  onClick={(e) => handleDelete(e, v.id)}
                  style={{
                    position: 'absolute', top: '8px', right: '8px', 
                    background: 'rgba(224, 82, 82, 0.9)', color: 'white', 
                    border: 'none', borderRadius: '4px', padding: '4px 8px', 
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10
                  }}
                  title="Delete Video"
                >
                  X
                </button>
                <div className="video-card-thumb">▶</div>
                <div className="video-card-info">
                  <div className="name" title={v.filename}>{v.filename}</div>
                  <div className="date">{new Date(v.created_at).toLocaleDateString()}</div>
                  {v.annotations && v.annotations.length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.75rem' }}>ANNOTATIONS ({v.annotations.length})</div>
                      {v.annotations.slice(0, 3).map(a => (
                        <div key={a.id} style={{ marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ color: 'var(--accent)', marginRight: '4px', fontFamily: 'monospace' }}>{formatTime(a.start_time)}</span>
                          {a.comment}
                        </div>
                      ))}
                      {v.annotations.length > 3 && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>+ {v.annotations.length - 3} more...</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    axios.get<Video>(`${API}/videos/${id}`).then(({ data }) => setVideo(data)).catch(() => {});
    fetchAnnotations();
  }, [id]);

  async function fetchAnnotations() {
    try {
      const { data } = await axios.get<Annotation[]>(`${API}/videos/${id}/annotations`);
      setAnnotations(data);
    } catch {}
  }

  function captureTime(setter: (val: string) => void) {
    if (videoRef.current) setter(formatTime(videoRef.current.currentTime));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (isNaN(start) || isNaN(end)) return setError("Enter valid timestamps (HH:MM:SS or seconds).");
    if (end <= start) return setError("End time must be after start time.");
    if (!comment.trim()) return setError("Comment cannot be empty.");
    setSaving(true);
    try {
      await axios.post(`${API}/videos/${id}/annotations`, {
        start_time: start,
        end_time: end,
        comment: comment.trim(),
      });
      setStartTime("");
      setEndTime("");
      setComment("");
      setSuccess("Annotation saved!");
      fetchAnnotations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save annotation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAnnotation(e: React.MouseEvent, annotationId: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this annotation?")) return;
    try {
      await axios.delete(`${API}/annotations/${annotationId}`);
      fetchAnnotations();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete annotation");
    }
  }

  function seekTo(time: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  }

  if (!video) return (
    <>
      <Navbar />
      <div className="loading"><span className="spinner" /> Loading video…</div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="container video-page">
        <Link to="/" className="back-link">← Back to videos</Link>
        <h1 className="video-title">{video.filename}</h1>

        <div className="video-player-wrap">
          <video ref={videoRef} controls src={`${API}${video.url}`} />
        </div>

        <div className="annotation-form">
          <h2>Add Annotation</h2>
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
          <form onSubmit={handleSave}>
            <div className="time-row">
              <div className="form-group">
                <label>Start Time (HH:MM:SS)</label>
                <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="e.g. 00:01:30" />
                <button type="button" className="btn-capture" onClick={() => captureTime(setStartTime)}>⏱ Capture current time</button>
              </div>
              <div className="form-group">
                <label>End Time (HH:MM:SS)</label>
                <input type="text" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="e.g. 00:02:15" />
                <button type="button" className="btn-capture" onClick={() => captureTime(setEndTime)}>⏱ Capture current time</button>
              </div>
            </div>
            <div className="form-group">
              <label>Comment</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe this section…" />
            </div>
            <button className="btn btn-sm" type="submit" disabled={saving}>
              {saving && <span className="spinner" />}
              Save Annotation
            </button>
          </form>
        </div>

        <div className="annotations-section">
          <h2>Annotations ({annotations.length})</h2>
          {annotations.length === 0 ? (
            <div className="empty-state" style={{padding: "30px"}}>
              <p>No annotations yet. Add one above!</p>
            </div>
          ) : (
            annotations.map(a => (
              <div key={a.id} className="annotation-item" onClick={() => seekTo(a.start_time)} title="Click to seek to this timestamp" style={{ position: 'relative' }}>
                <button 
                  onClick={(e) => handleDeleteAnnotation(e, a.id)}
                  style={{
                    position: 'absolute', top: '16px', right: '16px', 
                    background: 'transparent', color: 'var(--danger)', 
                    border: '1px solid var(--danger)', borderRadius: '4px', padding: '2px 8px', 
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10
                  }}
                  title="Delete Annotation"
                >
                  Delete
                </button>
                <div className="annotation-timestamp">
                  {formatTime(a.start_time)} → {formatTime(a.end_time)}
                </div>
                <div className="annotation-comment" style={{ paddingRight: '60px' }}>{a.comment}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/video/:id" element={<VideoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
