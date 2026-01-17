[POST]
degenbox-qicl.onrender.com/api/program/build-reveal-box-tx clientIP="185.184.195.53" requestID="f366f2a0-0a9c-44cd" responseTimeMS=20099 responseBytes=1103 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '146.88.134.218.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      [Symbol(shapeMode)]: false,
      [Symbol(kCapture)]: false,
      [Symbol(kBytesWritten)]: 0,
      [Symbol(kNeedDrain)]: false,
      [Symbol(corked)]: 0,
      [Symbol(kChunkedBuffer)]: [],
      [Symbol(kChunkedLength)]: 0,
      [Symbol(kSocket)]: [TLSSocket],
      [Symbol(kOutHeaders)]: [Object: null prototype],
      [Symbol(errored)]: null,
      [Symbol(kHighWaterMark)]: 65536,
      [Symbol(kRejectNonStandardBodyWrites)]: false,
      [Symbol(kUniqueHeaders)]: null
    },
    _currentUrl: 'https://146.88.134.218.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    [Symbol(shapeMode)]: true,
    [Symbol(kCapture)]: false
  },
  [cause]: Error: connect ECONNREFUSED 146.88.134.218:443
      at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16) {
    errno: -111,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '146.88.134.218',
    port: 443
  }
}
[Switchboard] Error creating reveal instruction: connect ECONNREFUSED 146.88.134.218:443
❌ Error building reveal box transaction: Error: Switchboard oracle unavailable after 3 attempts. (connect ECONNREFUSED 146.88.134.218:443)
    at createRevealInstruction (file:///opt/render/project/src/backend/lib/switchboard.js:211:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async file:///opt/render/project/src/backend/routes/program.js:2198:30
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="df70fd3b-1f1f-4450" responseTimeMS=4 responseBytes=979 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[Switchboard] Checking oracle health for devnet...
[Switchboard] Oracle health check: HEALTHY
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="a35b9e6d-904d-43f0" responseTimeMS=5 responseBytes=979 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="ca2fee20-25fe-4d4f" responseTimeMS=3 responseBytes=788 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="ffc2cfe3-dc0d-4da5" responseTimeMS=2 responseBytes=998 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
   Attempt 3/3: Trying SDK revealIx...
fetchRandomnessReveal error AxiosError: connect ECONNREFUSED 146.88.134.218:443
   SDK failed: connect ECONNREFUSED 146.88.134.218:443
    at AxiosError.from (/opt/render/project/src/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/opt/render/project/src/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:519:28)
    at eventHandlers.<computed> (/opt/render/project/src/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:519:28)
    at emitErrorEvent (node:_http_client:107:11)
    at TLSSocket.socketErrorListener (node:_http_client:574:5)
    at TLSSocket.emit (node:events:519:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/opt/render/project/src/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/opt/render/project/src/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  port: 443,
  address: '146.88.134.218',
  syscall: 'connect',
  code: 'ECONNREFUSED',
  errno: -111,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '320',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[25,247,127,123,193,105,105,196,254,143,101,108,219,196,173,245,254,212,53,86,245,69,198,243,25,15,114,200,194,236,109,23],"randomness_key":"3ec3ff20994f101dde373e303704f6caa9b3f728b79bf6807e0b5a3a2044e020","slot":435820506,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://146.88.134.218.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      [Symbol(kState)]: 17580812,
      [Symbol(kBufferedValue)]: null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '146.88.134.218.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 320,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 320,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 320\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 146.88.134.218.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '146.88.134.218.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      [Symbol(shapeMode)]: false,
      [Symbol(kCapture)]: false,
      [Symbol(kBytesWritten)]: 0,
      [Symbol(kNeedDrain)]: false,
      [Symbol(corked)]: 0,
      [Symbol(kChunkedBuffer)]: [],
      [Symbol(kChunkedLength)]: 0,
      [Symbol(kSocket)]: [TLSSocket],
      [Symbol(kOutHeaders)]: [Object: null prototype],
      [Symbol(errored)]: null,
      [Symbol(kHighWaterMark)]: 65536,
      [Symbol(kRejectNonStandardBodyWrites)]: false,
      [Symbol(kUniqueHeaders)]: null
    },
    _currentUrl: 'https://146.88.134.218.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    [Symbol(shapeMode)]: true,
    [Symbol(kCapture)]: false
  },
  [cause]: Error: connect ECONNREFUSED 146.88.134.218:443
      at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16) {
    errno: -111,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '146.88.134.218',
    port: 443
  }
}
[Switchboard] Error creating reveal instruction: connect ECONNREFUSED 146.88.134.218:443
❌ Error building reveal box transaction: Error: Switchboard oracle unavailable after 3 attempts. (connect ECONNREFUSED 146.88.134.218:443)
    at createRevealInstruction (file:///opt/render/project/src/backend/lib/switchboard.js:211:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async file:///opt/render/project/src/backend/routes/program.js:2198:30
[POST]
degenbox-qicl.onrender.com/api/program/build-reveal-box-tx clientIP="185.184.195.53" requestID="1bf5c6cd-bc6b-4718" responseTimeMS=20003 responseBytes=1103 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 109
   Box ID: 23
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3565 seconds
   Randomness account: 8K1EZAtW4GsLK15rLeKh4usaHwTBrfYFqbc4cVv95xDC
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: TkcnqYJfpvGMWFtkvYkEBf8Cxqh5muUaVH7ewTjbPMc
   Box Instance PDA: 3cuPfmBjM4Qz9B9M2daFsBri8aVDDNXmxko5EBrLY9HX
   Box created at: 2026-01-17T18:10:16.225Z
   Box committed at: 2026-01-17T18:12:22.503
   Luck (locked at commit): 30/60
🎰 Checking Switchboard VRF randomness status...
[Switchboard] Loading existing randomness account: 8K1EZAtW4GsLK15rLeKh4usaHwTBrfYFqbc4cVv95xDC
[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Reading randomness value from: 8K1EZAtW4GsLK15rLeKh4usaHwTBrfYFqbc4cVv95xDC
   Randomness not revealed yet - will include reveal instruction
📝 Building combined reveal transaction...
[Switchboard] Creating reveal instruction...
   Randomness pubkey: 8K1EZAtW4GsLK15rLeKh4usaHwTBrfYFqbc4cVv95xDC
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
[OPTIONS]
degenbox-qicl.onrender.com/api/program/build-reveal-box-tx clientIP="185.184.195.53" requestID="f523404b-6b5f-43b8" responseTimeMS=1 responseBytes=759 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
[Switchboard] Reading randomness value from: 8K1EZAtW4GsLK15rLeKh4usaHwTBrfYFqbc4cVv95xDC
   Randomness still not revealed after revealIx call - continuing with full transaction
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account
✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
[POST]
degenbox-qicl.onrender.com/api/program/build-reveal-box-tx clientIP="185.184.195.53" requestID="cb90ece3-67dd-470d" responseTimeMS=4951 responseBytes=1873 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
✅ Confirming box 23 reveal for project 109...
   Transaction: 3JsPjoNHgdqxv9tCBcUe5NDpVkM6rkTk6CbmBH4VPPyck4D1wf58L7PFww84E67UtPnjGzHQFiacYxmVf1hM4ZkR
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Jackpot (tier 4) - 40000000000 (40 3EYES)
   Luck: 43/60, Random: 99.56%
✅ Box reveal recorded in database
[OPTIONS]
degenbox-qicl.onrender.com/api/program/confirm-reveal clientIP="185.184.195.53" requestID="69e05b68-f0f9-406e" responseTimeMS=2 responseBytes=759 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[POST]
degenbox-qicl.onrender.com/api/program/confirm-reveal clientIP="185.184.195.53" requestID="1a91375c-c2f1-4bc4" responseTimeMS=767 responseBytes=1154 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[GET]
degenbox-qicl.onrender.com/api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN clientIP










    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 320,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 320\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 146.88.134.218.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
[POST]
degenbox-qicl.onrender.com/api/program/build-reveal-box-tx clientIP="185.184.195.53" requestID="d5715493-44b8-4f09" responseTimeMS=19861 responseBytes=1103 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '146.88.134.218.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      [Symbol(shapeMode)]: false,
      [Symbol(kCapture)]: false,
      [Symbol(kBytesWritten)]: 0,
      [Symbol(kNeedDrain)]: false,
      [Symbol(corked)]: 0,
      [Symbol(kChunkedBuffer)]: [],
      [Symbol(kChunkedLength)]: 0,
      [Symbol(kSocket)]: [TLSSocket],
      [Symbol(kOutHeaders)]: [Object: null prototype],
      [Symbol(errored)]: null,
      [Symbol(kHighWaterMark)]: 65536,
      [Symbol(kRejectNonStandardBodyWrites)]: false,
      [Symbol(kUniqueHeaders)]: null
    },
    _currentUrl: 'https://146.88.134.218.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    [Symbol(shapeMode)]: true,
    [Symbol(kCapture)]: false
  },
  [cause]: Error: connect ECONNREFUSED 146.88.134.218:443
      at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16) {
    errno: -111,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '146.88.134.218',
    port: 443
  }
}
[Switchboard] Error creating reveal instruction: connect ECONNREFUSED 146.88.134.218:443
❌ Error building reveal box transaction: Error: Switchboard oracle unavailable after 3 attempts. (connect ECONNREFUSED 146.88.134.218:443)
    at createRevealInstruction (file:///opt/render/project/src/backend/lib/switchboard.js:211:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async file:///opt/render/project/src/backend/routes/program.js:2198:30
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="44e41c9c-0819-41ca" responseTimeMS=7 responseBytes=980 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="47f5e872-1d9c-4920" responseTimeMS=2 responseBytes=998 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[Switchboard] Checking oracle health for devnet...
[Switchboard] Oracle health check: HEALTHY
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="f68de9c0-45a3-4932" responseTimeMS=582 responseBytes=980 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="dd390ce2-9b74-4b96" responseTimeMS=319 responseBytes=997 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
[Switchboard] Checking oracle health for devnet...
[Switchboard] Oracle health check: HEALTHY
[GET]
degenbox-qicl.onrender.com/api/oracle-health clientIP="185.184.195.53" requestID="67ceea3e-67e4-46e0" responseTimeMS