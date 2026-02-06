# ZenAI — Generatore Audio di Meditazione Personalizzata

> Specifica completa del progetto — MVP

---

## 1. Overview

**ZenAI** è un'app mobile che genera meditazioni audio personalizzate tramite AI. A differenza di Calm e Headspace che offrono solo meditazioni pre-registrate, ZenAI permette all'utente di descrivere esattamente ciò di cui ha bisogno — tema, stile, durata — e ricevere un audio unico generato al momento, completo di momenti di silenzio per respirazione e osservazione.

| Campo | Dettaglio |
|-------|-----------|
| **Tipo progetto** | MVP |
| **Target** | Piccolo gruppo (beta tester) |
| **Piattaforma** | Mobile (iOS + Android) via Expo |
| **Tech Stack** | Expo / React Native, SQLite locale, OpenAI API (GPT + TTS) |
| **Backend** | Nessuno — tutto client-side |
| **Auth** | Nessuna |
| **Distribuzione** | Solo demo (Expo Go) |
| **Developer** | Solo (Carlo) |
| **Timeline** | Nessuna deadline fissa |

---

## 2. Phase 1: Requirements

### 2.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR01 | L'utente scrive un prompt testuale descrivendo la meditazione desiderata (tema, tipo, durata, stile) |
| FR02 | L'app genera il testo della meditazione tramite OpenAI GPT, includendo marker di silenzio `[SILENT Xs]` per pause di respirazione e osservazione |
| FR03 | L'app splitta il testo generato per marker di silenzio, genera TTS per ogni segmento vocale, crea clip di silenzio della durata indicata, e concatena tutto in un unico file MP3 |
| FR04 | Player audio integrato (play, pause, progresso) per ascoltare la meditazione |
| FR05 | Storico delle meditazioni generate, salvate localmente con SQLite |
| FR06 | Riascolto offline delle meditazioni già generate |
| FR07 | Schermata preferenze dove l'utente inserisce la propria API key OpenAI |
| FR08 | Preferenze di default salvabili (voce, durata tipica) |
| FR09 | Lingua della meditazione decisa dall'utente tramite il prompt |
| FR10 | GPT pianifica la distribuzione parlato (~130 parole/min a speed 0.9) + silenzi per raggiungere la durata target richiesta dall'utente |

### 2.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR01 | Loading state durante la generazione con indicatore di progresso per segmento |
| NFR02 | Meditazioni già generate disponibili offline |
| NFR03 | Compatibile iOS e Android tramite Expo |
| NFR04 | Tutto client-side, nessun backend |

### 2.3 Constraints

| ID | Constraint |
|----|------------|
| C01 | MVP — funzionalità minime, velocità di sviluppo prioritaria |
| C02 | Solo developer (Carlo) |
| C03 | Nessuna timeline fissa |
| C04 | Costi solo OpenAI API (pay-per-use) |
| C05 | Distribuzione solo demo (Expo Go) |
| C06 | Nessuna autenticazione |
| C07 | Solo voce guidata, no musica di sottofondo |
| C08 | OpenAI TTS ha limite ~4096 caratteri per chiamata — il chunking è gestito dallo splitting per marker di silenzio |

---

## 3. Phase 2: Specifications

### 3.1 User Stories

#### Setup

| ID | User Story |
|----|------------|
| US01 | Come utente, voglio inserire la mia API key OpenAI nelle impostazioni, così l'app può generare meditazioni |
| US02 | Come utente, voglio salvare le mie preferenze di default (voce, durata tipica), così non devo reimpostarle ogni volta |

#### Core Flow

| ID | User Story |
|----|------------|
| US03 | Come utente, voglio scrivere un prompt descrivendo la meditazione che desidero, così l'app crea qualcosa di personalizzato per me |
| US04 | Come utente, voglio selezionare opzioni rapide (tipo meditazione, durata in minuti) oltre al prompt, così posso essere più preciso senza scrivere tutto |
| US05 | Come utente, voglio vedere un indicatore di progresso durante la generazione che mi mostri a che segmento siamo, così so che l'app sta lavorando |
| US06 | Come utente, voglio ascoltare la meditazione generata con un player (play, pause, barra progresso), così posso fruirla comodamente |
| US07 | Come utente, voglio che l'audio generato venga salvato automaticamente sul dispositivo, così posso riascoltarlo senza rigenerarlo |
| US12 | Come utente, voglio che la meditazione includa momenti di silenzio per respirazione e osservazione, così l'esperienza è autentica e non un monologo continuo |
| US13 | Come utente, voglio scegliere la durata in minuti e che l'audio risultante rispetti approssimativamente quella durata, così posso pianificare le mie sessioni |

#### Storico & Gestione

| ID | User Story |
|----|------------|
| US08 | Come utente, voglio vedere una lista delle meditazioni generate in passato, così posso ritrovarle facilmente |
| US09 | Come utente, voglio riascoltare una meditazione dallo storico, così posso riutilizzare quelle che mi sono piaciute |
| US10 | Come utente, voglio eliminare meditazioni dallo storico, così posso liberare spazio e tenere solo quelle utili |
| US11 | Come utente, voglio vedere i dettagli di ogni meditazione (prompt usato, data, durata, tipo), così posso orientarmi nello storico |

### 3.2 Use Cases

#### UC01: Genera Meditazione

| Campo | Descrizione |
|-------|-------------|
| **Actor** | Utente |
| **Preconditions** | API key OpenAI configurata nelle impostazioni |
| **Trigger** | L'utente preme "Genera" dopo aver compilato il prompt |
| **Main Flow** | 1. L'utente scrive un prompt e/o seleziona opzioni rapide (tipo, durata in minuti) |
| | 2. L'app valida l'input (prompt non vuoto, API key presente) |
| | 3. L'app invia il prompt a OpenAI GPT con istruzioni sulla durata target (~130 parole/min per parlato, marker `[SILENT Xs]` per pause) |
| | 4. L'app mostra loading "Generazione testo..." |
| | 5. L'app riceve il testo con marker di silenzio e lo splitta in segmenti |
| | 6. Per ogni segmento vocale, l'app genera audio TTS (mostra progresso "Segmento X di N") |
| | 7. L'app genera clip di silenzio per ogni marker `[SILENT Xs]` |
| | 8. L'app concatena tutti i segmenti audio + silenzi in un unico file MP3 |
| | 9. L'app salva il file audio finale localmente |
| | 10. L'app salva i metadata in SQLite (prompt, data, durata effettiva, tipo) |
| | 11. L'app apre il Player con la meditazione pronta |
| **Alternative Flow** | 3a. API key non valida → mostra errore, invita a controllare le impostazioni |
| | 3b. Errore rete/OpenAI → mostra errore, consente di riprovare |
| | 6a. Un segmento TTS fallisce → mostra errore con opzione "Riprova dal segmento X" |
| | 8a. Concatenazione fallisce → mostra errore, offre retry |
| **Postconditions** | Meditazione audio (con silenzi) salvata localmente, visibile nello storico, player aperto |

