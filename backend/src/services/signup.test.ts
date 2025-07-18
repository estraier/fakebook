import { SignupService } from "./signup";
import { UsersService } from "./users";

jest.mock("./users");

class MockRedis {
  private store = new Map<string, any>();
  private queue: string[] = [];
  async hmset(key: string, obj: any) {
    this.store.set(key, obj);
  }
  async hgetall(key: string) {
    return this.store.get(key) || {};
  }
  async expire(_key: string, _seconds: number) {}
  async lpush(queue: string, val: string) {
    this.queue.push(val);
  }
  async del(key: string) {
    this.store.delete(key);
  }
}

describe("signup service", () => {
  let redis: MockRedis;
  let usersService: UsersService;
  let signupService: SignupService;

  beforeEach(() => {
    redis = new MockRedis();
    usersService = new UsersService({} as any);
    signupService = new SignupService(usersService, redis as any);
    (usersService.createUser as unknown as jest.Mock).mockReset();
  });

  test("startSignup: valid input", async () => {
    const res = await signupService.startSignup("foo@example.com", "pass123");
    expect(res.signupId).toBeDefined();
    const signupKey = `signup:${res.signupId}`;
    const stored = await redis.hgetall(signupKey);
    expect(stored.email).toBe("foo@example.com");
    expect(stored.password).toBe("pass123");
    expect(stored.verificationCode).toHaveLength(6);
  });

  test("startSignup: invalid email", async () => {
    await expect(signupService.startSignup("invalid-email", "pass123")).rejects.toThrow(
      "Invalid email format",
    );
  });

  test("startSignup: short password", async () => {
    await expect(signupService.startSignup("foo@example.com", "")).rejects.toThrow(
      "Password must be at least 6 characters",
    );
  });

  test("verifySignup: normal", async () => {
    const { signupId } = await signupService.startSignup("test@ex.com", "pass123");
    const data = await redis.hgetall(`signup:${signupId}`);
    (usersService.createUser as unknown as jest.Mock).mockResolvedValue({ id: "user-1" });
    const res = await signupService.verifySignup(signupId, data.verificationCode);
    expect(res.userId).toBe("user-1");
    expect(await redis.hgetall(`signup:${signupId}`)).toEqual({});
  });

  test("verifySignup: code mismatch", async () => {
    const { signupId } = await signupService.startSignup("test@ex.com", "pass123");
    await expect(signupService.verifySignup(signupId, "999999")).rejects.toThrow(
      "Verification code mismatch",
    );
  });

  test("verifySignup: expired or not found", async () => {
    await expect(signupService.verifySignup("no-such-id", "123456")).rejects.toThrow(
      "Signup info not found or expired",
    );
  });
});
