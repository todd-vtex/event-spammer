import { EVENT_EXAMPLE } from '../constants'
// import { getRandomNumber } from '../utils/randomNumber'

export async function createSendEvent(ctx: Context) {
  await ctx.clients.events.sendEvent('', EVENT_EXAMPLE, {
    status: 'engine started',
  })
  ctx.status = 200
  ctx.body = 'Event sent'
  console.log('SENT EVENT')
}

// my comment