#### UC02: Riascolta Meditazione dallo Storico

| Campo | Descrizione |
|-------|-------------|
| **Actor** | Utente |
| **Preconditions** | Almeno una meditazione salvata nello storico |
| **Trigger** | L'utente seleziona una meditazione dalla lista storico |
| **Main Flow** | 1. L'utente apre la schermata Storico |
| | 2. L'app mostra la lista delle meditazioni (titolo, data, durata, tipo) |
| | 3. L'utente tappa su una meditazione |
| | 4. L'app apre il Player e carica il file audio locale |
| | 5. L'utente ascolta con controlli play/pause/progresso |
| **Alternative Flow** | 4a. File audio non trovato (cancellato manualmente dal dispositivo) → mostra errore, offre opzione di rigenerare |
| **Postconditions** | L'utente ha ascoltato la meditazione |

#### UC03: Configura API Key e Preferenze

| Campo | Descrizione |
|-------|-------------|
| **Actor** | Utente |
| **Preconditions** | Nessuna |
| **Trigger** | L'utente apre la schermata Preferenze |
| **Main Flow** | 1. L'utente naviga alle Impostazioni |
| | 2. L'utente inserisce/modifica la API key OpenAI |
| | 3. L'utente imposta preferenze di default (voce TTS, durata tipica in minuti) |
| | 4. L'app salva tutto in SQLite |
| | 5. L'app conferma il salvataggio |
| **Alternative Flow** | 2a. L'utente inserisce una API key con formato non valido → mostra errore di validazione |
| **Postconditions** | Preferenze e API key salvate, pronte per essere usate nella generazione |

### 3.3 Data Models

```typescript
// Meditazione generata
interface Meditation {
  id: string;              // UUID generato localmente
  prompt: string;          // Prompt scritto dall'utente
  type: string;            // Tipo meditazione (guidata, vipassana, rilassamento, sonno, ecc.)
  targetDuration: number;  // Durata richiesta dall'utente in secondi
  actualDuration: number;  // Durata effettiva dell'audio finale in secondi
  generatedText: string;   // Testo completo generato da GPT (con marker [SILENT])
  audioFilePath: string;   // Path locale del file audio finale (concatenato)
  voiceId: string;         // Voce TTS usata (es. "alloy", "nova", "shimmer")
  segmentCount: number;    // Numero di segmenti vocali generati
  createdAt: string;       // ISO timestamp
}

// Segmento di meditazione (usato internamente durante la generazione)
interface MeditationSegment {
  type: 'speech' | 'silence'; // Tipo segmento
  content: string;             // Testo per speech, durata per silence (es. "30")
  durationSeconds: number;     // Durata del segmento in secondi
  audioFilePath?: string;      // Path file audio del segmento (temporaneo)
}

// Preferenze utente
interface UserPreferences {
  apiKey: string;          // OpenAI API key
  defaultVoice: string;    // Voce TTS di default
  defaultDuration: number; // Durata tipica in minuti (5, 10, 15, 20, 30, 40)
}
```

**Schema SQLite:**

```sql
CREATE TABLE meditations (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  type TEXT,
  target_duration INTEGER,
  actual_duration INTEGER,
  generated_text TEXT,
  audio_file_path TEXT NOT NULL,
  voice_id TEXT,
  segment_count INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 3.4 API Contracts / Interfaces

```typescript
// Servizio generazione meditazione (testo + audio)
interface MeditationGeneratorPort {
  // Genera testo meditazione con marker [SILENT Xs]
  generateText(input: GenerateTextInput, apiKey: string): Promise<string>;

  // Genera audio TTS per un singolo segmento di testo
  generateSegmentAudio(text: string, voice: VoiceOption, apiKey: string): Promise<string>;
}

interface GenerateTextInput {
  prompt: string;
  type?: string;
  durationMinutes?: number;  // durata target totale
}

// Servizio audio stitching (split, silenzi, concatenazione)
interface AudioStitcherPort {
  // Parsa il testo e lo divide in segmenti (speech + silence)
  parseSegments(generatedText: string): MeditationSegment[];

  // Genera un file audio di silenzio della durata specificata
  generateSilence(durationSeconds: number): Promise<string>;

  // Concatena tutti i file audio (speech + silence) in un unico MP3
  concatenate(segmentPaths: string[]): Promise<string>;

  // Calcola la durata totale attesa dei segmenti
  estimateDuration(segments: MeditationSegment[]): number;
}

// Servizio storage locale
interface StoragePort {
  saveMeditation(meditation: Meditation): Promise<void>;
  getMeditations(): Promise<Meditation[]>;
  getMeditationById(id: string): Promise<Meditation | null>;
  deleteMeditation(id: string): Promise<void>;
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;
}

