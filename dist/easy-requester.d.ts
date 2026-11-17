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
declare class ConfiguredRequester {
  private baseConfig;
  private requestConfig;
  private readonly requestAborter;
  private readonly requestQueuer;
  constructor(easyRequesterConfig: IBaseConfig, perRequestConfig: IRequestConfig);
  private prepareHeaders;
  private generateRequestUrl;
  sendRequest<TReturnedData, TSentData>(payload?: TSentData): Promise<IResponse<TReturnedData>>;
}
export declare class EasyRequester {
  private baseConfig;
  constructor({ baseUrl, onNewRequest }: IBaseConfig);
  setRequestConfig(requestConfig: IRequestConfig): ConfiguredRequester;
}
export {};
