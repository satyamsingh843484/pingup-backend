import { io } from 'socket.io-client';

// autoConnect: false hata diya, ab ye app khulte hi zinda ho jayega
const socket = io('http://10.190.47.168:3000');

export default socket;