// Servizio audio player
interface AudioPlayerPort {
  load(filePath: string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(positionSeconds: number): Promise<void>;
  getStatus(): Promise<AudioStatus>;
  onStatusUpdate(callback: (status: AudioStatus) => void): void;
  unload(): Promise<void>;
}

interface AudioStatus {
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
}
```

**Chiamate OpenAI utilizzate:**

| Endpoint | Scopo | Input | Output |
|----------|-------|-------|--------|
| `POST /v1/chat/completions` | Generare testo meditazione con marker silenzi | System prompt con istruzioni durata + user prompt | Testo con `[SILENT Xs]` |
| `POST /v1/audio/speech` | Testo segmento → Audio (chiamato N volte, una per segmento) | Testo segmento, voce, formato | File audio mp3 |

### 3.5 Edge Cases

#### Rete & API

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC01 | Nessuna connessione internet | Mostra errore "Connessione necessaria per generare", storico resta accessibile offline |
| EC02 | API key non valida o scaduta | Mostra errore chiaro "API key non valida", rimanda alle impostazioni |
| EC03 | OpenAI rate limit raggiunto | Mostra errore "Troppi tentativi, riprova tra poco" |
| EC04 | Timeout chiamata OpenAI (>60s) | Cancella la richiesta, mostra errore con opzione "Riprova" |
| EC05 | Errore TTS su un singolo segmento | Mostra errore con opzione "Riprova dal segmento X", segmenti già generati conservati |

#### Input & Validazione

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC06 | Prompt vuoto | Bottone "Genera" disabilitato |
| EC07 | Prompt molto lungo (>2000 caratteri) | Tronca o mostra limite caratteri |
| EC08 | API key non ancora configurata e utente prova a generare | Redirect alle impostazioni con messaggio esplicativo |

#### Durata & Segmenti

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC14 | GPT non include marker [SILENT] nel testo | L'app genera comunque l'audio come singolo segmento (graceful degradation) |
| EC15 | GPT genera testo con durata stimata molto diversa dal target (>±30%) | L'app mostra la durata effettiva, nessun blocco |
| EC16 | Segmento di testo supera limite 4096 caratteri TTS | L'app splitta ulteriormente il segmento in sotto-parti |
| EC17 | Meditazione molto lunga (40+ min) con molti segmenti | Mostra progresso "Segmento X di N", consente di attendere |

#### Storage & Dispositivo

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC09 | Spazio disco insufficiente per salvare audio | Mostra errore, suggerisce di eliminare meditazioni vecchie |
| EC10 | File audio corrotto o cancellato manualmente | Mostra errore nello storico, offre opzione di rigenerare |
| EC11 | App chiusa durante la generazione | Segmenti parziali puliti, utente può riprovare |

#### Player

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC12 | Interruzione audio (chiamata, notifica) | Mette in pausa, riprende quando l'utente torna |
| EC13 | Lock screen durante ascolto | Audio continua in background |

### 3.6 Quality Requirements

#### Usability

| ID | Requirement |
|----|-------------|
| QR01 | Dalla home alla generazione in massimo 2 tap (scrivi prompt → genera) |
| QR02 | Feedback visivo immediato all'avvio della generazione (loading entro 500ms) |
| QR03 | Opzioni rapide (tipo, durata in minuti) selezionabili con un singolo tap |
| QR14 | Progresso generazione mostra fase corrente (testo → segmento X/N → concatenazione) |

#### Performance

| ID | Requirement |
|----|-------------|
| QR04 | Generazione testo GPT: entro 15s |
| QR05 | Generazione audio TTS per segmento: entro 15s |
| QR06 | Apertura storico e caricamento lista: entro 1s |
| QR07 | Avvio playback audio locale: entro 500ms |
| QR15 | Concatenazione segmenti: entro 5s per meditazione da 10 min |
| QR16 | Generazione completa meditazione 10 min (~5 segmenti): entro 90s |

#### Reliability

| ID | Requirement |
|----|-------------|
| QR08 | Audio salvato localmente sempre disponibile offline |
| QR09 | Perdita connessione durante generazione gestita con errore chiaro e possibilità di retry dal segmento fallito |
| QR10 | Nessuna perdita dati nello storico in caso di crash dell'app |
| QR17 | Segmenti temporanei puliti dopo generazione completata o fallita |

#### Maintainability

| ID | Requirement |
|----|-------------|
| QR11 | Codice organizzato con separazione chiara tra UI, logica e servizi |
| QR12 | Servizi OpenAI isolati dietro interfacce, sostituibili facilmente (es. cambio provider AI) |
| QR13 | TypeScript strict mode per type safety |
| QR18 | AudioStitcher isolato come servizio indipendente, riutilizzabile se si aggiunge musica di sottofondo in futuro |

---

## 4. Phase 3: System Design

### 4.1 Architecture Overview

Clean Architecture light con 4 layer e dependency rule verso l'interno.

```
┌─────────────────────────────────────────────────┐
│                 PRESENTATION                     │
│         (Screens, Components, Hooks)             │
│                                                  │
│  Dipende solo da Application (mai da Infra)      │
└──────────────────────┬──────────────────────────┘
                       │ chiama
                       ▼
┌─────────────────────────────────────────────────┐
│                 APPLICATION                      │
│       (Use Cases, Ports / Interfaces)            │
│                                                  │
│  Orchestrano il flusso, definiscono i Ports      │
│  Dipendono da Domain per le entities             │
└──────────────────────┬──────────────────────────┘
                       │ usa
                       ▼
┌─────────────────────────────────────────────────┐
│                   DOMAIN                         │
│              (Entities, Value Objects)            │
│                                                  │
│  Zero dipendenze. Puro modello di business.      │
└─────────────────────────────────────────────────┘
                       ▲
                       │
┌──────────────────────┴──────────────────────────┐
│               INFRASTRUCTURE                     │
│            (Adapters / Implementations)          │
│                                                  │
│  OpenAI API, AudioStitcher, SQLite, FileSystem,  │
│  Audio Player                                    │
│  Implementa i Ports definiti in Application      │
└─────────────────────────────────────────────────┘
```

**Dependency Rule:**
- **Presentation** → Application
- **Application** → Domain
- **Infrastructure** → Application (implementa i Ports) + Domain (usa le Entities)

### 4.2 Project Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── Meditation.ts
│   └── value-objects/
│       ├── MeditationType.ts
│       ├── MeditationSegment.ts
│       └── VoiceOption.ts
│
├── application/
│   ├── ports/
│   │   ├── MeditationGeneratorPort.ts
│   │   ├── AudioStitcherPort.ts
│   │   ├── StoragePort.ts
│   │   └── AudioPlayerPort.ts
│   ├── use-cases/
│   │   ├── GenerateMeditationUseCase.ts
│   │   ├── PlayMeditationUseCase.ts
│   │   ├── GetMeditationHistoryUseCase.ts
│   │   ├── DeleteMeditationUseCase.ts
│   │   └── ManagePreferencesUseCase.ts
│   └── dto/
│       ├── GenerateMeditationInput.ts
│       └── GenerateMeditationOutput.ts
│
├── infrastructure/
│   ├── openai/
│   │   └── OpenAIMeditationGenerator.ts
│   ├── audio-stitcher/
│   │   └── ExpoAudioStitcher.ts
│   ├── storage/
│   │   └── SQLiteStorageAdapter.ts
│   ├── audio/
│   │   └── ExpoAudioPlayerAdapter.ts
│   └── filesystem/
│       └── FileSystemService.ts
│
├── presentation/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── GeneratingScreen.tsx
│   │   ├── PlayerScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── PromptInput.tsx
│   │   ├── QuickOptions.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── MeditationCard.tsx
│   │   ├── GenerationProgress.tsx
│   │   └── LoadingIndicator.tsx
│   ├── hooks/
│   │   ├── useGenerateMeditation.ts
│   │   ├── useAudioPlayer.ts
│   │   ├── useMeditationHistory.ts
│   │   └── usePreferences.ts
│   └── navigation/
│       └── AppNavigator.tsx
│
├── di/
│   └── container.ts
│
└── app/
    └── App.tsx
```

### 4.3 Component Diagrams

**Navigation & Screen Hierarchy**

```
App.tsx
└── AppNavigator (Bottom Tab Navigator)
    ├── Tab: Home
    │   ├── HomeScreen
    │   │   ├── PromptInput
    │   │   └── QuickOptions (tipo + durata minuti)
    │   └── GeneratingScreen (modal/push)
    │       └── GenerationProgress
    │           ├── Phase indicator (testo → audio segmento X/N → concatenazione)
    │           └── LoadingIndicator
    │
    ├── Tab: History
    │   └── HistoryScreen
    │       └── MeditationCard (× N)
    │           └── Mostra durata effettiva
    │
    └── Tab: Settings
        └── SettingsScreen

PlayerScreen (modal fullscreen, raggiungibile da Home e History)
├── AudioPlayer
│   ├── Play/Pause button
│   ├── Progress bar
│   └── Duration label (durata effettiva)
└── Meditation details (prompt, tipo, data, durata)
```

**Hook → Use Case → Port Wiring**

```
┌─ Presentation ──────────────────────────────────────┐
│                                                      │
│  useGenerateMeditation ──► GenerateMeditationUC      │
│  useAudioPlayer ─────────► PlayMeditationUC          │
│  useMeditationHistory ──► GetHistoryUC               │
│                           DeleteMeditationUC         │
│  usePreferences ─────────► ManagePreferencesUC       │
│                                                      │
└──────────────────────────┬───────────────────────────┘
                           │
┌─ Application ────────────▼───────────────────────────┐
│                                                      │
│  GenerateMeditationUC ──► MeditationGeneratorPort    │
│                           AudioStitcherPort          │
│                           StoragePort                │
│  PlayMeditationUC ──────► AudioPlayerPort            │
│  GetHistoryUC ──────────► StoragePort                │
│  DeleteMeditationUC ────► StoragePort                │
│  ManagePreferencesUC ───► StoragePort                │
│                                                      │
└──────────────────────────┬───────────────────────────┘
                           │
┌─ Infrastructure ─────────▼───────────────────────────┐
│                                                      │
│  OpenAIMeditationGenerator → MeditationGeneratorPort │
│  ExpoAudioStitcher ────────→ AudioStitcherPort       │
│  SQLiteStorageAdapter ─────→ StoragePort             │
│  ExpoAudioPlayerAdapter ──→ AudioPlayerPort          │
│  FileSystemService (usato da Generator e Stitcher)   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 4.4 Data Flow Diagrams

#### Flow 1: Genera Meditazione (con audio stitching)

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐
│ HomeScreen │  │ Generate   │  │ Generator  │  │ Stitcher   │  │ Storage    │  │ OpenAI   │
│            │  │ UseCase    │  │ Port       │  │ Port       │  │ Port       │  │ API      │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────┬─────┘
      │               │              │              │              │              │
      │ 1. submit     │              │              │              │              │
      │ (prompt,type, │              │              │              │              │
      │  duration)    │              │              │              │              │
      │ ─────────────>│              │              │              │              │
      │               │              │              │              │              │
      │               │ 2. get       │              │              │              │
      │               │ apiKey       │              │              │              │
      │               │ ────────────────────────────────────────>│              │
      │               │ <─── apiKey ─────────────────────────────│              │
      │               │              │              │              │              │
      │               │ 3. generate  │              │              │              │
      │  onProgress   │    Text()    │              │              │              │
      │  ("testo")    │ ───────────> │              │              │              │
      │ <─────────────│              │ 4. POST      │              │              │
      │               │              │ /completions │              │              │
      │               │              │ ─────────────────────────────────────────>│
      │               │              │ <──── testo con [SILENT Xs] ───────────│
      │               │ <── testo ───│              │              │              │
      │               │              │              │              │              │
      │               │ 5. parse     │              │              │              │
      │               │ Segments()   │              │              │              │
      │               │ ────────────────────────>  │              │              │
      │               │ <── segments[] ─────────── │              │              │
      │               │              │              │              │              │
      │               │ 6. FOR EACH speech segment:│              │              │
      │  onProgress   │              │              │              │              │
      │  ("seg X/N")  │ generate     │              │              │              │
      │ <─────────────│ SegmentAudio()             │              │              │
      │               │ ───────────> │              │              │              │
      │               │              │ POST /speech │              │              │
      │               │              │ ─────────────────────────────────────────>│
      │               │              │ <──── audio mp3 ─────────────────────────│
      │               │ <── path ────│              │              │              │
      │               │              │              │              │              │
      │               │ 7. FOR EACH silence segment:              │              │
      │               │ generateSilence()          │              │              │
      │               │ ────────────────────────>  │              │              │
      │               │ <── silence path ────────  │              │              │
      │               │              │              │              │              │
      │  onProgress   │ 8. concat    │              │              │              │
      │  ("concat")   │ enate()      │              │              │              │
      │ <─────────────│ ────────────────────────>  │              │              │
      │               │ <── final mp3 path ──────  │              │              │
      │               │              │              │              │              │
      │               │ 9. save      │              │              │              │
      │               │ Meditation() │              │              │              │
      │               │ ────────────────────────────────────────>│              │
      │               │ <── saved ───────────────────────────────│              │
      │               │              │              │              │              │
      │ <── Meditation│              │              │              │              │
      │    entity     │              │              │              │              │
      │               │              │              │              │              │
      │ 10. navigate  │              │              │              │              │
      │ to Player     │              │              │              │              │
```

#### Flow 2: Riascolta dallo Storico

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ HistoryScreen│  │ GetHistoryUC │  │ StoragePort   │  │ PlayerScreen │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                  │
       │ 1. onMount()   │                 │                  │
       │ ──────────────>│                 │                  │
       │                │ 2. getMeditations()                │
       │                │ ───────────────>│                  │
       │                │ <── list ───────│                  │
       │ <── list ──────│                 │                  │
       │                 │                 │                  │
       │ 3. render cards │                 │                  │
       │                 │                 │                  │
       │ 4. tap card     │                 │                  │
       │ ─────────────────────────────────────────────────> │
       │                 │                 │    meditation    │
       │                 │                 │    entity passed │
       │                 │                 │    via navigation│
```

#### Flow 3: Configura Preferenze

```
┌────────────────┐  ┌───────────────────┐  ┌──────────────┐
│ SettingsScreen │  │ ManagePrefsUC     │  │ StoragePort   │
└───────┬────────┘  └────────┬──────────┘  └──────┬───────┘
        │                    │                    │
        │ 1. onMount()      │                    │
        │ ─────────────────>│                    │
        │                   │ 2. getPreference() │
        │                   │ ──────────────────>│
        │                   │ <── values ────────│
        │ <── current prefs │                    │
        │                    │                    │
        │ 3. save(apiKey,   │                    │
        │    voice, duration)│                    │
        │ ─────────────────>│                    │
        │                   │ 4. setPreference() │
        │                   │ ──────────────────>│
        │                   │ <── saved ─────────│
        │ <── confirmed ────│                    │
```

### 4.5 UI State Diagrams

#### App Global State

```
┌──────────┐                          ┌──────────┐
│  INIT    │── check API key ────────>│  READY   │
│          │   key exists             │          │
└────┬─────┘                          └────┬─────┘
     │                                     │
     │ key missing                         │ user navigates
     ▼                                     ▼
┌──────────┐                          ┌──────────┐
│ SETUP    │── key saved ────────────>│  READY   │
│ REQUIRED │                          │          │
└──────────┘                          └──────────┘
```

#### Generation Flow State (with stitching)

```
                    ┌───────────┐
                    │   IDLE    │
                    │ (Home)    │
                    └─────┬─────┘
                          │ tap "Genera"
                          ▼
                    ┌───────────┐
                    │GENERATING │
                    │  TEXT     │
                    └─────┬─────┘
                     ╱         ╲
                success       error
                  ╱               ╲
                 ▼                 ▼
           ┌───────────┐    ┌───────────┐
           │ PARSING   │    │  ERROR    │──── retry ───> GENERATING TEXT
           │ SEGMENTS  │    └───────────┘
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │GENERATING │
           │ AUDIO     │
           │ seg X/N   │◄─── next segment
           └─────┬─────┘
            ╱         ╲
       all done      error
         ╱               ╲
        ▼                 ▼
  ┌───────────┐    ┌───────────┐
  │CONCATENA- │    │  ERROR    │──── retry seg X ───> GENERATING AUDIO
  │ TING      │    │  SEGMENT  │
  └─────┬─────┘    └─────┬─────┘
   ╱         ╲           │ dismiss
 success    error        ▼
   ╱           ╲    ┌───────────┐
  ▼             ▼   │   IDLE    │
┌──────┐  ┌──────┐  └───────────┘
│ DONE │  │ERROR │
└──┬───┘  │CONCAT│──── retry ───> CONCATENATING
   │      └──────┘
   │ auto-navigate
   ▼
┌───────────┐
│  PLAYER   │
└───────────┘
```

#### Audio Player State

```
┌──────────┐                         ┌──────────┐
│  IDLE    │── load(filePath) ──────>│ LOADING  │
└──────────┘                         └────┬─────┘
                                      ╱       ╲
                                 success     error
                                   ╱             ╲
                                  ▼               ▼
                            ┌──────────┐    ┌──────────┐
               ┌───────────>│  READY   │    │  ERROR   │
               │            │ (paused) │    └──────────┘
               │            └────┬─────┘
               │                 │ play
               │                 ▼
               │            ┌──────────┐
               │            │ PLAYING  │◄─── resume
               │            └────┬─────┘
               │            ╱    │    ╲
               │       pause     │    finished
               │        ╱       seek      ╲
               │       ▼         │         ▼
               │  ┌──────────┐   │    ┌──────────┐
               │  │  PAUSED  │   │    │ FINISHED │
               │  └──────────┘   │    └────┬─────┘
               │                 │         │
               │                 ▼         │ replay
               │            ┌──────────┐   │
               │            │ PLAYING  │<──┘
               │            │ (seeked) │
               │            └──────────┘
               │
               └── new meditation loaded
```

#### History Screen State

```
┌──────────┐                     ┌──────────┐
│ LOADING  │── data loaded ─────>│  LOADED  │
└──────────┘     (has items)     └────┬─────┘
     │                                │
     │ data loaded                    │ delete item
     │ (empty)                        ▼
     ▼                           ┌──────────┐
┌──────────┐                     │ CONFIRM  │
│  EMPTY   │<── last item ──────│ DELETE   │
│          │    deleted          └────┬─────┘
└──────────┘                     ╱       ╲
                            confirm    cancel
                              ╱           ╲
                             ▼             ▼
                        ┌──────────┐  ┌──────────┐
                        │ DELETING │  │  LOADED  │
                        └────┬─────┘  └──────────┘
                             │
                             ▼
                        ┌──────────┐
                        │  LOADED  │
                        │(updated) │
                        └──────────┘
```

### 4.6 Implementation Details

#### Domain — Entities

```typescript
// domain/entities/Meditation.ts
export class Meditation {
  constructor(
    public readonly id: string,
    public readonly prompt: string,
    public readonly type: string,
    public readonly targetDuration: number,
    public readonly actualDuration: number,
    public readonly generatedText: string,
    public readonly audioFilePath: string,
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
    audioFilePath: string;
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
      params.audioFilePath,
      params.voiceId,
      params.segmentCount,
      new Date(),
    );
  }
}
```

#### Domain — Value Objects

```typescript
// domain/value-objects/MeditationType.ts
export const MeditationTypes = {
  GUIDED: 'guided',
  VIPASSANA: 'vipassana',
  SLEEP: 'sleep',
  RELAXATION: 'relaxation',
  SELF_COMPASSION: 'self_compassion',
  BREATHING: 'breathing',
} as const;

