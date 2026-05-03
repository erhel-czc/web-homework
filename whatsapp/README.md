# WhatsApp-like Web App

A real-time messaging web application built with **FastAPI**, **WebSockets**, **SQLite**, and a JS/HTML/CSS frontend.

---

## Features

- Select a predefined username to join the app (no registration or password required)
- Browse all available rooms
- Subscribe to / unsubscribe from rooms
- Enter a room to see its full message history
- Send and receive messages in real time via WebSockets

---

## Requirements

- Python 3.10+
- [`fastapi[standard]`](https://fastapi.tiangolo.com/), [`sqlmodel`](https://sqlmodel.tiangolo.com/)
- [`httpie`](https://httpie.io/) (optional, for CLI commands below)

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Running the App

### 1. Start the backend

```bash
cd backend
fastapi dev main.py
```

The API will be available at `http://localhost:8000`.

To start fresh, wipe the database first:

```bash
rm backend/whatsapp.db
```

### 2. Open the frontend

#### Option 1: Without a local server
Open `frontend/index.html` directly in your browser (no build step needed).

#### Option 2: With a local server
- Using vite:
```bash
cd frontend
npx vite
```

- Using the live server extension in VS Code

**Warning** While developing this app, I faced an issue when a change occurred in the database (e.g. a new message was sent): the live server reloaded the whole session (which meant losing the current username for example). To avoid this, add the following line to your `.vscode/settings.json`:

```json
"liveServer.settings.root": "/frontend"
```
---

## Creating Users and Rooms

Users and rooms are managed via the API (e.g. from a second terminal using `httpie`):

```bash
# Create users
http POST http://localhost:8000/users username=alice
http POST http://localhost:8000/users username=bob

# Create rooms
http POST http://localhost:8000/rooms name=social
http POST http://localhost:8000/rooms name=sports
http POST http://localhost:8000/rooms name=bde
```

---

## API Overview

Interactive API docs are available at `http://localhost:8000/docs`.
