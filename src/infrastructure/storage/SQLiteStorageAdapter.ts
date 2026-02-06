import { StoragePort } from '../../application/ports/StoragePort';
import { Meditation } from '../../domain/entities/Meditation';
import * as SQLite from 'expo-sqlite';

export class SQLiteStorageAdapter implements StoragePort {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync('zenai.db');
    this.initialize();
  }

  private initialize(): void {
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS meditations (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        type TEXT,
        target_duration INTEGER,
        actual_duration REAL,
        generated_text TEXT,
        audio_directory_path TEXT NOT NULL,
        voice_id TEXT,
        segment_count INTEGER,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  async saveMeditation(m: Meditation): Promise<void> {
    this.db.runSync(
      `INSERT INTO meditations (id, prompt, type, target_duration, actual_duration, generated_text, audio_directory_path, voice_id, segment_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id,
        m.prompt,
        m.type,
        m.targetDuration,
        m.actualDuration,
        m.generatedText,
        m.audioDirectoryPath,
        m.voiceId,
        m.segmentCount,
        m.createdAt.toISOString(),
      ],
    );
  }

  async getMeditations(): Promise<Meditation[]> {
    const rows = this.db.getAllSync(
      'SELECT * FROM meditations ORDER BY created_at DESC',
    ) as any[];
    return rows.map(this.rowToMeditation);
  }

  async getMeditationById(id: string): Promise<Meditation | null> {
    const row = this.db.getFirstSync(
      'SELECT * FROM meditations WHERE id = ?',
      [id],
    ) as any;
    return row ? this.rowToMeditation(row) : null;
  }

  async deleteMeditation(id: string): Promise<void> {
    this.db.runSync('DELETE FROM meditations WHERE id = ?', [id]);
  }

  async getPreference(key: string): Promise<string | null> {
    const row = this.db.getFirstSync(
      'SELECT value FROM preferences WHERE key = ?',
      [key],
    ) as any;
    return row?.value ?? null;
  }

  async setPreference(key: string, value: string): Promise<void> {
    this.db.runSync(
      'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
      [key, value],
    );
  }

  private rowToMeditation(row: any): Meditation {
    return new Meditation(
      row.id,
      row.prompt,
      row.type,
      row.target_duration,
      row.actual_duration,
      row.generated_text,
      row.audio_directory_path,
      row.voice_id,
      row.segment_count,
      new Date(row.created_at),
    );
  }
}
