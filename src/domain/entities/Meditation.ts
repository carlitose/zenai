export class Meditation {
  constructor(
    public readonly id: string,
    public readonly prompt: string,
    public readonly type: string,
    public readonly targetDuration: number,
    public readonly actualDuration: number,
    public readonly generatedText: string,
    public readonly audioDirectoryPath: string,
    public readonly voiceId: string,
    public readonly segmentCount: number,
    public readonly createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    prompt: string;
    type: string;
    targetDuration: number;
    actualDuration: number;
    generatedText: string;
    audioDirectoryPath: string;
    voiceId: string;
    segmentCount: number;
  }): Meditation {
    return new Meditation(
      params.id,
      params.prompt,
      params.type,
      params.targetDuration,
      params.actualDuration,
      params.generatedText,
      params.audioDirectoryPath,
      params.voiceId,
      params.segmentCount,
      new Date(),
    );
  }

  get excerpt(): string {
    const text = this.generatedText
      .replace(/\[SILENT\s+\d+s?\]/gi, '')
      .replace(/\[DONG\]/gi, '')
      .trim();
    return text.length > 100 ? text.slice(0, 100) + '...' : text;
  }

  get formattedDuration(): string {
    const minutes = Math.floor(this.actualDuration / 60);
    const seconds = Math.round(this.actualDuration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
