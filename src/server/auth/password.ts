import { hash, verify } from "@node-rs/argon2";

/**
 * 密码哈希（ARCHITECTURE.md §15.1：Argon2id，不保存明文密码）。
 * Algorithm.Argon2id = 2（const enum，isolatedModules 下用字面值）。
 */

const ARGON2_OPTIONS = {
  algorithm: 2 as const, // Algorithm.Argon2id
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
  } catch {
    return false; // 哈希格式异常时按验证失败处理，不抛错避免账号枚举
  }
}
