import { io } from 'socket.io-client';

const socket = io('https://pingup-backend-v25a.onrender.com');

export default socket;