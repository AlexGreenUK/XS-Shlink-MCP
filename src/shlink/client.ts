import type { Config } from "../config.js";

export class ShlinkError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string,
    readonly problemType?: string,
  ) {
    super(message);
    this.name = "ShlinkError";
  }
}

export type QueryValue = string | number | boolean | undefined | null | string[];
export type FetchLike = typeof fetch;

export class ShlinkClient {
  constructor(
    private readonly config: Config,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  health(): Promise<unknown> {
    return this.request("/rest/health", { authenticated: false });
  }

  api(
    path: string,
    options: {
      method?: string;
      query?: Record<string, QueryValue>;
      body?: unknown;
    } = {},
  ): Promise<unknown> {
    return this.request(`/rest/v${this.config.apiVersion}${path}`, options);
  }

  private async request(
    path: string,
    options: {
      method?: string;
      query?: Record<string, QueryValue>;
      body?: unknown;
      authenticated?: boolean;
    } = {},
  ): Promise<unknown> {
    const url = new URL(`${this.config.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, item);
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.authenticated !== false) headers["X-Api-Key"] = this.config.apiKey;
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw new ShlinkError(
        error instanceof Error ? `Could not reach Shlink: ${error.message}` : "Could not reach Shlink",
      );
    }

    const requestId = response.headers.get("x-request-id") ?? undefined;
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new ShlinkError(`Shlink returned HTTP ${response.status}`, response.status, requestId);
        }
        data = text;
      }
    }

    if (!response.ok) {
      const problem = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      const detail =
        typeof problem.detail === "string"
          ? problem.detail
          : typeof problem.title === "string"
            ? problem.title
            : `Shlink returned HTTP ${response.status}`;
      throw new ShlinkError(
        detail,
        response.status,
        requestId,
        typeof problem.type === "string" ? problem.type : undefined,
      );
    }

    return data;
  }
}
