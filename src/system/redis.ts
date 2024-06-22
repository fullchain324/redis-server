import {
  createClient,
  RedisClientType,
  RedisClientOptions,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from 'redis'

import { config } from './config'

const RedisClientTypes = ['sockets'] as const
type RedisClientCategory = (typeof RedisClientTypes)[number]
/**
 * Factory for client connections, currently a singleton
 */
const clients: Record<RedisClientCategory, any | null> = {
  sockets: null, // sessions - o.g. redis sentinel, needs to be migrated
}

const getOptions = (
  type: RedisClientCategory = 'sockets',
): Partial<RedisClientOptions> | undefined => {
  config.redis
  const clientConfig = config.redis[type]

  const hostInfo = (() => {
    if ('url' in clientConfig && clientConfig.url) {
      return {
        url: clientConfig.url,
      }
    }

    if (
      'host' in clientConfig &&
      'port' in clientConfig &&
      clientConfig.host &&
      clientConfig.port
    ) {
      return {
        host: clientConfig.host,
        port: clientConfig.port,
      }
    }

    return undefined
  })()

  if (!hostInfo) {
    return undefined
  }

  return hostInfo
}

const createRedisClient = (options: RedisClientOptions): RedisClientType<RedisModules, RedisFunctions, RedisScripts> => {
  const newClient = createClient(options)

  newClient.on('error', err => {
    console.error('Redis Client Error', err)
  })

  return newClient
}

const getClient = (type: RedisClientCategory): RedisClientType<RedisModules, RedisFunctions, RedisScripts> => {
  const client = clients[type]

  // If a client doesn't exist or is not connected, create new instance.
  if (client === null || !client.connected) {
    const options = getOptions(type)

    // If options is undefined, attempt to connect with default config.
    const newClient = createRedisClient(options ?? {})

    // Update reference in client map for accessing later.
    clients[type] = newClient

    return newClient
  }

  return client
}

export const redis = getClient('sockets')
export const socketsClient = () => getClient('sockets')
