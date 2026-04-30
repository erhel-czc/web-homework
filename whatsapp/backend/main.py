from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select

# --- Database setup ---

DATABASE_URL = "sqlite:///./whatsapp.db"
engine = create_engine(DATABASE_URL, echo=True)


# --- Tables ---

class User(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    username: str = Field(index=True)


class Room(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    name: str


class Subscription(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    user_id: int
    room_id: int


class Message(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    sender_id: int
    room_id: int
    content: str


SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


# --- App setup ---

app = FastAPI()

# Simple CORS setup for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, room_id: int, websocket: WebSocket):
        await websocket.accept()

        # check if room_id exists in active_connections
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []

        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: int, websocket: WebSocket):
        self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: int, data: dict):
        for connection in self.active_connections.get(room_id, []):
            await connection.send_json(data)


manager = ConnectionManager()

# --- API Endpoints ---

# Users

@app.get("/users")
def list_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    
    return [{"id": u.id, "username": u.username} for u in users]


@app.post("/users")
def create_user(username: str, session: Session = Depends(get_session)):
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    existing_user = session.exec(
        select(User).where(User.username == username)).first()
    if existing_user:
        return existing_user

    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)

    return user


# Rooms

@app.get("/rooms")
def list_rooms(session: Session = Depends(get_session)):
    rooms = session.exec(select(Room)).all()

    return [{"id": room.id, "name": room.name} for room in rooms]


@app.post("/rooms")
def create_room(name: str, session: Session = Depends(get_session)):
    room = Room(name=name)
    session.add(room)
    session.commit()
    session.refresh(room)

    return room


# Subscriptions

@app.post("/rooms/{room_id}/subscribe")
def subscribe(room_id: int, user_id: int, session: Session = Depends(get_session)):
    room = session.get(Room, room_id)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    user = session.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    statement = select(Subscription).where(Subscription.user_id == user_id,
                                           Subscription.room_id == room_id)
    existing = session.exec(statement).first()

    if existing:
        return existing

    sub = Subscription(user_id=user_id, room_id=room_id)
    session.add(sub)
    session.commit()
    session.refresh(sub)

    return sub


@app.delete("/rooms/{room_id}/subscribe")
def unsubscribe(room_id: int, user_id: int, session: Session = Depends(get_session)):
    statement = select(Subscription).where(Subscription.user_id == user_id,
                                           Subscription.room_id == room_id)
    sub = session.exec(statement).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    session.delete(sub)
    session.commit()

    return {"status": "Unsubscribed"}


@app.get("/users/{user_id}/subscriptions")
def user_subscriptions(user_id: int, session: Session = Depends(get_session)):
    subs = session.exec(select(Subscription).where(
        Subscription.user_id == user_id)).all()
    
    return {"room_ids": [s.room_id for s in subs]}


# Messages

@app.get("/messages/{room_id}")
def get_messages(room_id: int, session: Session = Depends(get_session)):
    results = session.exec(select(Message).where(
        Message.room_id == room_id)).all()
    
    messages = []

    for msg in results:
        sender = session.get(User, msg.sender_id)
        messages.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_username": sender.username if sender else None,
            "room_id": msg.room_id,
            "content": msg.content,
        })

    return {"messages": messages}


@app.post("/messages")
async def send_message(sender_id: int, room_id: int, content: str, session: Session = Depends(get_session)):
    statement = select(Subscription).where(Subscription.user_id == sender_id,
                                           Subscription.room_id == room_id)
    sub = session.exec(statement).first()

    if not sub:
        raise HTTPException(
            status_code=403, detail="User is not subscribed to this room")

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

    await manager.broadcast(room_id, message_data)

    return {"status": "Message sent", "message": message_data}


# WebSocket

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int):
    await manager.connect(room_id, websocket)

    try:
        while True:
            # Keep the connection open and detect disconnections.
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