export type MeditationType = (typeof MeditationTypes)[keyof typeof MeditationTypes];
```

```typescript
// domain/value-objects/MeditationSegment.ts
export interface MeditationSegment {
  type: 'speech' | 'silence';
  content: string;
  durationSeconds: number;
  audioFilePath?: string;
}
```

```typescript
// domain/value-objects/VoiceOption.ts
export const VoiceOptions = {
  ALLOY: 'alloy',
  ECHO: 'echo',
  FABLE: 'fable',
  NOVA: 'nova',
  ONYX: 'onyx',
  SHIMMER: 'shimmer',
} as const;

export type VoiceOption = (typeof VoiceOptions)[keyof typeof VoiceOptions];
```

#### Application — Use Cases

```typescript
// application/use-cases/GenerateMeditationUseCase.ts
import { Meditation } from '../../domain/entities/Meditation';
import { MeditationGeneratorPort } from '../ports/MeditationGeneratorPort';
import { AudioStitcherPort } from '../ports/AudioStitcherPort';
import { StoragePort } from '../ports/StoragePort';
import { GenerateMeditationInput } from '../dto/GenerateMeditationInput';
import * as Crypto from 'expo-crypto';

export type GenerationPhase =
  | { phase: 'generating_text' }
  | { phase: 'generating_audio'; current: number; total: number }
  | { phase: 'concatenating' }
  | { phase: 'done' };

