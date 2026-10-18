import { defineRoom, defineServer } from 'colyseus';
import { PartyRoom } from './PartyRoom';

const server = defineServer({
  rooms: { party: defineRoom(PartyRoom) },
});

const port = Number(process.env.PORT ?? 2567);
await server.listen(port);
console.log(`smelibus server on :${port}`);
