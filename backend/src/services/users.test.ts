import { UsersService } from "./users";
import { User } from "../models/user";
import crypto from "crypto";

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex");
}

class MockPgClient {
  users: User[];
  follows: { follower_id: string; followee_id: string }[];
  passwords: Record<string, string>;

  constructor() {
    this.users = [
      {
        id: "alice",
        email: "alice@example.com",
        nickname: "Alice",
        is_admin: false,
        introduction: "introA",
        personality: "A",
        model: "test",
        created_at: "2020-01-01T00:00:00Z",
      },
      {
        id: "bob",
        email: "bob@example.com",
        nickname: "Bob",
        is_admin: false,
        introduction: "introB",
        personality: "B",
        model: "test",
        created_at: "2020-01-02T00:00:00Z",
      },
      {
        id: "carol",
        email: "carol@example.com",
        nickname: "Carol",
        is_admin: false,
        introduction: "introC",
        personality: "C",
        model: "test",
        created_at: "2020-01-03T00:00:00Z",
      },
    ];
    this.follows = [
      { follower_id: "alice", followee_id: "bob" },
      { follower_id: "alice", followee_id: "carol" },
      { follower_id: "bob", followee_id: "alice" },
      { follower_id: "carol", followee_id: "alice" },
    ];
    this.passwords = {
      alice: md5("alicepass"),
      bob: md5("bobpass"),
      carol: md5("carolpass"),
    };
  }

