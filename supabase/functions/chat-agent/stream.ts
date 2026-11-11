export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, any>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLine = raw.split("\n").find((line) => line.startsWith("data: "));
      if (dataLine) {
        try {
          yield JSON.parse(dataLine.slice(6));
        } catch {
          // ignore keep-alive frames and the OpenAI end marker
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

export async function providerHttpError(name: string, response: Response): Promise<Error> {
  const detail = await response.text().catch(() => "");
  return new Error(`${name} request failed (${response.status}): ${detail.slice(0, 300)}`);
}
