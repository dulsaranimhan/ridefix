import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect } from 'socket.io-client';
import { attachSocketServer } from './socket';

describe('tracking socket server', () => {
  it('refuses connections until booking authorisation exists', async () => {
    const httpServer = createServer();
    const io = attachSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;

    const client = connect(`http://localhost:${port}`, {
      path: '/tracking/socket.io',
      transports: ['websocket'],
      reconnection: false,
    });
    const error = await new Promise<Error>((resolve) => client.on('connect_error', resolve));

    expect(error.message).toMatch(/not_implemented/);
    client.close();
    await io.close();
  });
});
