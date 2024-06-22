import { type DeepNonNullable, type DeepReadonly } from 'ts-essentials'

const toInt = (envVar: string | undefined) => (envVar ? parseInt(envVar) : null)

const allowedOrigins: Array<string | RegExp> = []

const nullableConfig = {
  appSettings: {
    allowedOrigins,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Content-Length',
      'X-Requested-With',
      'X-Seon-Session-Payload',
      'Cookie',
      'Set-Cookie',
      'Cache-Control',
      'Pragma',
      'Expires',
    ]
  },
  redis: (() => {
    const makeConfig = (name: string) => ({
      name,
      pass: process.env.REDIS_PASS,
      // Grab host info, prioritize URL over separate hostname/port.
      ...(process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
          }
        : {
            host: process.env.REDIS_HOST,
            port: toInt(process.env.REDIS_PORT) || 6379,
          }),
    })

    return {
      // These 3 clients share the same config, but historically have been separated.
      primary: makeConfig('primary'),
      sockets: makeConfig('sockets'),
      cache: makeConfig('cache'),
    }
  })(),
}

/**
 * We're going to pretend that all fields on config are present, because they should be, and TypeScript won't tell us
 * if they aren't.
 */
type Config = DeepReadonly<DeepNonNullable<typeof nullableConfig>>

export const config = nullableConfig as Config
