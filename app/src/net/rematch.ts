import { CITY_ENABLED } from '../shared/config';
import type { GameState } from '../shared/types';
import { addPlayer, createGame } from '../sim/game';

/**
 * A fresh game on a new map from `seed`, with the same players (id, name, color, connection)
 * re-seated as if they had just joined the waiting room, bots included. Clock, sudden death, winner, bonuses and
 * buses all start over. Used for a rematch (card 027) and a map switch in the waiting room (028).
 */
export function rematchGame(prev: GameState, seed: number, city = CITY_ENABLED): GameState {
  const game = createGame(seed, city);
  for (const p of prev.players) {
    const player = addPlayer(game, p.id, p.name);
    player.color = p.color;
    player.connected = p.connected;
    if (p.bot) player.bot = true;
  }
  return game;
}
