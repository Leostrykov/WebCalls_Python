// static/app.js
class VideoChat {
    constructor() {
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.socket = null;
        this.peerConnection = null;
        this.clientId = this.generateId();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.pendingIceCandidates = []; // Буфер для ICE кандидатов
        this.localStream = null;

        this.initWebSocket();
        this.setupPeerConnection();
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.clientId}`;

        console.log('Подключение к:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('WebSocket подключен');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('WebSocket подключен');
        };

        this.socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await this.handleSignaling(message);
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket закрыт:', event.code, event.reason);
            this.updateConnectionStatus(`Соединение закрыто: ${event.code}`);
            this.handleWebSocketClose();
        };

        this.socket.onerror = (error) => {
            console.error('Ошибка WebSocket:', error);
            console.log('WebSocket readyState:', this.socket.readyState);
            this.updateConnectionStatus('Ошибка подключения');
        };
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
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
            console.log('Получен удаленный поток');
            this.remoteVideo.srcObject = event.streams[0];
        };

        // Обработка изменения состояния соединения
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Состояние соединения:', this.peerConnection.connectionState);
            this.updateConnectionStatus(`WebRTC: ${this.peerConnection.connectionState}`);
        };
    }

    async getUserMedia() {
        try {
            // Остановить предыдущий поток если есть
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.localStream = stream;
            this.localVideo.srcObject = stream;

            return stream;

        } catch (error) {
            console.error('Ошибка получения медиа:', error);

            // Попробуем с базовыми настройками
            try {
                const basicStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                this.localStream = basicStream;
                this.localVideo.srcObject = basicStream;
                return basicStream;
            } catch (basicError) {
                console.error('Не удалось получить доступ к камере/микрофону:', basicError);
                alert('Не удалось получить доступ к камере или микрофону. Проверьте разрешения браузера.');
                throw basicError;
            }
        }
    }

    async startCall(targetId) {
        try {
            this.targetId = targetId;

            // Получение локального видео
            const stream = await this.getUserMedia();

            // Добавление треков в соединение
            stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, stream);
            });

            // Создание offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.peerConnection.setLocalDescription(offer);

            this.sendSignal({
                type: 'offer',
                offer: offer,
                target: targetId
            });

            console.log('Отправлен offer');

        } catch (error) {
            console.error('Ошибка при начале звонка:', error);
            this.updateConnectionStatus('Ошибка при начале звонка');
        }
    }

    async handleSignaling(message) {
        try {
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
        } catch (error) {
            console.error('Ошибка обработки сигнала:', error);
        }
    }

    async handleOffer(message) {
        console.log('Получен offer');
        this.targetId = message.sender;

        // Получение локального потока
        const stream = await this.getUserMedia();
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });

        // Установка удаленного описания
        await this.peerConnection.setRemoteDescription(message.offer);

        // Обработка отложенных ICE кандидатов
        await this.processPendingIceCandidates();

        // Создание ответа
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignal({
            type: 'answer',
            answer: answer,
            target: message.sender
        });

        console.log('Отправлен answer');
    }

    async handleAnswer(message) {
        console.log('Получен answer');
        await this.peerConnection.setRemoteDescription(message.answer);

        // Обработка отложенных ICE кандидатов
        await this.processPendingIceCandidates();
    }

    async handleIceCandidate(message) {
        console.log('Получен ICE кандидат');

        // Если remote description еще не установлено, добавляем в буфер
        if (!this.peerConnection.remoteDescription) {
            this.pendingIceCandidates.push(message.candidate);
            console.log('ICE кандидат добавлен в буфер');
            return;
        }

        try {
            await this.peerConnection.addIceCandidate(message.candidate);
            console.log('ICE кандидат добавлен');
        } catch (error) {
            console.error('Ошибка добавления ICE кандидата:', error);
        }
    }

    async processPendingIceCandidates() {
        console.log(`Обработка ${this.pendingIceCandidates.length} отложенных ICE кандидатов`);

        for (const candidate of this.pendingIceCandidates) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
                console.log('Отложенный ICE кандидат добавлен');
            } catch (error) {
                console.error('Ошибка добавления отложенного ICE кандидата:', error);
            }
        }

        this.pendingIceCandidates = [];
    }

    handleWebSocketClose() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => {
                this.initWebSocket();
            }, 1000 * this.reconnectAttempts);
        } else {
            console.error('Максимальное количество попыток переподключения превышено');
        }
    }

    reconnectWebSocket() {
        if (this.socket) {
            this.socket.close();
        }
        this.handleWebSocketClose();
    }

    sendSignal(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.log('WebSocket не подключен, переподключение...');
            this.reconnectWebSocket();
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = status.includes('подключен') || status.includes('connected') ? 'connected' : 'disconnected';
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Метод для завершения звонка
    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.setupPeerConnection(); // Пересоздаем для нового звонка
        }

        this.localVideo.srcObject = null;
        this.remoteVideo.srcObject = null;
        this.pendingIceCandidates = [];

        this.updateConnectionStatus('Звонок завершен');
    }
}

// Инициализация
const videoChat = new VideoChat();