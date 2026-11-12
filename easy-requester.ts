interface IBaseConfig {
  baseUrl: string;
  onNewRequest?: "abort-previous" | "enqueue-new";
}

interface IRequestConfig {
  method: "GET" | "HEAD" | "OPTIONS" | "PUT" | "DELETE" | "POST" | "PATCH";
  route: string;
  headers?: {
    contentType?: string;
    bearerToken?: string;
    customHeaders?: Record<string, string>;
  };
  sendCookies?: boolean;
  baseUrlOverride?: string;
}

interface IResponse<TReturnedData> {
  success: boolean;
  message?: string;
  data?: TReturnedData;
}

class RequestAborter {
  private controllersMap: Map<string, AbortController> = new Map();
  private abortController?: AbortController;

  public setupAbortController(generatedURL: string, requestConfig: RequestInit): void {
    this.abortController = new AbortController();
    requestConfig.signal = this.abortController.signal;

    if (this.controllersMap.has(generatedURL)) {
      const previousController = this.controllersMap.get(generatedURL);
      previousController?.abort();
    }
    this.controllersMap.set(generatedURL, this.abortController);
  }

  public handleAbortError(generatedURL: string): void {
    this.controllersMap.delete(generatedURL);
  }

  public get controllers(): Map<string, AbortController> {
    return this.controllersMap;
  }
}

class RequestQueuer {
  private requestQueue: {
    requestFn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }[] = [];
  private isRequestInProgress: boolean = false;

  private async processQueue(): Promise<void> {
    if (this.isRequestInProgress || this.requestQueue.length === 0) return;

    const { requestFn, resolve, reject } = this.requestQueue.shift()!;
    this.isRequestInProgress = true;

    try {
      const response = await requestFn();
      resolve(response);
    } catch (error) {
      reject(error);
    } finally {
      this.isRequestInProgress = false;
      this.processQueue();
    }
  }

  public enqueueRequest<TResponse>(requestFn: () => Promise<TResponse>): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }
}

class ConfiguredRequester {
  private baseConfig: IBaseConfig;
  private requestConfig: IRequestConfig;

  private readonly requestAborter: RequestAborter;
  private readonly requestQueuer: RequestQueuer;

  constructor(easyRequesterConfig: IBaseConfig, perRequestConfig: IRequestConfig) {
    this.baseConfig = easyRequesterConfig;
    this.requestConfig = perRequestConfig;

    this.requestAborter = new RequestAborter();
    this.requestQueuer = new RequestQueuer();
  }

  private prepareHeaders(): HeadersInit {
    if (!this.requestConfig.headers) {
      return {} as HeadersInit;
    }
    const { contentType, bearerToken, customHeaders } = this.requestConfig.headers;
    return {
      "Content-Type": contentType ?? "application/json",
      ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
      ...(customHeaders ?? {}),
    } as HeadersInit;
  }

  private generateRequestUrl(): string {
    const baseUrl: string = this.requestConfig.baseUrlOverride ?? this.baseConfig.baseUrl;
    return `${baseUrl.replace(/\/+$/, "")}/${this.requestConfig.route.replace(/^\/+/, "")}`;
  }

  public async sendRequest<TReturnedData, TSentData>(payload?: TSentData): Promise<IResponse<TReturnedData>> {
    const generatedUrl: string = this.generateRequestUrl();

    const { onNewRequest } = this.baseConfig;
    const { method, sendCookies } = this.requestConfig;

    const requestFn = async (): Promise<IResponse<TReturnedData>> => {
      try {
        const requestConfig: RequestInit = {
          method,
          headers: this.prepareHeaders(),
          credentials: sendCookies ? "include" : "same-origin",
        };

        if (onNewRequest === "abort-previous") {
          this.requestAborter.setupAbortController(generatedUrl, requestConfig);
        }

        /**
         * Skip adding request body if request method is either 'GET' or 'HEAD'.
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD
         */
        if (!["GET", "HEAD"].includes(method)) {
          requestConfig.body = JSON.stringify(payload);
        }

        const response = await fetch(generatedUrl, requestConfig);
        if (!response.ok) {
          if (onNewRequest === "abort-previous") {
            this.requestAborter.controllers.delete(generatedUrl);
          }
          throw new Error(response.statusText);
        }

        return {
          success: true,
          message: response.statusText,
          data: await response.json(),
        };
      } catch (error) {
        if (onNewRequest === "abort-previous") {
          this.requestAborter.handleAbortError(generatedUrl);
        }

        return {
          success: false,
          message: error instanceof Error ? error.name : "An unknown error occurred during request.",
          data: undefined,
        };
      }
    };

    if (onNewRequest === "enqueue-new") {
      return this.requestQueuer.enqueueRequest(requestFn);
    }
    return await requestFn();
  }
}

export class EasyRequester {
  private baseConfig: IBaseConfig;

  constructor({ baseUrl, onNewRequest = "enqueue-new" }: IBaseConfig) {
    this.baseConfig = { baseUrl, onNewRequest };
  }

  public setRequestConfig(requestConfig: IRequestConfig): ConfiguredRequester {
    return new ConfiguredRequester(this.baseConfig, requestConfig);
  }
}
