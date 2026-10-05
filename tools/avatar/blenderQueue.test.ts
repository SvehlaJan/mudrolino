import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const runner = resolve('tools/avatar/blender_queue.py');
const roots: string[] = [];
const children: ChildProcess[] = [];
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'blender-queue-'))); roots.push(root);
  return { root, lock: join(root, 'isolated.lock'), log: join(root, 'events.jsonl') };
}
const recorder = `import json,os,sys,time
path,name,delay,code=sys.argv[1:]
def emit(kind):
 with open(path,'a') as f: f.write(json.dumps({'name':name,'kind':kind,'pid':os.getpid()})+'\\n')
emit('start')
time.sleep(float(delay))
emit('end')
sys.exit(int(code))`;
function queued(lock: string, command: string[]) {
  const child = spawn('python3', [runner, '--lock-path', lock, '--', ...command], { stdio: 'pipe' }); children.push(child);
  let stdout = ''; let stderr = ''; child.stdout!.on('data', chunk => { stdout += chunk; }); child.stderr!.on('data', chunk => { stderr += chunk; });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolve({ code, signal })); });
  const completed = new Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr })); });
  return { child, exited, completed };
}
function events(log: string): Array<{ name: string; kind: string; pid: number }> {
  try { return readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); } catch { return []; }
}
async function waitForStart(log: string, name: string) {
  const limit = Date.now() + 3000;
  while (!events(log).some(event => event.name === name && event.kind === 'start')) {
    if (Date.now() > limit) throw new Error(`Timed out waiting for ${name} to start`);
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}
afterEach(async () => {
  for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('shared Blender command queue', () => {
  it('serializes processes and releases the lock after a failing command', async () => {
    const { lock, log } = fixture();
    const first = queued(lock, ['python3', '-c', recorder, log, 'first', '.25', '7']);
    await waitForStart(log, 'first');
    const second = queued(lock, ['python3', '-c', recorder, log, 'second', '.01', '0']);
    expect((await first.completed).code).toBe(7); expect((await second.completed).code).toBe(0);
    expect(events(log).map(event => `${event.name}:${event.kind}`)).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });
  it('preserves literal argv, inherited cwd and standard streams', () => {
    const { root, lock } = fixture(); const args = ['a path with spaces', '$(touch unsafe)', '`touch unsafe`'];
    const result = spawnSync('python3', [runner, '--lock-path', lock, '--', 'python3', '-c', "import json,os,sys;print(json.dumps({'cwd':os.getcwd(),'args':sys.argv[1:],'stdin':sys.stdin.read()}));print('child-stderr',file=sys.stderr)", ...args], { cwd: root, encoding: 'utf8', input: 'child-stdin' });
    expect(result.status).toBe(0); expect(JSON.parse(result.stdout)).toEqual({ cwd: root, args, stdin: 'child-stdin' }); expect(result.stderr).toBe('child-stderr\n');
  });
  it('keeps the lock while a child survives a killed wrapper', async () => {
    const { lock, log } = fixture();
    const first = queued(lock, ['python3', '-c', recorder, log, 'survivor', '.6', '0']);
    await waitForStart(log, 'survivor'); first.child.kill('SIGKILL');
    expect((await first.exited).signal).toBe('SIGKILL');
    const second = queued(lock, ['python3', '-c', recorder, log, 'next', '.01', '0']);
    expect((await second.completed).code).toBe(0); await first.completed;
    expect(events(log).map(event => `${event.name}:${event.kind}`)).toEqual(['survivor:start', 'survivor:end', 'next:start', 'next:end']);
  });
  it('forwards cancellation and lets the next command obtain the lock', async () => {
    const { lock, log } = fixture();
    const first = queued(lock, ['python3', '-c', recorder, log, 'cancelled', '30', '0']);
    await waitForStart(log, 'cancelled'); first.child.kill('SIGTERM');
    expect((await first.completed).code).toBe(143);
    const next = queued(lock, ['python3', '-c', recorder, log, 'next', '.01', '0']); expect((await next.completed).code).toBe(0);
    expect(events(log).map(event => `${event.name}:${event.kind}`)).toEqual(['cancelled:start', 'next:start', 'next:end']);
  });
  it('rejects nesting before waiting on its own lock', () => {
    const { lock } = fixture();
    const result = spawnSync('python3', [runner, '--lock-path', lock, '--', 'python3', runner, '--lock-path', lock, '--', 'python3', '-c', 'pass'], { encoding: 'utf8', timeout: 2000 });
    expect(result.status).toBe(2); expect(result.stderr).toContain('nested');
  });
});
