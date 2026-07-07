import {
  NFC_CHALLENGE_MIME,
  decodeChallengePayload,
  type SmartlockChallenge,
} from "@shared/smartlock-protocol/index";

interface NdefRecord {
  recordType: string;
  mediaType?: string;
  encoding?: string;
  data: ArrayBuffer;
}

interface NdefReadingEvent extends Event {
  message: { records: NdefRecord[] };
}

interface NdefReaderInstance extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: { records: Array<{ recordType: string; data: string; mediaType?: string }> }): Promise<void>;
  addEventListener(type: "reading", listener: (event: NdefReadingEvent) => void): void;
  addEventListener(type: "readingerror", listener: () => void): void;
}

interface NdefReaderConstructor {
  new (): NdefReaderInstance;
}

function getNdefReaderClass(): NdefReaderConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { NDEFReader?: NdefReaderConstructor }).NDEFReader;
}

export function isWebNfcSupported(): boolean {
  return getNdefReaderClass() !== undefined;
}

/** Web NFC only works in secure contexts (HTTPS or localhost), not http://LAN-IP */
export function canUseWebNfc(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    isWebNfcSupported()
  );
}

function formatNfcError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("permission") && lower.includes("denied")) {
    return new Error(
      "Permiso NFC denegado. Web NFC requiere HTTPS (no funciona con http://IP). Usá el desafío demo o la app Android para NFC."
    );
  }
  if (lower.includes("not allowed") || lower.includes("secure context")) {
    return new Error(
      "Web NFC no está disponible en HTTP. Abrí el sitio por HTTPS, localhost, o usá la app Android para leer el tag."
    );
  }
  return error instanceof Error ? error : new Error(message);
}

export async function readChallengeFromNfc(timeoutMs = 30_000): Promise<SmartlockChallenge> {
  const NdefReader = getNdefReaderClass();
  if (!NdefReader) {
    throw new Error("Web NFC is not supported on this device. Use Chrome on Android.");
  }
  if (!window.isSecureContext) {
    throw new Error(
      "Web NFC requires HTTPS or localhost. Your LAN URL (http://IP:5173) cannot access NFC."
    );
  }

  const reader = new NdefReader();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("NFC scan timed out. Hold the phone closer to the lock."));
    }, timeoutMs);

    reader.addEventListener("reading", (event: NdefReadingEvent) => {
      window.clearTimeout(timer);
      try {
        for (const record of event.message.records) {
          if (record.recordType === "mime" && record.mediaType === NFC_CHALLENGE_MIME) {
            resolve(decodeChallengePayload(record.data));
            return;
          }
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding ?? "utf-8");
            resolve(decodeChallengePayload(decoder.decode(record.data)));
            return;
          }
        }
        reject(new Error("No smartlock challenge found on NFC tag."));
      } catch (error) {
        reject(error);
      }
    });

    reader.addEventListener("readingerror", () => {
      window.clearTimeout(timer);
      reject(new Error("Failed to read NFC tag."));
    });

    reader.scan().catch((error: unknown) => {
      window.clearTimeout(timer);
      reject(formatNfcError(error));
    });
  });
}

export async function writeResponseToNfc(responsePayload: string): Promise<void> {
  const NdefReader = getNdefReaderClass();
  if (!NdefReader) {
    throw new Error("Web NFC is not supported on this device.");
  }

  const writer = new NdefReader();
  await writer.write({
    records: [{ recordType: "text", data: responsePayload }],
  });
}
