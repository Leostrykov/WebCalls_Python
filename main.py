import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import asyncio
import json
from aiortc import RTCPeerConnection, RTCSessionDescription

app = FastAPI()

# Хранилище для WebSocket-соединений
connections = {}

# HTML-страница для фронтенда
with open('index.html', 'r', encoding="UTF8") as file:
    html = file.read()

@app.get("/")
async def get():
    return HTMLResponse(html)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections[id(websocket)] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Рассылаем сообщение всем подключенным клиентам, кроме отправителя
            for conn_id, conn in connections.items():
                if conn_id != id(websocket):
                    await conn.send_text(data)
    except Exception:
        del connections[id(websocket)]
        await websocket.close()

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8080)