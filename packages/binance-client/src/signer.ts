import * as crypto from 'crypto';

export interface SignatureHeaders {
  'X-OC-APIKEY': string;
  'X-OC-TIMESTAMP': string;
  'X-OC-SIGN': string;
  'X-OC-RECV-WINDOW': string;
  'X-OC-NONCE': string;
  'Content-Type': string;
}

export function generateSignatureHeaders(
  apiKey: string,
  apiSecret: string,
  method: string,
  requestPath: string,
  body: string = '',
  recvWindow: number = 5000
): SignatureHeaders {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const upperMethod = method.toUpperCase();

  // Signature payload: timestamp + method + requestPath + body
  const payload = `${timestamp}${upperMethod}${requestPath}${body}`;
  const sign = crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('base64');

  return {
    'X-OC-APIKEY': apiKey,
    'X-OC-TIMESTAMP': timestamp,
    'X-OC-SIGN': sign,
    'X-OC-RECV-WINDOW': String(recvWindow),
    'X-OC-NONCE': nonce,
    'Content-Type': 'application/json',
  };
}
