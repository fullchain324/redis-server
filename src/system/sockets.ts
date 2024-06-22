import http from 'http'
// import { createAdapter } from '@socket.io/redis-adapter'
import { Server } from 'socket.io'

import { config } from './config'
// import { socketsClient } from './redis'

const allowedOrigins = [...config.appSettings.allowedOrigins]

// export const pub = socketsClient()
// export const sub = socketsClient()

export async function loadSocketClient(server: http.Server) {
  // const io = new Server(server, {
  //   adapter: createAdapter(pub, sub),
  // })

  const io = new Server({})

  // Allowed origin middleware
  io.use((socket, next) => {
    const origin = socket.handshake.headers.origin
    if (origin) {
      for (const allowedOrigin of allowedOrigins) {
        const isExactMatch =
          typeof allowedOrigin === 'string' && origin === allowedOrigin
        const isRegExpMatch =
          allowedOrigin instanceof RegExp && allowedOrigin.test(origin)
        if (isExactMatch || isRegExpMatch) {
          next()
          return
        }
      }
    }
    console.error('Socket connection attempt from disallowed origin', { origin })
    socket.disconnect()
  })

  io.on('connection', socket => {
    console.info(`New connection: ${socket.id}`)

    socket.on('message', (data) => {
      console.log(`New message from ${socket.id}: ${data}`)
    })

    setInterval(() => {
      socket.emit('message', 'Hello World')
    }, 2000)
  })
}
