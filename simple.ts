import { MessageLogger, Database, UDPDispatcherService } from 'ais-tools'

const main = async function () {
    const logger = new MessageLogger({
        "level": "info",
        "filter": 0,
        "filename": "/usr/local/var/log/ais/rpi-c/%DATE%.log",
        "zippedArchive": false
    })

    const database = new Database({
        "url": "mongodb://ais:******@localhost:27017",
        "options": {
            "useNewUrlParser": true,
            "useUnifiedTopology": true
        },
        "dbName": "ais_tracker",
        "sender": "rpi"
    })

    const udpDispatcherService = new UDPDispatcherService(database, logger)

    await udpDispatcherService.run(10130)
}

try {
    main()
} catch (err) {
    console.error(err)
}
