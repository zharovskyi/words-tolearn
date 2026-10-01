import { describe, expect, it } from "vitest";
import { parseLibsqlUrl } from "./libsql-url";

describe("parseLibsqlUrl", () => {
  it("moves api_key into authToken and strips it from the URL", () => {
    expect(parseLibsqlUrl("libsql://db-name.turso.io?api_key=abc.def")).toEqual({
      url: "libsql://db-name.turso.io",
      authToken: "abc.def",
    });
  });

  it("supports the authToken parameter", () => {
    expect(parseLibsqlUrl("libsql://db-name.turso.io?authToken=tok")).toEqual({
      url: "libsql://db-name.turso.io",
      authToken: "tok",
    });
  });

  it("returns no token when none is given", () => {
    expect(parseLibsqlUrl("libsql://db-name.turso.io")).toEqual({
      url: "libsql://db-name.turso.io",
      authToken: undefined,
    });
  });
});
