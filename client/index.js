// 2024.08.08

const revealText = (text, element) => {
    element = document.getElementById(element);
    element.innerHTML = "...";
    let i = -1;
    let revealTextInt = setInterval(() => {
        i ++;
        element.innerHTML += text.charAt(i);
        if (i == text.length) {
            element.innerHTML = text;
            clearInterval(revealTextInt);
        }
    }, 20);
}

const init = () => {
    startOpenChat();
    const form = document.getElementById("form");
    const input = document.getElementById("input");
    form.addEventListener("submit", (e) => {
    e.preventDefault();
        if (input.value) {
            openChat.sendToChat(input.value)
            input.value = "";
        }
    });
}

window.onload = () => {
    init();
}

let openChat;

const  startOpenChat = () => {
    openChat = {
        needChistory: true,
        maxClients: 20,
        client: io("https://open-chat.ondrender.com"),
        addToChat: msg => {
            let chat = document.getElementById("openChat");
            chat.innerHTML = `${chat.innerHTML}<br>${msg.n}: ${msg.m}`;
            chat.scrollTop = chat.scrollHeight;
        },
        sendToChat: msg => {
            if (typeof msg !== "string") return;
            openChat.client.emit("msg", {
                m: msg
            });
        },
        clearChat: () => {
            document.getElementById("openChat").innerHTML = "Chat cleared.";
        },
        setStatus: msg => {
            let status = document.getElementById("openChatStatus");
            status.innerHTML = msg;
        },
        quitCode: ""
    }
    
    openChat.client.on("max", max => {
        openChat.maxClients = max;
    });
    
    openChat.client.on("clients", clients => {
        let newStatus = "";
        clients.forEach(item => {
            newStatus += `${item.n} | `;
        });
        openChat.setStatus(`(${clients.length}/${openChat.maxClients}) | ${newStatus}`);
        
    });
    
    openChat.client.on("chistory", chistory => {
        if (typeof chistory !== "object") return;
        if (!openChat.needChistory) return;
        openChat.needChistory = false;
        openChat.clearChat();
        chistory.forEach(msg => {
            openChat.addToChat(msg);
        });
    });
    
    openChat.client.on("msg", msg => {
        if (typeof msg !== "object") return;
        openChat.addToChat(msg);
    });
    
    
    openChat.client.on("bye", code => {
        if (code) openChat.quitCode = code;
    });
    
    openChat.client.on("connect", () => {
        if (openChat.needChistory) openChat.client.emit("chistory");
        openChat.quitCode = "";
    });

    openChat.client.on("disconnect", () => {
        openChat.needChistory = true;
        let code = openChat.quitCode;
        openChat.setStatus(`Disconnected${code ? ": " + code : ""}`);
    });
    
    const dontComeBack = [
        "kick",
        "idle"
    ];

    openChat.client.on("p", pulseTime => {
        if (typeof pulseTime !== "number") return;
        openChat.pulseTime = pulseTime - 1;
    });

    openChat.sendPulse = () => {
        openChat.client.emit("p");
        setTimeout(() => {
            openChat.sendPulse();
        }, openChat.pulseTime ?? 1000);
    }

    openChat.sendPulse();

    openChat.autoReconnect = setInterval(() => {
        if (openChat.client.connected) return;
        if (dontComeBack.includes(openChat.quitCode)) {
            if (openChat.waitingForRedemption) return;
            openChat.waitingForRedemption = true;
            let buttonID;
            openChat.newButton("Reconnect", () => {
                openChat.quitCode = "";
                openChat.client.connect();
                openChat.waitingForRedemption = false;
                openChat.delButton(buttonID);
            }).then(id => {
                buttonID = id;
            });
        }
        if (dontComeBack.includes(openChat.quitCode)) return;
        if (!openChat.client.connected) {
            openChat.client.connect();
            openChat.setStatus("Reconnecting...");
        }
    }, 10000);

    openChat.buttonTracker = [];

    openChat.newButton = (label, onclick) => { // https://sebhastian.com/javascript-create-button/
        return new Promise ((resolve, reject) => {
            let btn = document.createElement("a");
            btn.classList.add("button");
            btn.classList.add("background");
            btn.innerHTML = label || data.temp.buttons.length;
            btn.addEventListener("click", onclick);
            document.getElementById("openChatButtons").appendChild(btn);
            resolve(openChat.buttonTracker.length);
            openChat.buttonTracker.push(btn);
        });
    }

    openChat.delButton = id => {
        document.getElementById("openChatButtons").removeChild(openChat.buttonTracker[id]);
        openChat.buttonTracker.splice(id, 1);
    }
    
}