from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
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


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            await connection.send_json(data)


manager = ConnectionManager()

# Simple CORS setup for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/send")
async def send_message(sender_id: int, room_id: int, content: str, session: Session = Depends(get_session)):
    message = Message(sender_id=sender_id, room_id=room_id, content=content)
    session.add(message)
    session.commit()
    session.refresh(message)

    sender = session.get(User, message.sender_id)
    message_data = {
        "id": message.id,
        "sender_id": message.sender_id,
        "sender_username": sender.username if sender else None,
        "room_id": message.room_id,
        "content": message.content,
    }

    await manager.broadcast(message_data)

    return {"status": "Message sent", "message": message_data}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open and detect disconnections.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


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

    messages = []
    for msg in results:
        sender = session.get(User, msg.sender_id)
        messages.append(
            {
                "id": msg.id,
                "sender_id": msg.sender_id,
                "sender_username": sender.username if sender else None,
                "room_id": msg.room_id,
                "content": msg.content,
            }
        )

    return {"messages": messages}


@app.get("/users")
def list_users(session: Session = Depends(get_session)):
    statement = select(User)
    results = session.exec(statement).all()

    return [
        {
            "id": user.id,
            "username": user.username,
        }
        for user in results
    ]
