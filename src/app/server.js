import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { createClient } from 'redis'

const GRID_SIZE = 128
const REDIS_KEY = 'color_war_grid'

// Redis
const redis = createClient({
  url: 'redis://:kTqgcWNuixmclaWw0qXXghLDqChQqw6z@redis-11706.c339.eu-west-3-1.ec2.cloud.redislabs.com:11706',
})
redis.connect().then(() => console.log('Redis connected ✅'))

const getGrid = async () => {
  const g = await redis.get(REDIS_KEY)
  if (g) return JSON.parse(g)
  const initial = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(''),
  )
  await redis.set(REDIS_KEY, JSON.stringify(initial))
  return initial
}

// const resetGrid = async (newSize) => {
//   const newGrid = Array.from({ length: newSize }, () => Array(newSize).fill(''))
//   await redis.set(REDIS_KEY, JSON.stringify(newGrid))
//   io.emit('grid_update', newGrid) // tous les clients recoivent la nouvelle grille
//   console.log(`Grid reset to size ${newSize} ✅`)
//   return newGrid
// }

const updateGrid = async (x, y, color) => {
  const grid = await getGrid()
  grid[y][x] = color
  await redis.set(REDIS_KEY, JSON.stringify(grid))
  return grid
}

// Serveur HTTP
const httpServer = createServer()
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
})

io.on('connection', async (socket) => {
  console.log('New client connected', socket.id)

  // RESET GRIS (DEV ONLY)
  // await resetGrid(GRID_SIZE)

  socket.emit('grid_update', await getGrid())

  socket.on('apply_color', async ({ x, y, color }) => {
    // Déterminer l'IP du client (respecte X-Forwarded-For si présent)
    const forwarded =
      socket.handshake.headers && socket.handshake.headers['x-forwarded-for']
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : socket.handshake.address || socket.conn?.remoteAddress || 'unknown'

    const cooldownKey = `cooldown:${ip}`

    // Tenter d'ajouter la clé de cooldown (NX = uniquement si elle n'existe pas, EX = expiration en secondes)
    const setResult = await redis.set(cooldownKey, '1', { NX: true, EX: 10 })
    if (setResult === null) {
      // Il y a encore un cooldown en cours
      const ttl = await redis.ttl(cooldownKey)
      socket.emit('cooldown', { seconds: ttl })
      return
    }

    const newGrid = await updateGrid(x, y, color)
    io.emit('grid_update', newGrid)
    // Envoyer le cooldown au client qui a placé la couleur (utilise TTL pour précision)
    const ttl = await redis.ttl(cooldownKey)
    socket.emit('cooldown', { seconds: ttl })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () =>
  console.log(`Socket.IO server running on port ${PORT}`),
)
