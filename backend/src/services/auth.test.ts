import { AuthService } from "./auth";

class MockPgClient {
  query = jest.fn();
}
class MockRedis {
  store: { [key: string]: string } = {};
  set = jest.fn((key: string, value: string) => {
    this.store[key] = value;
    return Promise.resolve("OK");
  });
  get = jest.fn((key: string) => Promise.resolve(this.store[key]));
  getex = jest.fn((key: string, ..._args: any[]) => Promise.resolve(this.store[key])); // ★これを追加
  del = jest.fn((key: string) => {
    delete this.store[key];
    return Promise.resolve(1);
  });
}

describe("AuthService class", () => {
  let pgClient: MockPgClient;
  let redis: MockRedis;
  let authService: AuthService;

  beforeEach(() => {
    pgClient = new MockPgClient();
    redis = new MockRedis();
    authService = new AuthService(pgClient as any, redis as any);
  });

  test("login: success", async () => {
    pgClient.query.mockResolvedValueOnce({
      rows: [
        {
          id: "user-123",
          email: "test@example.com",
          nickname: "TestNick",
        },
      ],
      rowCount: 1,
    });
    const result = await authService.login("test@example.com", "password");
    expect(result.userId).toBe("user-123");
    expect(redis.set).toHaveBeenCalled();
    const sessionId = result.sessionId;
    const session = JSON.parse(redis.store[`session:${sessionId}`]);
    expect(session.user_id).toBe("user-123");
    expect(session.user_email).toBe("test@example.com");
    expect(session.user_nickname).toBe("TestNick");
    expect(session.logged_in_at).toBeDefined();
  });

  test("login: fail", async () => {
    pgClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(authService.login("bad@example.com", "bad")).rejects.toThrow(
      "authentication failed",
    );
  });

  test("getSessionInfo: exists", async () => {
    const sessionId = "abc123";
    const value = JSON.stringify({
      user_id: "u1",
      user_email: "e@example.com",
      user_nickname: "TestNick",
      logged_in_at: "2025-07-13T00:00:00Z",
    });
    redis.store[`session:${sessionId}`] = value;
    const session = await authService.getSessionInfo(sessionId);
    expect(session?.user_id).toBe("u1");
    expect(session?.user_email).toBe("e@example.com");
    expect(session?.user_nickname).toBe("TestNick");
    expect(session?.logged_in_at).toBe("2025-07-13T00:00:00Z");
  });

  test("getSessionInfo: not exists", async () => {
    const session = await authService.getSessionInfo("notfound");
    expect(session).toBeNull();
  });

  test("logout", async () => {
    const sessionId = "toDel";
    redis.store[`session:${sessionId}`] = '{"user_id":"xx"}';
    await authService.logout(sessionId);
    expect(redis.store[`session:${sessionId}`]).toBeUndefined();
  });
});
