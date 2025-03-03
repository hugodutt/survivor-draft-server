# Survivor Draft Server

Backend server for the Survivor Draft game.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Start production server:
```bash
npm start
```

## Environment Variables

- `PORT`: Server port (default: 3001)

## API Endpoints

- `GET /api/scenarios`: Get available scenarios
- `POST /api/rooms`: Create a new room
- `POST /api/rooms/:code/join`: Join an existing room

## Socket.IO Events

- `join-room`: Join a room
- `player-ready`: Toggle player ready status
- `start-game`: Start the game
- `select-item`: Select an item
- `vote`: Vote for a player 