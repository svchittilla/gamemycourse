from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import Base, engine
from models import *
from routers import events

app = FastAPI(title="GameMyCourse API", version="1.0.0")

# Allow your extension + local dev pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in dev, you can keep "*"; later restrict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

app.include_router(events.router)

@app.get("/")
def root():
    return {"message": "GameMyCourse backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}