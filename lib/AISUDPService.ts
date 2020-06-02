import { MessageLogger, Database, DatabaseError, PositionError } from 'ais-tools'

import { SSHTunnel } from './SSHTunnel'
import { UDPDispatcher } from './UDPDispatcher'
import { AIVDMDecoder } from './AIVDMDecoder'
import { IAisMessage } from './Interfaces'
import { EventEmitter } from 'events'

export class AISUDPService extends EventEmitter {
    config: any
    logger: MessageLogger
    tunnel: SSHTunnel
    database: Database
    dispatcher: UDPDispatcher
    decoder: AIVDMDecoder
    exiting: boolean = false
    connected: boolean = false

    constructor(config: any) {
        super()

        this.config = config

        this.logger = new MessageLogger(this.config.logger)
        this.tunnel = new SSHTunnel(this.config.ssh, this.logger)
        this.database = new Database(this.config.database)
        this.dispatcher = new UDPDispatcher(this.config.dispatcher, this.logger)
        this.decoder = new AIVDMDecoder(this.database, this.logger)
    }

    private async teardown(): Promise<void> {
        if (this.exiting) return
        this.exiting = true

        this.logger.info(`Teardown AISUDPService(${process.pid})`)
        await this.dispatcher.stop()

        if (this.connected) {
            await this.database.close()
            this.logger.info(`Database disconnected`)
        }

        await this.tunnel.stop()
        this.logger.info(`Exit AISUDPService(${process.pid})`)

        this.emit('exit')
    }

    private onMessage = async (message: IAisMessage): Promise<void> => {
        try {
            const decoded = await this.decoder.decode(message)
            await decoded.create()
        } catch (ex) {
            if (ex instanceof DatabaseError) {
                this.dispatcher.off('message', this.onMessage)
                this.logger.error(ex.name, ex.message)
                this.teardown()
            } else if (ex instanceof PositionError) {
                this.logger.verbose(ex.name, ex.message)
            } else {
                this.logger.warn(ex.name, ex.message)
            }
        }
    }

    public stop = async (): Promise<void> => {
        if (this.exiting) return

        this.logger.warn('AISUDPService Signal caught, exiting!')
        await this.teardown()
    }

    public async start(): Promise<void> {
        this.logger.info(`Start AISUDPService(${process.pid})`)

        try {
            this.tunnel.start()
            await this.database.connect()
            this.connected = true
            this.logger.info(`Database connected`)

            this.dispatcher.on('message', this.onMessage)
            await this.dispatcher.start()

            this.logger.info('AISUDPService started', {
                loglevel: this.logger.level,
                pid: process.pid,
                env: process.env.NODE_ENV
            })
        } catch (ex) {
            if (ex instanceof DatabaseError) {
                this.logger.error(ex.name, ex.message)
                this.teardown()
            } else {
                this.logger.warn(ex.name, ex.message)
            }
        }
    }
}