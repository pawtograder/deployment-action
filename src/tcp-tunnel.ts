import { createServer, Server } from 'net'
import { WebSocket } from 'ws'

export class TCPTunnelClient {
  private localServer: Server | null = null

  constructor(
    private wsUrl: string,
    private localPort: number,
    private token: string
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.localServer = createServer((socket) => {
        const earlyData: Buffer[] = []
        console.log('New local connection established')
        const ws = new WebSocket(this.wsUrl, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        })

        ws.on('open', () => {
          console.log(`WebSocket connected to ${this.wsUrl}`)
          if (earlyData.length > 0) {
            for (const data of earlyData) {
              ws.send(data)
            }
          }
        })

        ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error)
          socket.destroy()
          ws.close()
        })

        ws.on('close', () => {
          console.log('WebSocket connection closed')
          socket.destroy()
        })

        ws.on('message', (data: Buffer) => {
          socket.write(data)
        })

        // Handle data from local socket
        socket.on('data', (data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data)
          } else {
            earlyData.push(data)
          }
        })

        // Handle local socket close
        socket.on('close', () => {
          console.log('Local connection closed')
          ws.close()
        })

        // Handle local socket error
        socket.on('error', (error) => {
          console.error('Local socket error:', error)
          ws.close()
        })
      })

      this.localServer.listen(this.localPort, () => {
        console.log(`TCP tunnel listening on port ${this.localPort}`)
        resolve()
      })

      this.localServer.on('error', (error) => {
        console.error('Local server error:', error)
        reject(error)
      })
    })
  }

  disconnect(): void {
    this.cleanup()
  }

  private cleanup(): void {
    // Close local server
    if (this.localServer) {
      this.localServer.close()
      this.localServer = null
    }
  }
}
