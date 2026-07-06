import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:3000");

socket.on("connect", () => {
  console.log("Conectado com sucesso! ID:", socket.id);
});

(socket.on("connect_error"),
  (err) => {
    console.log("Erro detalhado:", err.message);
  });
