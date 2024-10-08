import express from "express";
import http from "http";
import WebSocket from "ws";
import {Server} from "socket.io";
import { instrument } from "@socket.io/admin-ui";

/* BACK */

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
// 정적 파일 제공 라우팅
app.use("/public", express.static(__dirname + "/public"));

// get 요청 처리하는 라우트 핸들러
app.get("/", (req,res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));


const httpServer = http.createServer(app); // http 서버를 띄움
// const wss = new WebSocket.Server({server}); // 웹소켓 서버를 띄움
const wsServer =new Server(httpServer, {
    cors: {
      origin: ["https://admin.socket.io"],
      credentials: true
    }
  }); // 위 코드와 동일한 기능


  instrument(wsServer, {
    auth: false
  });


// 나와의 대화방을 제외한 모든 대화방을 []로 반환
function publicRooms() {
    // 모든 소켓의 id
    const sids = wsServer.sockets.adapter.sids;
    // 모든 대화방의 id -> 나와의 대화방도 있기 때문에 내 socket id를 가진 대화방도 있다
    const rooms = wsServer.sockets.adapter.rooms;

    const publicRooms = [];
    // 나와의 대화방 제외하고 []에 넣기
    rooms.forEach((_,key) => {
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

// 채팅방 갯수 세기
function countRoom(roomName) {
    const cnt = wsServer.sockets.adapter.rooms.get(roomName)?.size;

    return cnt;
}


// 클라이언트가 연결되었을 때
wsServer.on("connection", (socket) => {
    socket.onAny((event)=> {
        console.log(`Socket Event : ${event}`); 
    });

    socket["nickname"] = "Anon"; // 닉네임 초기설정


    // 클라이언트가 채팅방에 들어왔을 때
    socket.on("enter_room", (roomName, done) => {
    
        // 브라우저를 그룹에 추가해줌
        socket.join(roomName.payload);
        done(countRoom(roomName.payload)); // 프론트 함수 실행. argument 전달 가능

        // 방에 welcome 이벤트와 newUser 닉네임을 보내줌
        socket.to(roomName.payload).emit("welcome", socket.nickname, countRoom(roomName.payload));

        // 모든 소켓에게 public rooms 의 현 상태를 보여줌
        wsServer.sockets.emit("room_change", publicRooms());
    });


    // 클라이언트의 연결이 끊기고 방을 나가기 전일 때
    socket.on("disconnecting", ()=> {
        console.log("disconnecting worked");
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room)-1));
    });


    socket.on("disconnect", ()=> {
        wsServer.sockets.emit("room_change", publicRooms());
    });


    // 클라이언트가 새로운 메시지를 보냈을 때
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
        done();
    });


    // 클라이언트가 닉네임을 보냈을 때, 소켓에 닉네임 속성 지정
    socket.on("nickname", (nickname) => {
        socket["nickname"] = nickname;
    });


});



/* // RAW WEBSOCKET 방식 

const sockets = [];


// 웹소켓 서버가 연결되면 수행될 함수
wss.on("connection", (socket) => { // socket = 연결된 브라우저
    console.log("Connected To Browser");

    sockets.push(socket); // 모든 브라우저를 연결하기 위함
    socket["nickname"] = "Anon"; // 각 소켓에 닉네임 부여
    console.log(socket);

    // 브라우저가 닫히는 경우
    socket.on("close", ()=>  console.log("Disconnected from Browser"));


    // 브라우저로부터 메시지를 받은 경우
    socket.on("message", (message)=> {
        const parsedMsg = JSON.parse(message);
        switch(parsedMsg.type) {
            case "new_message" : 
                sockets.forEach(aSocket => aSocket.send(`${socket.nickname} : ${parsedMsg.payload}`)); // 모든 브라우저에게 메시지 보내기
                break;

            case "nickname" : 
                socket["nickname"] = parsedMsg.payload; // 각 소켓에 닉네임 부여
        }       
    });
});
 */

const handleListen = () => console.log("listening on port 3020");
httpServer.listen(3020, handleListen);

