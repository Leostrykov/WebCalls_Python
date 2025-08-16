# app.py - FastAPI с WebSocket
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import asyncio
import uvicorn

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Хранилище активных соединений
connections = {}
rooms = {}


with open('./static/templates/index.html', encoding="utf-8") as file:
    html = file.read()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    connections[client_id] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Обработка сигналов WebRTC
            await handle_signaling(message, client_id)

    except Exception as e:
        if client_id in connections:
            del connections[client_id]


@app.get("/")
def index():
    return HTMLResponse(html)


async def handle_signaling(message, sender_id):
    msg_type = message.get("type")
    target_id = message.get("target")

    if target_id and target_id in connections:
        message["sender"] = sender_id
        await connections[target_id].send_text(json.dumps(message))

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=8000)