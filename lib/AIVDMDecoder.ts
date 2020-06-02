import { default as moment } from 'moment'
import { IAisMessage } from './Interfaces'
import { DecoderError} from './Errors'
import { PositionError, INmeaModel, IDatabase, MessageLogger, NmeaPositionCollection, NmeaPosition,
    NmeaShipdataCollection, NmeaShipdata, NmeaDefaultCollection, NmeaDefault } from 'ais-tools'

export class AIVDMDecoder {
    positionCollection: NmeaPositionCollection
    shipdataCollection: NmeaShipdataCollection
    defaultCollection: NmeaDefaultCollection
    logger: MessageLogger
    loglevel: number = 0

    constructor(db: IDatabase, logger: MessageLogger) {
        this.logger = logger
        this.positionCollection = new NmeaPositionCollection(db, logger)
        this.shipdataCollection = new NmeaShipdataCollection(db, logger)
        this.defaultCollection  = new NmeaDefaultCollection(db, logger)
    }

    public toBin(NmeaMessage: string): string {
        let bin: string = '';

        for (const char of NmeaMessage.split('')) {
            let dec = char.charCodeAt(0) - 48;
            if (dec > 40) {
                dec -= 8;
            }
            const n = dec.toString(2);
            bin += '000000'.substr(n.length) + n;
        }

        return bin
    }

    public async decode(aisMessage: IAisMessage): Promise<INmeaModel> {
        const utc = moment(aisMessage.utc)

        const a: string[] = aisMessage.data[0].split(',')
        let NmeaMessage: string = a[5]

        for (const item of aisMessage.data.slice(1)) {
            const b: string[] = item.split(',')
            NmeaMessage += b[5]
        }

        const bin: string = this.toBin(NmeaMessage)
        const aismsgnum: number = parseInt(bin.substr(0, 6), 2);
        try {
            switch (aismsgnum) {
                case 1:
                case 2:
                case 3:
                    const positionModel = new NmeaPosition(this.positionCollection);
                    return await positionModel.toModel(bin, utc, aisMessage.data)
                    break;
                case 5:
                    const shipdataModel = new NmeaShipdata(this.shipdataCollection);
                    return await shipdataModel.toModel(bin, utc, aisMessage.data)
                    break;
                default:
                    const defaultModel = new NmeaDefault(this.defaultCollection);
                    return await defaultModel.toModel(bin, utc, aisMessage.data)
                    break
            }
        } catch (ex) {
            if (ex instanceof PositionError) {
                throw ex
            } else {
                throw new DecoderError(ex.message, ex)
            }
        }
    }
}
