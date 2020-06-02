import { MessageLogger } from 'ais-tools'
import { EventEmitter } from 'events'
import { DispatcherError } from './Errors'
import { IAisMessage } from './Interfaces'

import { default as dgram } from 'dgram'
import { default as moment } from 'moment'

export interface IDispatcher {
    on(event: 'status', listener: (status: any) => void): this;
    on(event: 'message', listener: (message: IAisMessage) => void): this;
    on(event: string, listener: () => void): this;
}

export class UDPDispatcher extends EventEmitter implements IDispatcher {
    private socket: dgram.Socket
    private config: any
    private logger: MessageLogger
    private started: boolean = false

    constructor(config: any, logger: MessageLogger) {
        super()
        this.config = config
        this.logger = logger

        this.socket = dgram.createSocket('udp4')
        this.socket.on('message', this.onMessage.bind(this))
        this.socket.on('listening', this.onListening.bind(this))
        this.socket.on('error', this.onError.bind(this))
    }

    public async start () : Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger.info('UDPDispatcher starting')
            try {
                this.socket.bind(this.config.udpPort, () => {
                    this.logger.info('UDPDispatcher started')
                    this.started = true
                    resolve()
                })
            } catch (ex) {
                reject(new DispatcherError(ex.message, ex))
            }
        })
    }

    public async stop () : Promise<void> {
        if (!this.started) return

        return new Promise((resolve, reject) => {
            this.logger.info('UDPDispatcher stopping')
            try {
                this.socket.close(() => {
                    this.logger.info('UDPDispatcher stopped')
                    resolve()
                })
            } catch (ex) {
                reject(new DispatcherError(ex.message, ex))
            }
        })
    }

    private onMessage (buffer: Buffer) : void {
        const utc = moment().utc()
        const message = buffer.toString('ascii').replace(/(\r\n|\n|\r)/gm, '')
        const data: string[] = []
        for (let partial of message.split('!AIVDM')) {
            if (partial.length > 0) {
                partial = '!AIVDM' + partial

                const isValid = this.validate(partial)
                if (!isValid) return

                data.push(partial)
            }
        }

        this.emit('message', { utc, data });
    }

    private onListening () : void {
        const address = this.socket.address();
        this.logger.info(`UDPDispatcher listening on udp://${address.address}:${address.port}`);
    }

    private onError (err: any) : void {
        this.stop()
        throw new DispatcherError('Error', err)
    }

    private validate (raw: string) : boolean {
        const message = raw.substr(1, raw.length - 4)
        const chk = raw.substr(-2)

        let checksum = 0
        for (let i = 0; i < message.length; i++) {
            checksum = checksum ^ message.charCodeAt(i)
        }

        let result = checksum.toString(16)
        result = '00'.substr(result.length) + result

        return result.toUpperCase() === chk.toUpperCase()
    }
}
