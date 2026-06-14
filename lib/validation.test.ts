import { describe, expect, it } from "vitest";
import { cleanName, validateName } from "./validation";

describe("validateName", () => {
  it("accepts a normal name", () => {
    expect(validateName("DJ Riley")).toBeNull();
  });

  it("rejects names that are too short", () => {
    expect(validateName("ab")).not.toBeNull();
  });

  it("rejects disallowed characters", () => {
    expect(validateName("bad$name")).not.toBeNull();
  });

  it("rejects blocklisted words after leetspeak normalization", () => {
    expect(validateName("sh1t")).not.toBeNull();
  });
});

describe("cleanName", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanName("  a   b  ")).toBe("a b");
  });
});
