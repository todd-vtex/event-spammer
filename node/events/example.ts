import type { EventContext, IOClients } from '@vtex/api'

const axios = require('axios')

export async function example(ctx: EventContext<IOClients>) {
  console.log('RECEIVED EVENT', ctx.body)

  axios.get('https://enmnzafdke2t9.x.pipedream.net')
    .then((res: any) => {
      console.log(`status is ${res.status}`);
  })
    .catch((err: any) => {
      console.log('in the error');
      console.log(err.body);
  })
  return true
}
