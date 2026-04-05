const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, port })
const handle = app.getRequestHandler()

/** @type {Map<string, import('./lib/types').Room>} */
const rooms = new Map()

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer)

  io.on('connection', (socket) => {
    socket.on('create-room', ({ playerName }, callback) => {
      const roomId = generateRoomId()
      const room = {
        id: roomId,
        players: [{ id: socket.id, name: playerName, vote: null, isHost: true }],
        story: '',
        phase: 'voting',
      }
      rooms.set(roomId, room)
      socket.join(roomId)
      socket.data.roomId = roomId
      callback({ room })
    })

    socket.on('join-room', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback({ error: 'ルームが見つかりません' })
        return
      }
      // Already in the room — just return current state without adding a duplicate
      if (room.players.some((p) => p.id === socket.id)) {
        socket.join(roomId)
        socket.data.roomId = roomId
        callback({ room })
        return
      }
      const player = { id: socket.id, name: playerName, vote: null, isHost: false }
      room.players.push(player)
      socket.join(roomId)
      socket.data.roomId = roomId
      io.to(roomId).emit('room-updated', room)
      callback({ room })
    })

    socket.on('vote', ({ vote }) => {
      const room = rooms.get(socket.data.roomId)
      if (!room) return
      const player = room.players.find((p) => p.id === socket.id)
      if (player) player.vote = vote
      io.to(room.id).emit('room-updated', room)
    })

    socket.on('reveal-votes', () => {
      const room = rooms.get(socket.data.roomId)
      if (!room) return
      room.phase = 'revealed'
      io.to(room.id).emit('room-updated', room)
    })

    socket.on('reset-votes', ({ story }) => {
      const room = rooms.get(socket.data.roomId)
      if (!room) return
      room.phase = 'voting'
      room.story = story ?? ''
      room.players.forEach((p) => (p.vote = null))
      io.to(room.id).emit('room-updated', room)
    })

    socket.on('set-story', ({ story }) => {
      const room = rooms.get(socket.data.roomId)
      if (!room) return
      room.story = story
      io.to(room.id).emit('room-updated', room)
    })

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room) return
      room.players = room.players.filter((p) => p.id !== socket.id)
      if (room.players.length === 0) {
        rooms.delete(roomId)
      } else {
        if (!room.players.some((p) => p.isHost)) {
          room.players[0].isHost = true
        }
        io.to(roomId).emit('room-updated', room)
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`)
  })
})
