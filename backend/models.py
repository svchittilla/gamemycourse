from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db import Base

# Users
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    courses = relationship("Course", back_populates="user")
    sessions = relationship("Session", back_populates="user")

# Courses
class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    structure = Column(JSON, nullable=True)          # LLM-generated game structure
    avg_engagement = Column(Float, nullable=True, default=0.0)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="courses")
    missions = relationship("Mission", back_populates="course")

# Missions (levels)
class Mission(Base):
    __tablename__ = "missions"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    level = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    engagement_score = Column(Float, nullable=True)  # avg of sessions for this mission
    created_at = Column(DateTime, server_default=func.now())

    course = relationship("Course", back_populates="missions")
    sessions = relationship("Session", back_populates="mission")

# Sessions (extension tracking)
class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)  # from extension
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=True)
    url = Column(String)
    content_type = Column(String)                          # 'video' | 'article' | 'webpage'
    started_at = Column(DateTime, server_default=func.now())
    last_seen_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_pred_engagement = Column(Float, nullable=True)
    is_video = Column(Boolean)
    ended = Column(Boolean, default=False)

    user = relationship("User", back_populates="sessions")
    mission = relationship("Mission", back_populates="sessions")
    events = relationship("EngagementEvent", back_populates="session")

# Engagement Events (raw pings)
class EngagementEvent(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    session_id_fk = Column(Integer, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, server_default=func.now())
    payload = Column(JSON)  # full engagement dict from extension

    session = relationship("Session", back_populates="events")
