import { defineRoom, defineServer, LobbyRoom } from 'colyseus';
import { PartyRoom } from './PartyRoom';

const server = defineServer({
  rooms: {
    party: defineRoom(PartyRoom).enableRealtimeListing(),
    // Built-in: streams the list of public (non-private) parties to the home screen.
    lobby: defineRoom(LobbyRoom),
  },
});

const port = Number(process.env.PORT ?? 2567);
await server.listen(port);
console.log(`smelibus server on :${port}`);
