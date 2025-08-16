# Video Call - WebRTC Video Calling with Python

A simple web application for peer-to-peer video calling using WebRTC, FastAPI, and WebSocket.

[https://webcalls-python.onrender.com](https://webcalls-python.onrender.com)

> WebRTC (Web Real-Time Communication) is an open source technology that allows the transmission of audio, video, and data in real time through web browsers. This is not a separate program, but a set of protocols and APIs built into modern browsers.

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Browser 1     │◄────────────────►│  Python Server  │
│   (WebRTC)      │   (Signaling)    │   (FastAPI)     │
└─────────────────┘                  └─────────────────┘
         ▲                                     ▲
         │            P2P WebRTC              │
         │         (Direct Connection)        │
         ▼                                     ▼
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Browser 2     │◄────────────────►│                 │
│   (WebRTC)      │   (Signaling)    │                 │
└─────────────────┘                  └─────────────────┘
```

## 🛠️ Technologies

**Backend:**
- FastAPI - web framework
- WebSocket - real-time communication
- Uvicorn - ASGI server

**Frontend:**
- WebRTC API - video/audio transmission
- JavaScript ES6+ - client-side logic
- HTML5/CSS3 - user interface

## 🚀 Quick Start

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/Leostrykov/WebCalls_Python.git
cd WebCalls_Python
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run the server:**
```bash
python app.py
```

5. **Open browser:**
```
http://localhost:8000
```

### Testing

1. Open the application in **two different browser tabs**
2. Copy the ID from the first tab
3. Paste the ID into the second tab and click "Start Call"
4. Allow camera and microphone access in both tabs

## 🎯 API Endpoints

### WebSocket
- `GET /ws/{client_id}` - WebSocket connection for signaling

### HTTP
- `GET /` - Main application page
- `GET /static/*` - Static files (CSS, JS, images)

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 👥 Authors

- **Leonid Strukov** - [GitHub](https://github.com/Leostrykov)