  async query(sql: string, params: any[] = []) {
    sql = sql.replace(/\s+/g, " ").trim();
    if (sql.startsWith("SELECT COUNT(*) FROM users")) {
      if (sql.includes("WHERE nickname ILIKE $1 OR introduction ILIKE $2")) {
        const [pat1, pat2] = params.map((s: string) => s.toLowerCase().replace(/%/g, ""));
        return {
          rows: [
            {
              count: this.users.filter(
                (u) =>
                  u.nickname.toLowerCase().includes(pat1) ||
                  u.introduction.toLowerCase().includes(pat2),
              ).length,
            },
          ],
        };
      }
      if (sql.includes("WHERE nickname ILIKE")) {
        const pat = params[0].toLowerCase().replace(/%/g, "");
        return {
          rows: [
            {
              count: this.users.filter((u) => u.nickname.toLowerCase().includes(pat)).length,
            },
          ],
        };
      }
      return { rows: [{ count: this.users.length }] };
    }
    if (
      sql.startsWith(
        "SELECT id, email, nickname, is_admin, introduction, personality, model, created_at FROM users WHERE id = $1",
      )
    ) {
      const user = this.users.find((u) => u.id === params[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith("SELECT COUNT(*)::int AS cnt FROM user_follows WHERE followee_id = $1")) {
      const cnt = this.follows.filter((f) => f.followee_id === params[0]).length;
      return { rows: [{ cnt }] };
    }
    if (sql.startsWith("SELECT COUNT(*)::int AS cnt FROM user_follows WHERE follower_id = $1")) {
      const cnt = this.follows.filter((f) => f.follower_id === params[0]).length;
      return { rows: [{ cnt }] };
    }
    if (
      sql.startsWith(
        "SELECT EXISTS (SELECT 1 FROM user_follows WHERE follower_id = $1 AND followee_id = $2) AS is_followed_by_focus_user",
      )
    ) {
      const [focus_user_id, id] = params;
      return {
        rows: [
          {
            is_followed_by_focus_user: this.follows.some(
              (f) => f.follower_id === focus_user_id && f.followee_id === id,
            ),
            is_following_focus_user: this.follows.some(
              (f) => f.follower_id === id && f.followee_id === focus_user_id,
            ),
          },
        ],
      };
    }
    if (
      sql.startsWith(
        "SELECT u.id, u.email, u.nickname, u.is_admin, u.introduction, u.personality, u.model, u.created_at FROM users u",
      )
    ) {
      let list = [...this.users];
      if (sql.includes("WHERE (u.nickname ILIKE $1 OR u.introduction ILIKE $2)")) {
        const [pat1, pat2] = params
          .slice(0, 2)
          .map((s: string) => s.toLowerCase().replace(/%/g, ""));
        list = list.filter(
          (u) =>
            u.nickname.toLowerCase().includes(pat1) || u.introduction.toLowerCase().includes(pat2),
        );
      } else if (sql.includes("WHERE u.nickname ILIKE")) {
        const pat = params[0].toLowerCase().replace(/%/g, "");
        list = list.filter((u) => u.nickname.toLowerCase().includes(pat));
      }
      list.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const offset = params[params.length - 2] || 0;
      const limit = params[params.length - 1] || 100;
      return { rows: list.slice(offset, offset + limit) };
    }
    if (
      sql.startsWith(
        "SELECT followee_id AS id, COUNT(*)::int AS cnt FROM user_follows WHERE followee_id = ANY($1) GROUP BY followee_id",
      )
    ) {
      const ids = params[0];
      const rows = ids.map((id: string) => ({
        id,
        cnt: this.follows.filter((f) => f.followee_id === id).length,
      }));
      return { rows };
    }
    if (
      sql.startsWith(
        "SELECT follower_id AS id, COUNT(*)::int AS cnt FROM user_follows WHERE follower_id = ANY($1) GROUP BY follower_id",
      )
    ) {
      const ids = params[0];
      const rows = ids.map((id: string) => ({
        id,
        cnt: this.follows.filter((f) => f.follower_id === id).length,
      }));
      return { rows };
    }
    if (
      sql.startsWith(
        "SELECT followee_id FROM user_follows WHERE follower_id = $1 AND followee_id = ANY($2)",
      )
    ) {
      const [focus_user_id, ids] = params;
      return {
        rows: this.follows
          .filter((f) => f.follower_id === focus_user_id && ids.includes(f.followee_id))
          .map((f) => ({ followee_id: f.followee_id })),
      };
    }
    if (
      sql.startsWith(
        "SELECT follower_id FROM user_follows WHERE follower_id = ANY($1) AND followee_id = $2",
      )
    ) {
      const [ids, focus_user_id] = params;
      return {
        rows: this.follows
          .filter((f) => ids.includes(f.follower_id) && f.followee_id === focus_user_id)
          .map((f) => ({ follower_id: f.follower_id })),
      };
    }
    if (sql.startsWith("INSERT INTO users")) {
      const [id, email, nickname, password, is_admin, introduction, personality, model] = params;
      const user: User = {
        id,
        email,
        nickname,
        is_admin,
        introduction,
        personality,
        model,
        created_at: new Date().toISOString(),
      };
      this.users.push(user);
      this.passwords[user.id] = password;
      return { rows: [user] };
    }
    if (sql.startsWith("UPDATE users SET password = $1 WHERE id = $2")) {
      const [password, id] = params;
      const exists = this.users.some((u) => u.id === id);
      if (!exists) return { rowCount: 0 };
      this.passwords[id] = password;
      return { rowCount: 1 };
    }
    if (sql.startsWith("UPDATE users SET")) {
      const columns = sql
        .substring(sql.indexOf("SET ") + 4, sql.indexOf(" WHERE"))
        .split(", ")
        .map((col) => col.split("=")[0].trim());
      const user = this.users.find((u) => u.id === params[params.length - 1]);
      if (!user) return { rows: [] };
      for (let i = 0; i < columns.length; ++i) {
        (user as any)[columns[i]] = params[i];
      }
      return { rows: [user] };
    }

    if (sql.startsWith("DELETE FROM users WHERE id = $1")) {
      const id = params[0];
      const idx = this.users.findIndex((u) => u.id === id);
      if (idx === -1) return { rowCount: 0 };
      this.users.splice(idx, 1);
      delete this.passwords[id];
      this.follows = this.follows.filter((f) => f.follower_id !== id && f.followee_id !== id);
      return { rowCount: 1 };
    }
    if (
      sql.startsWith(
        "SELECT u.id, u.email, u.nickname, u.is_admin, u.introduction, u.personality, u.model, u.created_at FROM user_follows f JOIN users u ON f.followee_id = u.id WHERE f.follower_id = $1",
      )
    ) {
      const follower_id = params[0];
      const list = this.follows
        .filter((f) => f.follower_id === follower_id)
        .map((f) => this.users.find((u) => u.id === f.followee_id))
        .filter((u): u is User => !!u);
      list.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const offset = params[1] || 0;
      const limit = params[2] || 100;
      return { rows: list.slice(offset, offset + limit) };
    }
    if (
      sql.startsWith(
        "SELECT u.id, u.email, u.nickname, u.is_admin, u.introduction, u.personality, u.model, u.created_at FROM user_follows f JOIN users u ON f.follower_id = u.id WHERE f.followee_id = $1",
      )
    ) {
      const followee_id = params[0];
      const list = this.follows
        .filter((f) => f.followee_id === followee_id)
        .map((f) => this.users.find((u) => u.id === f.follower_id))
        .filter((u): u is User => !!u);
      list.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const offset = params[1] || 0;
      const limit = params[2] || 100;
      return { rows: list.slice(offset, offset + limit) };
    }
    if (sql.startsWith("INSERT INTO user_follows")) {
      const [follower_id, followee_id] = params;
      if (
        !this.follows.some((f) => f.follower_id === follower_id && f.followee_id === followee_id)
      ) {
        this.follows.push({ follower_id, followee_id });
      }
      return { rowCount: 1 };
    }
    if (sql.startsWith("DELETE FROM user_follows WHERE follower_id = $1 AND followee_id = $2")) {
      const [follower_id, followee_id] = params;
      const prev = this.follows.length;
      this.follows = this.follows.filter(
        (f) => !(f.follower_id === follower_id && f.followee_id === followee_id),
      );
      return { rowCount: prev - this.follows.length };
    }
    throw new Error("Unknown SQL: " + sql);
  }
}

describe("UsersService", () => {
  let pg: MockPgClient;
  let service: UsersService;

  beforeEach(() => {
    pg = new MockPgClient();
    service = new UsersService(pg as unknown as any);
  });

  test("countUsers (all/nickname/query)", async () => {
    expect(await service.countUsers()).toBe(3);
    expect(await service.countUsers({ nickname: "B" })).toBe(1);
    expect(await service.countUsers({ query: "intro" })).toBe(3);
    expect(await service.countUsers({ query: "introA" })).toBe(1);
  });

  test("getUser", async () => {
    const user = await service.getUser("alice");
    expect(user?.id).toBe("alice");
    expect(await service.getUser("no-such-id")).toBeNull();
  });

  test("getUserDetail (with focus_user_id)", async () => {
    const detail = await service.getUserDetail("alice", "bob");
    expect(detail?.id).toBe("alice");
    expect(detail?.count_followers).toBe(2);
    expect(detail?.count_followees).toBe(2);
    expect(detail?.is_followed_by_focus_user).toBe(true);
    expect(detail?.is_following_focus_user).toBe(true);
  });

  test("listUsers", async () => {
    const users = await service.listUsers();
    expect(users.length).toBe(3);
    expect(users[0].id).toBe("carol");
    expect(users[2].id).toBe("alice");
  });

  test("listUsersDetail (with focus_user_id)", async () => {
    const details = await service.listUsersDetail({}, "bob");
    const aliceDetail = details.find((u) => u.id === "alice")!;
    expect(aliceDetail.count_followees).toBe(2);
    expect(aliceDetail.is_followed_by_focus_user).toBe(true);
    expect(aliceDetail.is_following_focus_user).toBe(true);
    const bobDetail = details.find((u) => u.id === "bob")!;
    expect(bobDetail.count_followers).toBe(1);
    expect(bobDetail.count_followees).toBe(1);
    expect(bobDetail.is_followed_by_focus_user).toBe(false);
    expect(bobDetail.is_following_focus_user).toBe(false);
    const carolDetail = details.find((u) => u.id === "carol")!;
    expect(carolDetail.count_followers).toBe(1);
    expect(carolDetail.count_followees).toBe(1);
    expect(carolDetail.is_followed_by_focus_user).toBe(false);
    expect(carolDetail.is_following_focus_user).toBe(false);
  });

  test("createUser", async () => {
    const user = await service.createUser({
      email: "dan@example.com",
      nickname: "Dan",
      password: "danpass",
      is_admin: false,
      introduction: "introD",
      personality: "D",
      model: "test",
    });
    expect(user.email).toBe("dan@example.com");
    expect(pg.users.find((u) => u.email === "dan@example.com")).toBeDefined();
    expect(pg.passwords[user.id]).toBe(md5("danpass"));
  });

  test("updateUser", async () => {
    const user = await service.updateUser({
      id: "alice",
      email: "alice2@example.com",
      nickname: "Alice2",
      is_admin: true,
      introduction: "introX",
      personality: "X",
      model: "test2",
    });
    expect(user?.email).toBe("alice2@example.com");
    expect(user?.is_admin).toBe(true);
    expect(user?.introduction).toBe("introX");
  });

  test("updateUserPassword", async () => {
    const id = pg.users[0].id;
    const ok = await service.updateUserPassword({ id, password: "newpass" });
    expect(ok).toBe(true);
    expect(pg.passwords[id]).toBe(md5("newpass"));
    expect(await service.updateUserPassword({ id: "no-such-id", password: "x" })).toBe(false);
  });

  test("deleteUser", async () => {
    const id = pg.users[0].id;
    expect(await service.deleteUser(id)).toBe(true);
    expect(pg.users.find((u) => u.id === id)).toBeUndefined();
    expect(await service.deleteUser("no-such-id")).toBe(false);
  });

  test("listFolloweesDetail (with focus_user_id)", async () => {
    const res = await service.listFolloweesDetail({ follower_id: "alice" }, "bob");
    expect(res.length).toBe(2);
    expect(res.some((u) => u.id === "bob")).toBe(true);
    expect(res.some((u) => u.id === "carol")).toBe(true);
    expect(res.every((u) => typeof u.count_followers === "number")).toBe(true);
  });

  test("listFollowersDetail (with focus_user_id)", async () => {
    const res = await service.listFollowersDetail({ followee_id: "alice" }, "bob");
    expect(res.length).toBe(2);
    expect(res.some((u) => u.id === "bob")).toBe(true);
    expect(res.some((u) => u.id === "carol")).toBe(true);
    expect(res.every((u) => typeof u.count_followers === "number")).toBe(true);
  });

  test("addFollower/removeFollower", async () => {
    expect(await service.addFollower({ follower_id: "bob", followee_id: "carol" })).toBe(true);
    expect(pg.follows.some((f) => f.follower_id === "bob" && f.followee_id === "carol")).toBe(true);
    expect(await service.removeFollower({ follower_id: "bob", followee_id: "carol" })).toBe(true);
    expect(pg.follows.some((f) => f.follower_id === "bob" && f.followee_id === "carol")).toBe(
      false,
    );
  });
});
