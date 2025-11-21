declare module 'express' {
  type RequestHandler = (req: any, res: any, next?: any) => any
  interface Application {
    use: (...handlers: any[]) => Application
    get: (path: string, ...handlers: RequestHandler[]) => Application
    post: (path: string, ...handlers: RequestHandler[]) => Application
    listen: (port: number, cb?: () => void) => any
  }
  interface Router extends Application {}
  interface Request {
    body?: any
    params: any
    query: any
    ip?: string
    headers: Record<string, string>
  }
  interface Response {
    json: (body: any) => Response
    send: (body: any) => Response
    status: (code: number) => Response
  }
  function express(): Application
  namespace express {
    function Router(): Router
    const json: () => any
  }
  export = express
}

declare module 'cors' {
  interface CorsOptions {
    origin?: string | true
  }
  function cors(options?: CorsOptions): any
  export = cors
}

declare module 'node-fetch' {
  export default function fetch(input: string, init?: any): Promise<any>
}
