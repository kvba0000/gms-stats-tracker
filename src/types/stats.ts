export type StatsSettings = {
    /** Update interval in minutes */
    updateInterval?: number
}

export type GameMakerStatusIncidentLog = {
    actionNeeded: boolean,
    description: boolean,
    humanNeeded: boolean,
    loggedAt: string,
    severity: string
}

export type GameMakerStatusIncident = {
    closed: string,
    logs: GameMakerStatusIncidentLog[],
    started: string,
    title: string
}

export type GameMakerStatusNodeGame = {
    connected: number,
    highLoad: number,
    id: number,
    loggedIn: number,
    numSessions: number,
    title: string
}

export type GameMakerStatusNodeStatus = {
    avgPing: number,
    avgReceive: number,
    avgTick: number,
    cpu: number,
    errorRate: number,
    games: GameMakerStatusNodeGame[],
    highLoad: boolean,
    isDefault: boolean,
    isProxy: boolean,
    locked: boolean,
    minPing: boolean,
    nodeId: boolean,
    ram: boolean
}

export type GameMakerStatusResponse = {
    incidents: GameMakerStatusIncident[],
    loadHistory: number[],
    status: GameMakerStatusNodeStatus[]
}

export type Cache<T> = {
    expire: number,
    data: T
}