export class GenerateMeditationUseCase {
  constructor(
    private generator: MeditationGeneratorPort,
    private stitcher: AudioStitcherPort,
    private storage: StoragePort,
  ) {}

  async execute(
    input: GenerateMeditationInput,
    onProgress?: (phase: GenerationPhase) => void,
  ): Promise<Meditation> {
    // 1. Recupera API key e preferenze
    const apiKey = await this.storage.getPreference('apiKey');
    if (!apiKey) throw new Error('API_KEY_MISSING');

    const voice = input.voice
      ?? (await this.storage.getPreference('defaultVoice'))
      ?? 'nova';

    // 2. Genera testo con marker [SILENT Xs]
    onProgress?.({ phase: 'generating_text' });
    const generatedText = await this.generator.generateText(
      { prompt: input.prompt, type: input.type, durationMinutes: input.durationMinutes },
      apiKey,
    );

    // 3. Parsa segmenti
    const segments = this.stitcher.parseSegments(generatedText);
    const speechSegments = segments.filter(s => s.type === 'speech');
    const totalSpeechSegments = speechSegments.length;

    // 4. Genera audio per ogni segmento
    const audioPaths: string[] = [];
    let speechIndex = 0;

    for (const segment of segments) {
      if (segment.type === 'speech') {
        speechIndex++;
        onProgress?.({ phase: 'generating_audio', current: speechIndex, total: totalSpeechSegments });
        const audioPath = await this.generator.generateSegmentAudio(segment.content, voice as any, apiKey);
        audioPaths.push(audioPath);
      } else {
        const silencePath = await this.stitcher.generateSilence(segment.durationSeconds);
        audioPaths.push(silencePath);
      }
    }

    // 5. Concatena tutto
    onProgress?.({ phase: 'concatenating' });
    const finalAudioPath = await this.stitcher.concatenate(audioPaths);

    // 6. Calcola durata effettiva
    const actualDuration = this.stitcher.estimateDuration(segments);

    // 7. Crea entity e salva
    const meditation = Meditation.create({
      id: Crypto.randomUUID(),
      prompt: input.prompt,
      type: input.type ?? 'guided',
      targetDuration: (input.durationMinutes ?? 10) * 60,
      actualDuration,
      generatedText,
      audioFilePath: finalAudioPath,
      voiceId: voice,
      segmentCount: segments.length,
    });

    await this.storage.saveMeditation(meditation);

    onProgress?.({ phase: 'done' });
    return meditation;
  }
}
```

```typescript
// application/dto/GenerateMeditationInput.ts
export interface GenerateMeditationInput {
  prompt: string;
  type?: string;
  durationMinutes?: number;
  voice?: string;
}
```

```typescript
// application/use-cases/GetMeditationHistoryUseCase.ts
import { Meditation } from '../../domain/entities/Meditation';
import { StoragePort } from '../ports/StoragePort';

