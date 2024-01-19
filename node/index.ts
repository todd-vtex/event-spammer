import type {
  IOClients,
  ParamsContext,
  ServiceContext,
  RecorderState,
} from '@vtex/api'
import { Service } from '@vtex/api'

import { example } from './events/example'
import { createSendEvent } from './routes/notify'
import { getCacheContext, setCacheContext } from './utils/cachedContext'

const TREE_SECONDS_MS = 3 * 1000
const CONCURRENCY = 10

// const axios = require('axios')
// import axios from 'axios'

declare global {
  type Context = ServiceContext<IOClients, State>

  interface State extends RecorderState {
    code: number
  }
}

function sendEventWithTimer () {
  setInterval(function () {
    const context = getCacheContext()

    if (!context) {
      console.log('no context in memory')

      return
    }

    return createSendEvent(context)
  }, 5000)
  // axios.get('https://enmnzafdke2t9.x.pipedream.net')
  console.log('FIRED HERE')
}

sendEventWithTimer()

export default new Service<IOClients, State, ParamsContext>({
  clients: {
    options: {
      events: {
        exponentialTimeoutCoefficient: 2,
        exponentialBackoffCoefficient: 2,
        initialBackoffDelay: 50,
        retries: 1,
        timeout: TREE_SECONDS_MS,
        concurrency: CONCURRENCY,
      },
    },
  },
  events: {
    example,
  },
  routes: {
    hcheck: (ctx: any) => {
      setCacheContext(ctx)
      ctx.set('Cache-Control', 'no-cache')
      ctx.status = 200
      ctx.body = 'ok'
    },
    todd: (ctx: any) => {
      ctx.status = 200
      ctx.body = 'hello todd'
    },
  },
})
