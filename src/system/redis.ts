import RedisLib, {
  type RetryStrategyOptions,
  type ClientOpts,
  type RedisClient,
  type Multi,
} from 'redis'
import bluebird from 'bluebird'

import { config } from './config'

bluebird.promisifyAll<RedisClient>(RedisLib.RedisClient.prototype)
bluebird.promisifyAll<Multi>(RedisLib.Multi.prototype)

const RedisClientTypes = ['sockets'] as const
type RedisClientType = (typeof RedisClientTypes)[number]
/**
 * Factory for client connections, currently a singleton
 */
const clients: Record<RedisClientType, RedisClient | null> = {
  sockets: null, // sessions - o.g. redis sentinel, needs to be migrated
}

const getOptions = (
  type: RedisClientType = 'sockets',
): Partial<ClientOpts | undefined> | undefined => {
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

  const tls = 'tls' in clientConfig ? { tls: clientConfig.tls } : {}

  return {
    ...hostInfo,
    ...tls,
    auth_pass: clientConfig.pass,

    retry_strategy: (options: RetryStrategyOptions) => {
      const { pass, ...debugConfig } = clientConfig

      console.error('Redis reconnecting', { debugConfig, options })
      
      const client = clients[type]
      if (client !== null && !client.connected) {
        clients[type] = null
      }
      if (options.error && options.error.code === 'ECONNREFUSED') {
        clients[type] = null
      }

      /*
       * Kubernetes crash-loop backoff interval resets after 10 minutes, so that's what we target here to avoid extra
       * downtime.
       */
      if (options.total_retry_time > 1000 * 60 * 10) {
        return new Error('Retry Time Exhausted')
      }

      // Wait <= 3 seconds between retry attempts
      return Math.min(options.attempt * 100, 3000)
    },
  }
}

const createClient = (options: ClientOpts): RedisClient => {
  const newClient = RedisLib.createClient(options)

  newClient.on('error', err => {
    console.error('Redis Client Error', err)
  })

  return newClient
}

const getClient = (type: RedisClientType): RedisClient => {
  const client = clients[type]

  // If a client doesn't exist or is not connected, create new instance.
  if (client === null || !client.connected) {
    const options = getOptions(type)

    // If options is undefined, attempt to connect with default config.
    const newClient = createClient(options ?? {})

    // Update reference in client map for accessing later.
    clients[type] = newClient

    return newClient
  }

  return client
}

export const redis = getClient('sockets')
export const socketsClient = () => getClient('sockets')