export class GetMeditationHistoryUseCase {
  constructor(private storage: StoragePort) {}

  async execute(): Promise<Meditation[]> {
    return this.storage.getMeditations();
  }
}
```

```typescript
// application/use-cases/DeleteMeditationUseCase.ts
import { StoragePort } from '../ports/StoragePort';
import * as FileSystem from 'expo-file-system';

export class DeleteMeditationUseCase {
  constructor(private storage: StoragePort) {}

  async execute(id: string): Promise<void> {
    const meditation = await this.storage.getMeditationById(id);
    if (meditation) {
      await FileSystem.deleteAsync(meditation.audioFilePath, { idempotent: true });
      await this.storage.deleteMeditation(id);
    }
  }
}
```

```typescript
// application/use-cases/ManagePreferencesUseCase.ts
import { StoragePort } from '../ports/StoragePort';

export class ManagePreferencesUseCase {
  constructor(private storage: StoragePort) {}

  async getApiKey(): Promise<string | null> {
    return this.storage.getPreference('apiKey');
  }

  async setApiKey(key: string): Promise<void> {
    await this.storage.setPreference('apiKey', key);
  }

  async getDefaultVoice(): Promise<string> {
    return (await this.storage.getPreference('defaultVoice')) ?? 'nova';
  }

  async setDefaultVoice(voice: string): Promise<void> {
    await this.storage.setPreference('defaultVoice', voice);
  }

  async getDefaultDuration(): Promise<number> {
    const val = await this.storage.getPreference('defaultDuration');
    return val ? parseInt(val, 10) : 10;
  }

  async setDefaultDuration(minutes: number): Promise<void> {
    await this.storage.setPreference('defaultDuration', minutes.toString());
  }
}
```

#### Infrastructure — OpenAI Adapter

```typescript
// infrastructure/openai/OpenAIMeditationGenerator.ts
import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { VoiceOption } from '../../domain/value-objects/VoiceOption';
import * as FileSystem from 'expo-file-system';

const WORDS_PER_MINUTE = 130;

const SYSTEM_PROMPT = `You are an expert meditation guide. Generate a meditation script based on the user's request.

CRITICAL RULES FOR DURATION AND SILENCE:
- The user will specify a target duration in minutes.
- Spoken words are delivered at approximately ${WORDS_PER_MINUTE} words per minute.
- You MUST include moments of silence using the marker [SILENT Xs] where X is the number of seconds.
- Silences are essential: they allow the listener to breathe, observe, and be present. A meditation is NOT a continuous monologue.
- Plan the total duration as: spoken_words / ${WORDS_PER_MINUTE} + sum_of_silences = target_duration
- Distribute silences naturally: short ones (5-10s) between phrases, medium ones (15-30s) for breathing exercises, long ones (30-120s) for deep observation or body scanning.
- For a 10-minute meditation: aim for ~7 minutes of speech (~910 words) and ~3 minutes of silence distributed throughout.
- For a 20-minute meditation: aim for ~12 minutes of speech (~1560 words) and ~8 minutes of silence.
- For a 40-minute meditation: aim for ~20 minutes of speech (~2600 words) and ~20 minutes of silence.

FORMATTING:
- Write ONLY the meditation script, no meta-commentary.
- Use [SILENT Xs] markers on their own line.
- Example: "Now close your eyes and take a deep breath...\\n[SILENT 10]\\nNotice how your body feels..."

Respond in the same language as the user's prompt.`;

export class OpenAIMeditationGenerator implements MeditationGeneratorPort {

