
import { config } from 'node-config-ts'
import { AISUDPService } from './lib'

const main = async function () {
    process.stdin.resume()

    const service = new AISUDPService(config)

    service.on('exit', () => process.exit())

    process.on('SIGUSR1', service.stop)
    process.on('SIGUSR2', service.stop)
    process.on('SIGINT', service.stop)

    service.start()
}

main()