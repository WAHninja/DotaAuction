const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Create HTTP server to use with WebSocket
  const httpServer = createServer(server);

  // Create WebSocket server
  const wss = new WebSocket.Server({ server: httpServer });

  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Send a message when a new connection is made
    ws.send(JSON.stringify({ message: 'Connected to WebSocket server' }));

    // Handle incoming WebSocket messages
    ws.on('message', (data) => {
      console.log(`Received message: ${data}`);
    });
  });

  // Handle Next.js pages
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start the HTTP and WebSocket server
  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
