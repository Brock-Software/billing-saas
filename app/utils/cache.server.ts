import fs from 'fs'
import {
	cachified as baseCachified,
	lruCacheAdapter,
	verboseReporter,
	mergeReporters,
	type CacheEntry,
	type Cache as CachifiedCache,
	type CachifiedOptions,
} from '@epic-web/cachified'
import { remember } from '@epic-web/remember'
import Database from 'better-sqlite3'
import { LRUCache } from 'lru-cache'
import { z } from 'zod'
import { cachifiedTimingReporter, type Timings } from './timing.server.ts'

const CACHE_DATABASE_PATH = process.env.CACHE_DATABASE_PATH

const cacheDb = remember('cacheDb', createDatabase)

function createDatabase(tryAgain = true): Database.Database {
	const db = new Database(CACHE_DATABASE_PATH)

	try {
		// create cache table with metadata JSON column and value JSON column if it does not exist already
		db.exec(`
			CREATE TABLE IF NOT EXISTS cache (
				key TEXT PRIMARY KEY,
				metadata TEXT,
				value TEXT
			)
		`)
	} catch (error: unknown) {
		fs.unlinkSync(CACHE_DATABASE_PATH)
		if (tryAgain) {
			// eslint-disable-next-line no-console
			console.error(
				`Error creating cache database, deleting the file at "${CACHE_DATABASE_PATH}" and trying again...`,
			)
			return createDatabase(false)
		}
		throw error
	}
	return db
}

const lru = remember(
	'lru-cache',
	() => new LRUCache<string, CacheEntry<unknown>>({ max: 5000 }),
)

export const lruCache = lruCacheAdapter(lru)

const cacheEntrySchema = z.object({
	metadata: z.object({
		createdTime: z.number(),
		ttl: z.number().nullable().optional(),
		swr: z.number().nullable().optional(),
	}),
	value: z.unknown(),
})
const cacheQueryResultSchema = z.object({
	metadata: z.string(),
	value: z.string(),
})

export const cache: CachifiedCache = {
	name: 'SQLite cache',
	get(key) {
		const result = cacheDb
			.prepare('SELECT value, metadata FROM cache WHERE key = ?')
			.get(key)
		const parseResult = cacheQueryResultSchema.safeParse(result)
		if (!parseResult.success) return null

		const parsedEntry = cacheEntrySchema.safeParse({
			metadata: JSON.parse(parseResult.data.metadata),
			value: JSON.parse(parseResult.data.value),
		})
		if (!parsedEntry.success) return null
		const { metadata, value } = parsedEntry.data
		if (!value) return null
		return { metadata, value }
	},
	async set(key, entry) {
		cacheDb
			.prepare(
				'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (@key, @value, @metadata)',
			)
			.run({
				key,
				value: JSON.stringify(entry.value),
				metadata: JSON.stringify(entry.metadata),
			})
	},
	async delete(key) {
		cacheDb.prepare('DELETE FROM cache WHERE key = ?').run(key)
	},
}

export async function getAllCacheKeys(limit: number) {
	return {
		sqlite: cacheDb
			.prepare('SELECT key FROM cache LIMIT ?')
			.all(limit)
			.map(row => (row as { key: string }).key),
		lru: [...lru.keys()],
	}
}

export async function searchCacheKeys(search: string, limit: number) {
	return {
		sqlite: cacheDb
			.prepare('SELECT key FROM cache WHERE key LIKE ? LIMIT ?')
			.all(`%${search}%`, limit)
			.map(row => (row as { key: string }).key),
		lru: [...lru.keys()].filter(key => key.includes(search)),
	}
}

export async function cachified<Value>({
	timings,
	reporter = verboseReporter(),
	...options
}: CachifiedOptions<Value> & {
	timings?: Timings
}): Promise<Value> {
	return baseCachified({
		...options,
		reporter: mergeReporters(cachifiedTimingReporter(timings), reporter),
	})
}