  async generateText(input: GenerateTextInput, apiKey: string): Promise<string> {
    const userPrompt = this.buildUserPrompt(input);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OPENAI_TEXT_ERROR: ${error.error?.message ?? response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateSegmentAudio(text: string, voice: VoiceOption, apiKey: string): Promise<string> {
    if (text.length > 4000) {
      return this.generateLongSegmentAudio(text, voice, apiKey);
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`OPENAI_TTS_ERROR: ${response.statusText}`);
    }

    return this.saveBlobToFile(response);
  }

  private async generateLongSegmentAudio(text: string, voice: VoiceOption, apiKey: string): Promise<string> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > 4000) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) chunks.push(current.trim());

    const paths: string[] = [];
    for (const chunk of chunks) {
      const path = await this.generateSegmentAudio(chunk, voice, apiKey);
      paths.push(path);
    }

    return paths[0]; // TODO: handle multi-chunk concatenation in stitcher
  }

  private async saveBlobToFile(response: Response): Promise<string> {
    const filePath = `${FileSystem.cacheDirectory}segments/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.cacheDirectory}segments/`,
      { intermediates: true }
    );

    const blob = await response.blob();
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const base64Data = base64.split(',')[1];

    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return filePath;
  }

  private buildUserPrompt(input: GenerateTextInput): string {
    let prompt = input.prompt;
    if (input.type) prompt += `\nMeditation type: ${input.type}`;
    if (input.durationMinutes) prompt += `\nTarget total duration: ${input.durationMinutes} minutes`;
    return prompt;
  }
}
```

#### Infrastructure — Audio Stitcher

```typescript
// infrastructure/audio-stitcher/ExpoAudioStitcher.ts
import { AudioStitcherPort } from '../../application/ports/AudioStitcherPort';
import { MeditationSegment } from '../../domain/value-objects/MeditationSegment';
import * as FileSystem from 'expo-file-system';

const SILENCE_MARKER_REGEX = /\[SILENT\s+(\d+)s?\]/gi;
const WORDS_PER_MINUTE = 130;

export class ExpoAudioStitcher implements AudioStitcherPort {

  parseSegments(generatedText: string): MeditationSegment[] {
    const segments: MeditationSegment[] = [];
    let lastIndex = 0;

    const matches = [...generatedText.matchAll(SILENCE_MARKER_REGEX)];

    for (const match of matches) {
      const matchIndex = match.index!;

      const speechText = generatedText.slice(lastIndex, matchIndex).trim();
      if (speechText.length > 0) {
        const wordCount = speechText.split(/\s+/).length;
        segments.push({
          type: 'speech',
          content: speechText,
          durationSeconds: (wordCount / WORDS_PER_MINUTE) * 60,
        });
      }

      const silenceDuration = parseInt(match[1], 10);
      segments.push({
        type: 'silence',
        content: match[1],
        durationSeconds: silenceDuration,
      });

      lastIndex = matchIndex + match[0].length;
    }

    const remainingText = generatedText.slice(lastIndex).trim();
    if (remainingText.length > 0) {
      const wordCount = remainingText.split(/\s+/).length;
      segments.push({
        type: 'speech',
        content: remainingText,
        durationSeconds: (wordCount / WORDS_PER_MINUTE) * 60,
      });
    }

    if (segments.length === 0) {
      const wordCount = generatedText.split(/\s+/).length;
      segments.push({
        type: 'speech',
        content: generatedText,
        durationSeconds: (wordCount / WORDS_PER_MINUTE) * 60,
      });
    }

    return segments;
  }

