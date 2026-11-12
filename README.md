# EasyRequester

EasyRequester is a lightweight, modular HTTP client wrapper designed to simplify making HTTP requests using the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). It provides a simple, structured approach to making type-safe HTTP requests without any external dependencies.

## Key Features

- Built-in request concurrency management to handle overlapping requests.
- Built-in TypeScript support for type safety.
- Lightweight and dependency-free.

## Installation

```bash
git clone https://github.com/caganseyrek/easy-requester.git
cd path/to/easy-requester
npm build
```

## Documentation

EasyRequester is designed to be initialized once per project. After initializing the requester, you can export it and use it throughout your project.

```typescript
import { EasyRequester } from "path/to/easy-requester";

const requester = new EasyRequester({
  baseUrl: "https://example.com",
  onNewRequest: "enqueue-new",
});
```

Requests made using EasyRequester return a response matching the interface below, which accepts a generic type for the returned data.

```typescript
interface IResponse<TReturnedData> {
  success: boolean;
  message?: string;
  data?: TReturnedData;
}
```

## Configuration

### Base Configuration

```typescript
interface IBaseConfig {
  baseUrl: string;
  onNewRequest?: "abort-previous" | "enqueue-new";
}
```

- **baseUrl**: The base URL to which requests will be sent.
- **onNewRequest**: Determines how the requester handles overlapping requests.

### Request Configuration

```typescript
interface IRequestConfig {
  method: "GET" | "HEAD" | "OPTIONS" | "TRACE" | "PUT" | "DELETE" | "POST" | "PATCH" | "CONNECT";
  route: string;
  headers?: {
    contentType?: string;
    bearerToken?: string;
    customHeaders?: Record<string, string>;
  };
  sendCookies?: boolean;
  baseUrlOverride?: string;
}
```

1. `method`: Specifies the HTTP method used for the request.
2. `route`: Specifies the endpoint relative to the base URL configured during initialization.
3. `headers`
   - `contentType`: Specifies the media type of the request body. Defaults to `application/json`.
   - `bearerToken`: Sets the request's `Authorization` header using a bearer token (`Bearer <tokenValue>`).
   - `customHeaders`: Allows additional custom headers to be included in the request.
4. `sendCookies`: Determines whether cookies and other credentials are included with the request.
5. `baseUrlOverride`: Overrides the configured base URL for the current request only.

## Usage

```typescript
import { requester } from "path/to/initialized-requester";

const response = await requester
  .setRequestConfig({
    method: "GET",
    route: "/users",
    sendCookies: true,
  })
  .sendRequest<TReturnedData, TSentData>({ ...someDataToSend });
```

## Request Concurrency Management (Race Conditions)

Before exploring EasyRequester's concurrency management features, let's understand a common problem that can occur when handling multiple HTTP requests.

In the context of HTTP requests, an out-of-order response problem occurs when multiple requests are sent without waiting for previous ones to complete, and their responses arrive in a different order from which the requests were sent. This can lead to outdated information overwriting more recent data in the application.

Let's look at an example. Imagine a web application that retrieves user profile data from a server.

- The application sends **Request 1** to retrieve the user's profile.
- Before **Request 1** completes, the application sends **Request 2**.
- **Request 1** is still being processed.
- **Request 2** retrieves more recent profile data, perhaps because the user updated their profile in the meantime.
- **Request 2** completes first, and the application updates the UI with the latest data.
- **Request 1** completes afterward, and the application updates the UI with the older data, overwriting the more recent information.

As a result, the application displays outdated information even though it has already received more recent data.

### Why Does This Happen?

Several factors can contribute to out-of-order responses:

- **Network latency**: Requests can take different amounts of time to complete due to varying network conditions.
- **Server processing time**: Different requests may require different amounts of processing time, resulting in different response times.
- **Concurrent execution**: Requests are generally processed independently, so their completion order is not necessarily the same as their submission order.

Unless the application explicitly manages request execution or response handling, it may process responses in the order they arrive rather than the order in which requests were sent.

### How to Deal With Race Conditions

EasyRequester provides two strategies for managing overlapping requests:

1. **Queuing New Requests**: When a request is in progress, subsequent requests are added to a queue and processed sequentially in FIFO (First In, First Out) order. Each request waits for the previous one to complete before execution begins.
2. **Aborting Previous Requests**: When a new request is sent while another request is still in progress, the requester aborts the previous request and sends the new one instead.

**Note**: Aborting a request on the client side does not guarantee that the server stops processing it. The server may continue executing the request even after the client has aborted it. Therefore, this strategy is primarily intended to prevent outdated responses from being processed by the client, rather than to prevent conflicting server-side operations.

## Roadmap

- Interceptors
- Timeout Handling
- Request Throttling
- Request Deduplication
- Custom Middleware Support
- Retry Mechanism
- CLI Support for Sending Requests
- Automatic Token Refresh
- Plugin system (?)

## License

This project is open-source and licensed under [MIT License](https://github.com/caganseyrek/EasyRequester/blob/main/LICENSE).
