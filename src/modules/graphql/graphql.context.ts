import { IncomingMessage } from 'http';

export interface Context {
    req?: IncomingMessageWithAuthCode;
}

export class IncomingMessageWithAuthCode extends IncomingMessage {
    authCode?: number;
}
