import { PropertyMetadataDTO } from "@/models/contract-dtos";

/**
 * Fetches and parses metadata from an IPFS URI, Data URI, or standard HTTP URL.
 * 
 * @param uri - The metadata URI to fetch
 * @returns The parsed metadata object
 */
export class MetadataService {
  async fetchMetadata(uri: string): Promise<PropertyMetadataDTO> {
    let fetchUrl = uri;
    if (uri.startsWith("ipfs://")) {
      fetchUrl = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    let rawMetadata: PropertyMetadataDTO = {};

    if (fetchUrl.startsWith("data:")) {
      try {
        const base64Data = fetchUrl.split(",")[1];
        const jsonStr = decodeURIComponent(
          atob(base64Data)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        rawMetadata = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error(`Failed to parse data URI metadata: ${e}`);
      }
    } else if (fetchUrl) {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata JSON (status ${response.status}) for url: ${fetchUrl}`);
      }
      rawMetadata = await response.json();
    }

    return rawMetadata;
  }
}
