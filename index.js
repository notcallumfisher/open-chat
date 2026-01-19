// callum fisher - 2026.01.17 - 2026.01.18

import { Server } from 'socket.io';
import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';

const port = process.env.PORT || 8080;
const beVerbose = true;

const app = express();
const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: '*'
	}
});

app.get('/', (req, res) => {
	res.status(200).sendFile(`${path.resolve('./client/index.html')}`);
});

app.get('/index.js', (req, res) => {
	res.status(200).sendFile(`${path.resolve('./client/index.js')}`);
});

app.get('/socket.io.min.js', (req, res) => {
	res.status(200).sendFile(`${path.resolve('./client/socket.io.min.js')}`);
});

app.get('*', (req, res) => {
	res.status(404).send('404')
});

server.listen(port, () => {
    if (beVerbose) console.log(`server launched @ ${port}`);
});

// settings:

let maxMessageLength = 512;
let maxChatHistory = 20;
let chatHistory = [{
	't': Date.now(),
	'n': 'Server',
	'c': '#fff',
	'm': 'Hello, send a nice message :-)'
}];

let maxIdleTime = 300000;
let maxClientsPerIPA = 2;
let maxClients = 20;
let clients = [];
let clientColours = ['red','green','yellow','gray','cyan'];
let adjectives = [
	'happy',
	'angry',
	'quick',
	'green',
	'red',
	'pink'
];
let nouns = [
	'leopard',
	'dog',
	'potato',
	'panther',
	'slab',
	'leg'
];
let forgeName = () => {
	let adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	adjective = adjective.split('');
	adjective[0] = adjective[0].toUpperCase();
	let noun = nouns[Math.floor(Math.random() * nouns.length)];
	noun = noun.split('');
	noun[0] = noun[0].toUpperCase();
	return `${adjective.join()}${noun.join()}${Math.floor(Math.random() * 99)}`;
}

const forgeID = () => {
    return Math.floor(Math.random() * 90000);
}

const checkIPA = ipa => {
    let count = 0;
    clients.forEach(client => (client.ipa === ipa && count ++));
    return count;
}

const updateClients = () => {
    let filteredClients = [];
    clients.forEach(client => {
        filteredClients.push({
            id: client.id,
            n: client.name,
			c: client.colour
        });
    });
    io.emit('max', maxClients);
    io.emit('clients', filteredClients);
}

const sayBye = (client, code) => {
    if (!code) code = 'kick';
    client.socket.emit('bye', code);
    client.socket.disconnect();
   // clients.splice(clients.indexOf(client), 1);
	// updateClients();
}

io.on('connection', socket => {
    let ipa = socket.handshake.address;
    if (checkIPA(ipa) >= maxClientsPerIPA) {
        socket.emit('bye', 'busy');
        socket.disconnect();
        return;
    }
    let now = Date.now();
    if (clients.length + 1 > maxClients) {
        socket.emit('bye', 'busy');
        socket.disconnect();
        return;
    }
    let client = {
        socket: socket,
        id: forgeID(),
		colour: clientColours[Math.floor(Math.random() * clientColours.length)],
        lastPulse: now,
        lastActive: now,
        lastMessage: '',
        ipa: ipa
    }
    client.name = forgeName();
    clients.push(client);
    if (beVerbose) console.log(`connect #${client.id}`);
    updateClients();
	socket.on('disconnect', () => {
        if (beVerbose) console.log(`disconnect #${client.id}`);
        clients.splice(clients.indexOf(client), 1);
        updateClients();
    });
    socket.emit('chistory', chatHistory);
    socket.on('chistory', () => {
        socket.emit('chistory', chatHistory);
    });
    socket.on('msg', msg => {
        if (typeof msg !== 'object' || typeof msg.m !== 'string' || msg.m.length > maxMessageLength) {
            sayBye(client, 'kick');
            return;
        }

        let lastActive = client.lastActive;

        // update lastActive:
        let now = Date.now();
        if (now - lastActive < 1000) {
            autoMod.chaos ++;
            return;
        }
        client.lastActive = now;

        // filtering & moderation:
        msg.m = msg.m.replace(/</g,'&lt;').replace(/>/g,'&gt;'); // prevent html
        
        if (msg.m === client.lastMessage && (now - lastActive < 2000)) return;

        // create outgoing message:
        msg = {
            t: now,
            n: client.name,
			c: client.colour,
            m: msg.m
        };

        // send:
        io.emit('msg', msg);

        // chat history:
        chatHistory.push(msg);
        if (chatHistory.length > maxChatHistory) chatHistory.splice(0, 1)[0];
        client.lastMessage = msg.m;
    });
});

setInterval(() => {
    clients.forEach(client => {
        // check user activity:
        if (Date.now() - client.lastActive > maxIdleTime) {
            if (beVerbose) console.log(`disconnect #${client.id} (idle)`);
            sayBye(client, 'idle');
        }
    });
}, maxIdleTime);
