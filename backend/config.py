import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/videoannotations")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
