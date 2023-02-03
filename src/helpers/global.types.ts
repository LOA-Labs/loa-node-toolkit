import { HttpEndpoint } from "@cosmjs/tendermint-rpc";

export type Service = {
  enabled?: boolean
  run_on_start?: boolean
  title: string
  cron: string
  force_notify_count: number
  active_notify_count?: number
  ws_watchers?: any
  notify?: object
  uuid: string | undefined
}

export type Command = {
  enabled?: boolean
  title: string
  use_mnemonic: string
  force_notify_count: number
  credentials?: object
  notify?: object
}

export type LntConfig = {
  enabled?: boolean
  title: string
  services?: {
    status?: Service
    rewards?: Service
    proposals?: Service
    distribution?: Service
  }
  commands?: {
    vote?: Command,
  }
  grantee_mnemonics?: object
  notifications?: object
  explorer?: string
  networks: NetworkConfig[]
  debug: {
    TEST_CRON_ONLY: boolean
    SCHEDULE_CRON: boolean
  }
}

export type NetworkConfig = {
  enabled?: boolean
  name: string
  chain_id: string
  coingecko_id?: string
  denom: string
  gas_prices: string
  gas_auto: boolean
  rpc: string
  disk_check_endpoint?: string
  granter: string
  valoper: string
  restake: number
  network_handles?: object
  filter_services?: string[]
  explorer?: string
}