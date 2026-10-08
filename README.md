# Video Annotation App

A full-stack web application designed for uploading videos and adding timestamped annotations. 

## ✨ Features

- **Video Management**: Upload `.mp4` video files to a local gallery.
- **Video Playback**: Stream and watch videos directly in the browser.
- **Timestamped Annotations**: 
  - Add specific start and end times for notes (supports `HH:MM:SS` format).
  - Use the "⏱ Capture current time" button to automatically grab the exact playback position.
- **Annotation Previews**: View a summary of all annotations directly on the homepage video grid.
- **Full Deletion Control**: 
  - Delete individual annotations.
  - Delete entire videos (automatically removes the physical file and cascades to delete all associated annotations).

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, React Router, Axios. (Styled with modern custom CSS).
- **Backend**: Python, FastAPI, SQLAlchemy, Uvicorn.
- **Database**: PostgreSQL (Relational schema with `videos` and `annotations` tables).

---

## 📋 Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** running locally on port `5432` with default credentials (user: `postgres`, password: `postgres`). 
  *Note: The backend will automatically create the `videoannotations` database on first run if it doesn't already exist.*

---

## 🚀 How to Run (One-Click)

You can instantly start both the backend and frontend at the same time using the provided runner scripts.

**On Mac/Linux / Git Bash:**
```bash
bash run.sh
```
*(This starts both servers in the background. Press `Ctrl+C` to cleanly terminate them).*

---

## ⚙️ Manual Setup (Optional)

If you prefer to run the components separately:

### 1. Backend API
```bash
cd backend
pip install -r requirements.txt
python run.py
```
The FastAPI backend will start at `http://localhost:8000`.

### 2. Frontend UI
Open a new terminal tab:
```bash
cd frontend
npm install
npm run dev
```
The React frontend will start at `http://localhost:5173`. 
