// JSON-file storage for the demo: one file per collection under DATA_DIR.
// Every change is written to disk immediately (temp file + rename), and writes
// are serialized within this process.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = () => {
  const dir = process.env.DATA_DIR;
  if (!dir) throw new Error('DATA_DIR is not set');
  return path.resolve(dir);
};

let queue: Promise<unknown> = Promise.resolve();

const serialize = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

async function load<T>(collection: string): Promise<T[]> {
  try {
    return JSON.parse(
      await readFile(path.join(dataDir(), `${collection}.json`), 'utf8'),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function save<T>(collection: string, rows: T[]) {
  await mkdir(dataDir(), { recursive: true });
  const file = path.join(dataDir(), `${collection}.json`);
  await writeFile(`${file}.tmp`, JSON.stringify(rows, null, 2));
  await rename(`${file}.tmp`, file);
}

export const readAll = <T>(collection: string) =>
  serialize(() => load<T>(collection));

// Applies `change` to the collection and saves it; returns what `change` returns.
export const update = <T, R>(collection: string, change: (rows: T[]) => R) =>
  serialize(async () => {
    const rows = await load<T>(collection);
    const result = change(rows);
    await save(collection, rows);
    return result;
  });
