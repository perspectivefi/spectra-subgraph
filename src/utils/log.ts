import { log } from "@graphprotocol/graph-ts"

export function logCritical(
    message: string,
    parameters: string[] = new Array<string>()
): void {
    log.critical(message, parameters)
}

export function logWarning(
    message: string,
    parameters: string[] = new Array<string>()
): void {
    log.warning(message, parameters)
}

export function logInfo(
    message: string,
    parameters: string[] = new Array<string>()
): void {
    log.info(message, parameters)
}

export function logDebug(
    message: string,
    parameters: string[] = new Array<string>()
): void {
    log.debug(message, parameters)
}
