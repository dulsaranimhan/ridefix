import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

/**
 * Socket.IO server for live location.
 *
 * Shell only. Milestone 6 adds: verifying the Supabase JWT on connect, checking that the user is
 * the driver or provider of an ACTIVE booking, one room per booking, and closing the room when
 * the job ends. Until then every connection is refused, so no location can leak.
 */
export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, { path: '/tracking/socket.io' });

  io.use((_socket, next) => {
    next(new Error('not_implemented: booking authorisation is added in milestone 6'));
  });

  return io;
}
