class RequestAborter {
  controllersMap = new Map();
  abortController;
  setupAbortController(generatedURL, requestConfig) {
    this.abortController = new AbortController();
    requestConfig.signal = this.abortController.signal;
    if (this.controllersMap.has(generatedURL)) {
      const previousController = this.controllersMap.get(generatedURL);
      previousController?.abort();
    }
    this.controllersMap.set(generatedURL, this.abortController);
  }
  handleAbortError(generatedURL) {
    this.controllersMap.delete(generatedURL);
  }
  get controllers() {
    return this.controllersMap;
  }
}
class RequestQueuer {
  requestQueue = [];
  isRequestInProgress = false;
  async processQueue() {
    if (this.isRequestInProgress || this.requestQueue.length === 0) return;
    const { requestFn, resolve, reject } = this.requestQueue.shift();
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
  enqueueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }
}
class ConfiguredRequester {
  baseConfig;
  requestConfig;
  requestAborter;
  requestQueuer;
  constructor(easyRequesterConfig, perRequestConfig) {
    this.baseConfig = easyRequesterConfig;
    this.requestConfig = perRequestConfig;
    this.requestAborter = new RequestAborter();
    this.requestQueuer = new RequestQueuer();
  }
  prepareHeaders() {
    if (!this.requestConfig.headers) {
      return {};
    }
    const { contentType, bearerToken, customHeaders } = this.requestConfig.headers;
    return {
      "Content-Type": contentType ?? "application/json",
      ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
      ...(customHeaders ?? {}),
    };
  }
  generateRequestUrl() {
    const baseUrl = this.requestConfig.baseUrlOverride ?? this.baseConfig.baseUrl;
    return `${baseUrl.replace(/\/+$/, "")}/${this.requestConfig.route.replace(/^\/+/, "")}`;
  }
  async sendRequest(payload) {
    const generatedUrl = this.generateRequestUrl();
    const { onNewRequest } = this.baseConfig;
    const { method, sendCookies } = this.requestConfig;
    const requestFn = async () => {
      try {
        const requestConfig = {
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
  baseConfig;
  constructor({ baseUrl, onNewRequest = "enqueue-new" }) {
    this.baseConfig = { baseUrl, onNewRequest };
  }
  setRequestConfig(requestConfig) {
    return new ConfiguredRequester(this.baseConfig, requestConfig);
  }
}
//# sourceMappingURL=easy-requester.js.map
