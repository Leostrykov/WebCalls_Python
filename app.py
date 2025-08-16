from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import logging
import uvicorn

app = FastAPI()

# Статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")


# Главная страница
@app.get("/")
async def get_index():
    return FileResponse('static/templates/index.html')


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

connections = {}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    connections[client_id] = websocket
    logger.info(f"Клиент {client_id} подключен")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_signaling(message, client_id)

    except WebSocketDisconnect:
        logger.info(f"Клиент {client_id} отключился")
    except Exception as e:
        logger.error(f"Ошибка для клиента {client_id}: {e}")
    finally:
        if client_id in connections:
            del connections[client_id]
            logger.info(f"Клиент {client_id} удален из списка подключений")


async def handle_signaling(message, sender_id):
    msg_type = message.get("type")
    target_id = message.get("target")

    if target_id and target_id in connections:
        try:
            message["sender"] = sender_id
            await connections[target_id].send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Ошибка отправки сообщения от {sender_id} к {target_id}: {e}")
            if target_id in connections:
                del connections[target_id]
    else:
        logger.warning(f"Целевой клиент {target_id} не найден")

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=8000)