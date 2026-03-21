import { MongoMemoryServer } from "mongodb-memory-server";

export default async function teardown() {
  const server = (global as any).__SERVER__;
  if (server) {
    server.kill();
  }

  const mongod: MongoMemoryServer = (global as any).__MONGOD__;
  if (mongod) {
    await mongod.stop();
  }
}
