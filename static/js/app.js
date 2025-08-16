// static/app.js
class VideoChat {
    constructor() {
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.socket = null;
        this.peerConnection = null;
        this.clientId = this.generateId();

        this.initWebSocket();
        this.setupPeerConnection();
    }

    initWebSocket() {
        this.socket = new WebSocket(`ws://localhost:8000/ws/${this.clientId}`);

        this.socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await this.handleSignaling(message);
        };
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        // Обработка ICE кандидатов
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    target: this.targetId
                });
            }
        };

        // Получение удаленного потока
        this.peerConnection.ontrack = (event) => {
            this.remoteVideo.srcObject = event.streams[0];
        };
    }

    async startCall(targetId) {
        this.targetId = targetId;

        // Получение локального видео
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        this.localVideo.srcObject = stream;

        // Добавление треков в соединение
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });

        // Создание offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.sendSignal({
            type: 'offer',
            offer: offer,
            target: targetId
        });
    }

    async handleSignaling(message) {
        switch (message.type) {
            case 'offer':
                await this.handleOffer(message);
                break;
            case 'answer':
                await this.handleAnswer(message);
                break;
            case 'ice-candidate':
                await this.handleIceCandidate(message);
                break;
        }
    }

    async handleOffer(message) {
        this.targetId = message.sender;

        // Получение локального потока
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        this.localVideo.srcObject = stream;
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });

        // Установка удаленного описания
        await this.peerConnection.setRemoteDescription(message.offer);

        // Создание ответа
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignal({
            type: 'answer',
            answer: answer,
            target: message.sender
        });
    }

    async handleAnswer(message) {
        await this.peerConnection.setRemoteDescription(message.answer);
    }

    async handleIceCandidate(message) {
        await this.peerConnection.addIceCandidate(message.candidate);
    }

    sendSignal(message) {
        this.socket.send(JSON.stringify(message));
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
}

// Инициализация
const videoChat = new VideoChat();