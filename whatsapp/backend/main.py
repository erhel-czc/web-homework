from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select

# Database setup

DATABASE_URL = "sqlite:///./whatsapp.db"
engine = create_engine(DATABASE_URL, echo=True)


class User(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    username: str = Field(index=True)


class Message(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    sender_id: int
    room_id: int
    content: str


class Room(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    name: str


SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

# API setup


app = FastAPI()

# Simple CORS setup for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/send")
def send_message(sender_id: int, room_id: int, content: str, session: Session = Depends(get_session)):
    message = Message(sender_id=sender_id, room_id=room_id, content=content)
    session.add(message)
    session.commit()
    session.refresh(message)

    return {"status": "Message sent", "message": {
        "id": message.id,
        "sender_id": message.sender_id,
        "room_id": message.room_id,
        "content": message.content
    }}


@app.post("/users")
def create_user(username: str, session: Session = Depends(get_session)):
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    statement = select(User).where(User.username == username)
    existing_user = session.exec(statement).first()

    if existing_user:
        return existing_user

    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.post("/rooms")
def create_room(name: str, session: Session = Depends(get_session)):
    room = Room(name=name)
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@app.get("/rooms")
def list_rooms(session: Session = Depends(get_session)):
    statement = select(Room)
    results = session.exec(statement).all()
    return [
        {
            "id": room.id,
            "name": room.name,
        }
        for room in results
    ]


@app.get("/messages/{room_id}")
def get_messages(room_id: int, session: Session = Depends(get_session)):
    statement = select(Message).where(Message.room_id == room_id)
    results = session.exec(statement).all()

    messages = [
        {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "room_id": msg.room_id,
            "content": msg.content
        }
        for msg in results
    ]

    return {"messages": messages}
