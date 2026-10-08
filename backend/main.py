import os
import shutil
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
import config
import models

models.Base.metadata.create_all(bind=models.engine)
os.makedirs(config.UPLOAD_DIR, exist_ok=True)
app = FastAPI(title="Video Annotation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")


def get_db():
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Videos ---

@app.post("/videos", status_code=201)
def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    safe_name = f"{datetime.utcnow().timestamp()}_{file.filename}"
    file_path = os.path.join(config.UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    video = models.Video(filename=file.filename, file_path=file_path)
    db.add(video)
    db.commit()
    db.refresh(video)
    return {"id": video.id, "filename": video.filename, "created_at": video.created_at}


@app.get("/videos")
def list_videos(db: Session = Depends(get_db)):
    videos = db.query(models.Video).order_by(models.Video.created_at.desc()).all()
    result = []
    for v in videos:
        annotations = db.query(models.Annotation).filter(models.Annotation.video_id == v.id).order_by(models.Annotation.start_time).all()
        result.append({
            "id": v.id, 
            "filename": v.filename, 
            "created_at": v.created_at,
            "annotations": [
                {
                    "id": a.id,
                    "start_time": a.start_time,
                    "end_time": a.end_time,
                    "comment": a.comment,
                } for a in annotations
            ]
        })
    return result


@app.get("/videos/{video_id}")
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    filename = os.path.basename(video.file_path)
    return {
        "id": video.id,
        "filename": video.filename,
        "url": f"/uploads/{filename}",
        "created_at": video.created_at,
    }


@app.delete("/videos/{video_id}", status_code=204)
def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Try to delete the physical file
    try:
        if os.path.exists(video.file_path):
            os.remove(video.file_path)
    except Exception as e:
        print(f"Warning: Failed to delete file {video.file_path}: {e}")
        
    db.delete(video)
    db.commit()
    return None

class AnnotationRequest(BaseModel):
    start_time: float
    end_time: float
    comment: str


@app.post("/videos/{video_id}/annotations", status_code=201)
def create_annotation(video_id: int, body: AnnotationRequest, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if body.end_time <= body.start_time:
        raise HTTPException(status_code=400, detail="end_time must be greater than start_time")
    annotation = models.Annotation(
        video_id=video_id,
        start_time=body.start_time,
        end_time=body.end_time,
        comment=body.comment,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return {
        "id": annotation.id,
        "start_time": annotation.start_time,
        "end_time": annotation.end_time,
        "comment": annotation.comment,
        "created_at": annotation.created_at,
    }


@app.get("/videos/{video_id}/annotations")
def list_annotations(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    annotations = db.query(models.Annotation).filter(models.Annotation.video_id == video_id).order_by(models.Annotation.start_time).all()
    return [
        {
            "id": a.id,
            "start_time": a.start_time,
            "end_time": a.end_time,
            "comment": a.comment,
            "created_at": a.created_at,
        }
        for a in annotations
    ]

@app.delete("/annotations/{annotation_id}", status_code=204)
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    db.delete(annotation)
    db.commit()
    return None