  async generateSilence(durationSeconds: number): Promise<string> {
    const sampleRate = 44100;
    const numSamples = sampleRate * durationSeconds;

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    this.writeWavHeader(view, numSamples, sampleRate);

    const filePath = `${FileSystem.cacheDirectory}segments/silence-${durationSeconds}s-${Date.now()}.wav`;
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.cacheDirectory}segments/`,
      { intermediates: true }
    );

    const base64 = this.arrayBufferToBase64(buffer);
    await FileSystem.writeAsStringAsync(filePath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return filePath;
  }

  async concatenate(segmentPaths: string[]): Promise<string> {
    const finalPath = `${FileSystem.documentDirectory}meditations/${Date.now()}.mp3`;
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}meditations/`,
      { intermediates: true }
    );

    // NOTE: For production, use react-native-ffmpeg or a native module
    // for proper MP3/WAV concatenation with cross-fading.
    // MVP approach: concatenate raw audio data
    const buffers: string[] = [];
    for (const path of segmentPaths) {
      const base64 = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.Base64,
      });
      buffers.push(base64);
    }

    await FileSystem.writeAsStringAsync(finalPath, buffers.join(''), {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Clean up temp segment files
    for (const path of segmentPaths) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }

    return finalPath;
  }

  estimateDuration(segments: MeditationSegment[]): number {
    return segments.reduce((total, seg) => total + seg.durationSeconds, 0);
  }

  private writeWavHeader(view: DataView, numSamples: number, sampleRate: number): void {
    const byteRate = sampleRate * 2;
    const dataSize = numSamples * 2;

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
```

#### Infrastructure — Storage Adapter

```typescript
// infrastructure/storage/SQLiteStorageAdapter.ts
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
        actual_duration INTEGER,
        generated_text TEXT,
        audio_file_path TEXT NOT NULL,
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
      `INSERT INTO meditations (id, prompt, type, target_duration, actual_duration, generated_text, audio_file_path, voice_id, segment_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.prompt, m.type, m.targetDuration, m.actualDuration, m.generatedText, m.audioFilePath, m.voiceId, m.segmentCount, m.createdAt.toISOString()]
    );
  }

  async getMeditations(): Promise<Meditation[]> {
    const rows = this.db.getAllSync(
      'SELECT * FROM meditations ORDER BY created_at DESC'
    ) as any[];
    return rows.map(this.rowToMeditation);
  }

  async getMeditationById(id: string): Promise<Meditation | null> {
    const row = this.db.getFirstSync(
      'SELECT * FROM meditations WHERE id = ?', [id]
    ) as any;
    return row ? this.rowToMeditation(row) : null;
  }

  async deleteMeditation(id: string): Promise<void> {
    this.db.runSync('DELETE FROM meditations WHERE id = ?', [id]);
  }

  async getPreference(key: string): Promise<string | null> {
    const row = this.db.getFirstSync(
      'SELECT value FROM preferences WHERE key = ?', [key]
    ) as any;
    return row?.value ?? null;
  }

  async setPreference(key: string, value: string): Promise<void> {
    this.db.runSync(
      'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  private rowToMeditation(row: any): Meditation {
    return new Meditation(
      row.id, row.prompt, row.type,
      row.target_duration, row.actual_duration,
      row.generated_text, row.audio_file_path, row.voice_id,
      row.segment_count,
      new Date(row.created_at),
    );
  }
}
```

#### Infrastructure — Audio Player Adapter

```typescript
// infrastructure/audio/ExpoAudioPlayerAdapter.ts
import { AudioPlayerPort, AudioStatus } from '../../application/ports/AudioPlayerPort';
import { Audio } from 'expo-av';

export class ExpoAudioPlayerAdapter implements AudioPlayerPort {
  private sound: Audio.Sound | null = null;
  private statusCallback: ((status: AudioStatus) => void) | null = null;

  async load(filePath: string): Promise<void> {
    await this.unload();
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: filePath },
      { shouldPlay: false },
      this.onPlaybackStatusUpdate.bind(this),
    );
    this.sound = sound;
  }

  async play(): Promise<void> { await this.sound?.playAsync(); }
  async pause(): Promise<void> { await this.sound?.pauseAsync(); }
  async resume(): Promise<void> { await this.sound?.playAsync(); }

  async seekTo(positionSeconds: number): Promise<void> {
    await this.sound?.setPositionAsync(positionSeconds * 1000);
  }

  async getStatus(): Promise<AudioStatus> {
    const status = await this.sound?.getStatusAsync();
    if (status?.isLoaded) {
      return {
        isPlaying: status.isPlaying,
        positionSeconds: (status.positionMillis ?? 0) / 1000,
        durationSeconds: (status.durationMillis ?? 0) / 1000,
      };
    }
    return { isPlaying: false, positionSeconds: 0, durationSeconds: 0 };
  }

  onStatusUpdate(callback: (status: AudioStatus) => void): void {
    this.statusCallback = callback;
  }

  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  private onPlaybackStatusUpdate(status: any): void {
    if (status.isLoaded && this.statusCallback) {
      this.statusCallback({
        isPlaying: status.isPlaying,
        positionSeconds: (status.positionMillis ?? 0) / 1000,
        durationSeconds: (status.durationMillis ?? 0) / 1000,
      });
    }
  }
}
```

#### DI Container

```typescript
// di/container.ts
import { OpenAIMeditationGenerator } from '../infrastructure/openai/OpenAIMeditationGenerator';
import { ExpoAudioStitcher } from '../infrastructure/audio-stitcher/ExpoAudioStitcher';
import { SQLiteStorageAdapter } from '../infrastructure/storage/SQLiteStorageAdapter';
import { ExpoAudioPlayerAdapter } from '../infrastructure/audio/ExpoAudioPlayerAdapter';
import { GenerateMeditationUseCase } from '../application/use-cases/GenerateMeditationUseCase';
import { GetMeditationHistoryUseCase } from '../application/use-cases/GetMeditationHistoryUseCase';
import { DeleteMeditationUseCase } from '../application/use-cases/DeleteMeditationUseCase';
import { ManagePreferencesUseCase } from '../application/use-cases/ManagePreferencesUseCase';

const generator = new OpenAIMeditationGenerator();
const stitcher = new ExpoAudioStitcher();
const storage = new SQLiteStorageAdapter();
const audioPlayer = new ExpoAudioPlayerAdapter();

export const container = {
  generateMeditation: new GenerateMeditationUseCase(generator, stitcher, storage),
  getMeditationHistory: new GetMeditationHistoryUseCase(storage),
  deleteMeditation: new DeleteMeditationUseCase(storage),
  managePreferences: new ManagePreferencesUseCase(storage),
  audioPlayer,
};
```

#### Presentation — Hook (with progress)

```typescript
// presentation/hooks/useGenerateMeditation.ts
import { useState, useCallback } from 'react';
import { Meditation } from '../../domain/entities/Meditation';
import { container } from '../../di/container';
import { GenerationPhase } from '../../application/use-cases/GenerateMeditationUseCase';

export function useGenerateMeditation() {
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    prompt: string,
    type?: string,
    durationMinutes?: number,
    voice?: string,
  ) => {
    try {
      setError(null);
      const result = await container.generateMeditation.execute(
        { prompt, type, durationMinutes, voice },
        setPhase,
      );
      setMeditation(result);
      return result;
    } catch (err: any) {
      setError(err.message ?? 'Errore durante la generazione');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setPhase(null);
    setMeditation(null);
    setError(null);
  }, []);

  return { phase, meditation, error, generate, reset };
}
```

---

## 5. Appendix

### 5.1 Expo Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-av": "~14.0.0",
    "expo-crypto": "~13.0.0",
    "expo-file-system": "~17.0.0",
    "expo-sqlite": "~14.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0"
  }
}
```

### 5.2 OpenAI Models Used

| Model | Purpose | Cost estimate |
|-------|---------|---------------|
| `gpt-4o-mini` | Text generation with silence markers | ~$0.002 per meditation |
| `tts-1` | Text-to-speech (per segment) | ~$0.015 per 1000 chars |

### 5.3 Estimated Cost per Meditation

Per una meditazione di 10 minuti (~7 min parlato = 910 parole ≈ 5000 chars, ~3 min silenzi):
- GPT-4o-mini: ~$0.002
- TTS-1 (~5 segmenti): ~$0.075
- **Totale: ~$0.08 per meditazione da 10 min**

Per una meditazione di 40 minuti (~20 min parlato = 2600 parole ≈ 15000 chars, ~20 min silenzi):
- GPT-4o-mini: ~$0.005
- TTS-1 (~10-12 segmenti): ~$0.23
- **Totale: ~$0.23 per meditazione da 40 min**

### 5.4 Duration Planning Reference

| Durata target | Parlato (~130 wpm) | Silenzio | Parole stimate | Segmenti stimati |
|---------------|--------------------|----------|----------------|------------------|
| 5 min | ~3.5 min | ~1.5 min | ~455 | 3-4 |
| 10 min | ~7 min | ~3 min | ~910 | 5-6 |
| 15 min | ~10 min | ~5 min | ~1300 | 7-8 |
| 20 min | ~12 min | ~8 min | ~1560 | 8-10 |
| 30 min | ~16 min | ~14 min | ~2080 | 10-12 |
| 40 min | ~20 min | ~20 min | ~2600 | 12-15 |

### 5.5 Technical Notes

**Audio Concatenation**: L'MVP usa un approccio semplificato per la concatenazione audio. Per una versione production, considerare `react-native-ffmpeg` o un modulo nativo per una concatenazione MP3 corretta con cross-fading tra segmenti.

**Silence Generation**: I silenzi sono generati come file WAV vuoti. Questo è sufficiente per l'MVP ma in production si potrebbe migliorare con fade-in/fade-out o suoni ambientali leggeri.

**TTS Character Limit**: OpenAI TTS supporta fino a 4096 caratteri per chiamata. Lo splitting per marker `[SILENT]` naturalmente tiene i segmenti corti, ma è implementato un fallback per segmenti troppo lunghi.
