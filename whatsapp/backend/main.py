from fastapi import FastAPI, HTTPException, Depends
from sqlmodel import SQLModel, Field, Session, create_engine, select

# Database setup

DATABASE_URL = "sqlite:///./whatsapp.db"
engine = create_engine(DATABASE_URL, echo=True)


class User(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    username: str
    password: str


class Message(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    sender_id: int
    receiver_id: int
    content: str


SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

# API setup

app = FastAPI()

@app.post("/send")
def send_message(sender_id: int, receiver_id: int, content: str, session: Session = Depends(get_session)):
    message = Message(sender_id=sender_id, receiver_id=receiver_id, content=content)
    session.add(message)
    session.commit()
    session.refresh(message)

    return {"status": "Message sent", "message": {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content
    }}

@app.get("/messages/{user_id}")
def get_messages(user_id: int, session: Session = Depends(get_session)):
    statement = select(Message).where(Message.receiver_id == user_id)
    results = session.exec(statement).all()
    
    messages = [
        {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content
        }
        for msg in results
    ]

    return {"messages": messages}
