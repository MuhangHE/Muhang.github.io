import { test } from "node:test";
import assert from "node:assert/strict";
import { publish } from "../lib/publish.mjs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

async function repoWithRemote() {
  const base = await mkdtemp(join(tmpdir(), "pub-"));
  const remote = join(base, "remote.git");
  const work = join(base, "work");
  await mkdir(remote, { recursive: true });
  await mkdir(work, { recursive: true });
  git(remote, "init", "--bare", "--initial-branch=main");
  git(work, "init");
  git(work, "config", "user.email", "t@t.com");
  git(work, "config", "user.name", "t");
  git(work, "remote", "add", "origin", remote);
  git(work, "checkout", "-b", "main");
  await writeFile(join(work, "seed.txt"), "seed");
  git(work, "add", ".");
  git(work, "commit", "-m", "seed");
  git(work, "push", "-u", "origin", "main");
  return { work, remote };
}

test("publish: commits and pushes changes", async () => {
  const { work, remote } = await repoWithRemote();
  await writeFile(join(work, "new.txt"), "hello");
  const res = await publish(work, "add new.txt");
  assert.equal(res.ok, true);
  const log = git(remote, "log", "--oneline");
  assert.match(log, /add new.txt/);
});

test("publish: nothing to commit -> ok:false with reason", async () => {
  const { work } = await repoWithRemote();
  const res = await publish(work, "noop");
  assert.equal(res.ok, false);
  assert.match(res.message, /nothing to commit/i);
});
