import bcrypt from 'bcrypt'
import { Room, Client, ServerError } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Player, OfficeState, Computer, Whiteboard } from './schema/OfficeState'
import { Message } from '../../types/Messages'
import { IRoomData } from '../../types/Rooms'
import { whiteboardRoomIds } from './schema/OfficeState'
<<<<<<< Updated upstream
=======
import { MeetingRoom, MeetingRoomArea, MeetingRoomChatMessage } from './schema/MeetingRoomState'
>>>>>>> Stashed changes
import PlayerUpdateCommand from './commands/PlayerUpdateCommand'
import PlayerUpdateNameCommand from './commands/PlayerUpdateNameCommand'
import {
  ComputerAddUserCommand,
  ComputerRemoveUserCommand,
} from './commands/ComputerUpdateArrayCommand'
import {
  WhiteboardAddUserCommand,
  WhiteboardRemoveUserCommand,
} from './commands/WhiteboardUpdateArrayCommand'
import ChatMessageUpdateCommand from './commands/ChatMessageUpdateCommand'
import { v4 as uuidv4 } from 'uuid'

export class SkyOffice extends Room<OfficeState> {
  private dispatcher = new Dispatcher(this)
  private name: string
  private description: string
  private password: string | null = null

  async onCreate(options: IRoomData) {
    const { name, description, password, autoDispose } = options
    this.name = name
    this.description = description
    this.autoDispose = autoDispose

    let hasPassword = false
    if (password) {
      const salt = await bcrypt.genSalt(10)
      this.password = await bcrypt.hash(password, salt)
      hasPassword = true
    }
    this.setMetadata({ name, description, hasPassword })

    this.setState(new OfficeState())

<<<<<<< Updated upstream
    // HARD-CODED: Add 5 computers in a room
    for (let i = 0; i < 5; i++) {
      this.state.computers.set(String(i), new Computer())
=======
        // Debug: Check meetingRoomState initialization
        console.log('OfficeState set, checking meetingRoomState...')
        console.log('meetingRoomState initialized:', !!this.state.meetingRoomState)
        console.log('meetingRooms exists:', !!this.state.meetingRoomState?.meetingRooms)
        console.log('meetingRoomAreas exists:', !!this.state.meetingRoomState?.meetingRoomAreas)

        // HARD-CODED: Add 5 computers in a room
        for (let i = 0; i < 5; i++) {
            this.state.computers.set(String(i), new Computer())
        }

        // HARD-CODED: Add 3 whiteboards in a room
        for (let i = 0; i < 3; i++) {
            this.state.whiteboards.set(String(i), new Whiteboard())
        }

        // Initialize default meeting room
        this.initializeDefaultMeetingRoom()

        // when a player connect to a computer, add to the computer connectedUser array
        this.onMessage(Message.CONNECT_TO_COMPUTER, (client, message: { computerId: string }) => {
            this.dispatcher.dispatch(new ComputerAddUserCommand(), {
                client,
                computerId: message.computerId,
            })
        })

        // when a player disconnect from a computer, remove from the computer connectedUser array
        this.onMessage(Message.DISCONNECT_FROM_COMPUTER, (client, message: { computerId: string }) => {
            this.dispatcher.dispatch(new ComputerRemoveUserCommand(), {
                client,
                computerId: message.computerId,
            })
        })

        // when a player stop sharing screen
        this.onMessage(Message.STOP_SCREEN_SHARE, (client, message: { computerId: string }) => {
            const computer = this.state.computers.get(message.computerId)
            computer.connectedUser.forEach((id) => {
                this.clients.forEach((cli) => {
                    if (cli.sessionId === id && cli.sessionId !== client.sessionId) {
                        cli.send(Message.STOP_SCREEN_SHARE, client.sessionId)
                    }
                })
            })
        })

        // when a player connect to a whiteboard, add to the whiteboard connectedUser array
        this.onMessage(Message.CONNECT_TO_WHITEBOARD, (client, message: { whiteboardId: string }) => {
            this.dispatcher.dispatch(new WhiteboardAddUserCommand(), {
                client,
                whiteboardId: message.whiteboardId,
            })
        })

        // when a player disconnect from a whiteboard, remove from the whiteboard connectedUser array
        this.onMessage(
            Message.DISCONNECT_FROM_WHITEBOARD,
            (client, message: { whiteboardId: string }) => {
                this.dispatcher.dispatch(new WhiteboardRemoveUserCommand(), {
                    client,
                    whiteboardId: message.whiteboardId,
                })
            }
        )

        // when receiving updatePlayer message, call the PlayerUpdateCommand
        this.onMessage(
            Message.UPDATE_PLAYER,
            (client, message: { x: number; y: number; anim: string }) => {
                this.dispatcher.dispatch(new PlayerUpdateCommand(), {
                    client,
                    x: message.x,
                    y: message.y,
                    anim: message.anim,
                })
            }
        )

        // when receiving updatePlayerName message, call the PlayerUpdateNameCommand
        this.onMessage(Message.UPDATE_PLAYER_NAME, (client, message: { name: string }) => {
            this.dispatcher.dispatch(new PlayerUpdateNameCommand(), {
                client,
                name: message.name,
            })
        })

        // when a player is ready to connect, call the PlayerReadyToConnectCommand
        this.onMessage(Message.READY_TO_CONNECT, (client) => {
            const player = this.state.players.get(client.sessionId)
            if (player) player.readyToConnect = true
        })

        // when a player is ready to connect, call the PlayerReadyToConnectCommand
        this.onMessage(Message.VIDEO_CONNECTED, (client) => {
            const player = this.state.players.get(client.sessionId)
            if (player) player.videoConnected = true
        })

        // when a player disconnect a stream, broadcast the signal to the other player connected to the stream
        this.onMessage(Message.DISCONNECT_STREAM, (client, message: { clientId: string }) => {
            this.clients.forEach((cli) => {
                if (cli.sessionId === message.clientId) {
                    cli.send(Message.DISCONNECT_STREAM, client.sessionId)
                }
            })
        })

        // when a player send a chat message, update the message array and broadcast to all connected clients except the sender
        this.onMessage(Message.ADD_CHAT_MESSAGE, (client, message: { content: string }) => {
            // update the message array (so that players join later can also see the message)
            this.dispatcher.dispatch(new ChatMessageUpdateCommand(), {
                client,
                content: message.content,
            })

            // broadcast to all currently connected clients except the sender (to render in-game dialog on top of the character)
            this.broadcast(
                Message.ADD_CHAT_MESSAGE,
                { clientId: client.sessionId, content: message.content },
                { except: client }
            )
        })

        // Meeting Room Message Handlers
        this.onMessage(
            Message.CREATE_MEETING_ROOM,
            (
                client,
                message: {
                    id: string
                    name: string
                    mode: 'open' | 'private' | 'secret'
                    hostUserId: string
                    invitedUsers: string[]
                    area: { x: number; y: number; width: number; height: number }
                }
            ) => {
                console.log('SkyOffice: CREATE_MEETING_ROOM message received:', message)
                // Safety check
                if (!this.state.meetingRoomState) {
                    console.error('meetingRoomState is not initialized!')
                    return
                }

                if (!this.state.meetingRoomState.meetingRooms) {
                    console.error('meetingRooms is not initialized!')
                    return
                }

                if (!this.state.meetingRoomState.meetingRoomAreas) {
                    console.error('meetingRoomAreas is not initialized!')
                    return
                }
                console.log('Creating meeting room:', message)

                // Create a new meeting room
                const meetingRoom = new MeetingRoom()
                meetingRoom.id = message.id
                meetingRoom.name = message.name
                meetingRoom.mode = message.mode
                meetingRoom.hostUserId = message.hostUserId
                // Initialize participants and invited users
                message.invitedUsers.forEach((userId) => {
                    meetingRoom.invitedUsers.push(userId)
                })

                this.state.meetingRoomState.meetingRooms.set(message.id, meetingRoom)

                // Create a new meeting room area
                const area = new MeetingRoomArea()
                area.meetingRoomId = message.id
                area.x = message.area.x
                area.y = message.area.y
                area.width = message.area.width
                area.height = message.area.height

                this.state.meetingRoomState.meetingRoomAreas.set(message.id, area)

                console.log(`Meeting room created: ${message.name} (${message.id})`)
            }
        )

        this.onMessage(
            Message.UPDATE_MEETING_ROOM,
            (
                client,
                message: {
                    id: string
                    name: string
                    mode: 'open' | 'private' | 'secret'
                    hostUserId: string
                    invitedUsers: string[]
                    area?: { x: number; y: number; width: number; height: number }
                }
            ) => {
                console.log('=== UPDATE_MEETING_ROOM received ===')
                console.log('Client:', client.sessionId)
                console.log('Message:', message)

                // Safety check
                if (!this.state.meetingRoomState) {
                    console.error('meetingRoomState is not initialized!')
                    return
                }

                const oldMeetingRoom = this.state.meetingRoomState.meetingRooms.get(message.id)
                if (oldMeetingRoom) {
                    console.log('Before update:', {
                        name: oldMeetingRoom.name,
                        mode: oldMeetingRoom.mode,
                        hostUserId: oldMeetingRoom.hostUserId,
                        invitedUsersCount: oldMeetingRoom.invitedUsers.length,
                    })

                    // 新しいインスタンスを生成
                    const newMeetingRoom = new MeetingRoom()
                    newMeetingRoom.id = message.id
                    newMeetingRoom.name = message.name
                    newMeetingRoom.mode = message.mode
                    newMeetingRoom.hostUserId = message.hostUserId
                    message.invitedUsers.forEach((userId) => {
                        newMeetingRoom.invitedUsers.push(userId)
                    })
                    // 必要ならparticipantsもコピー
                    oldMeetingRoom.participants.forEach((id) => {
                        newMeetingRoom.participants.push(id)
                    })

                    // Remove and re-add the room to force Colyseus change detection
                    this.state.meetingRoomState.meetingRooms.delete(message.id)
                    this.state.meetingRoomState.meetingRooms.set(message.id, newMeetingRoom)

                    // Handle area updates similarly
                    if (message.area) {
                        console.log('Updating area for room:', message.id)
                        const oldArea = this.state.meetingRoomState.meetingRoomAreas.get(message.id)
                        // 新しいインスタンスを生成
                        const newArea = new MeetingRoomArea()
                        newArea.meetingRoomId = message.id
                        newArea.x = message.area.x
                        newArea.y = message.area.y
                        newArea.width = message.area.width
                        newArea.height = message.area.height
                        // 必要ならoldAreaの他のフィールドもコピー
                        // Remove and re-add the area
                        this.state.meetingRoomState.meetingRoomAreas.delete(message.id)
                        this.state.meetingRoomState.meetingRoomAreas.set(message.id, newArea)
                    }

                    console.log('After update:', {
                        name: newMeetingRoom.name,
                        mode: newMeetingRoom.mode,
                        hostUserId: newMeetingRoom.hostUserId,
                        invitedUsersCount: newMeetingRoom.invitedUsers.length,
                    })

                    console.log(`Meeting room updated successfully: ${message.name} (${message.id})`)
                } else {
                    console.error(`Meeting room not found for update: ${message.id}`)
                    console.log('Available rooms:')
                    this.state.meetingRoomState.meetingRooms.forEach((room, key) => {
                        console.log(`  - ${key}: ${room.name}`)
                    })
                }
            }
        )
        this.onMessage(Message.DELETE_MEETING_ROOM, (client, message: { id: string }) => {
            // Safety check
            if (!this.state.meetingRoomState) {
                console.error('meetingRoomState is not initialized!')
                return
            }

            // Delete the meeting room from the state
            if (this.state.meetingRoomState.meetingRooms.has(message.id)) {
                this.state.meetingRoomState.meetingRooms.delete(message.id)
                console.log(`Meeting room deleted: ${message.id}`)
            }

            // Delete the meeting room area from the state
            if (this.state.meetingRoomState.meetingRoomAreas.has(message.id)) {
                this.state.meetingRoomState.meetingRoomAreas.delete(message.id)
            }
        })

        // Meeting room chat message handler
        this.onMessage(
            Message.ADD_MEETING_ROOM_CHAT_MESSAGE,
            (
                client,
                message: {
                    meetingRoomId: string
                    content: string
                }
            ) => {
                console.log('=== ADD_MEETING_ROOM_CHAT_MESSAGE received ===')
                console.log('Client:', client.sessionId)
                console.log('Message:', message)

                // Safety check
                if (!this.state.meetingRoomState) {
                    console.error('meetingRoomState is not initialized!')
                    return
                }

                // Check if meeting room exists
                const meetingRoom = this.state.meetingRoomState.meetingRooms.get(message.meetingRoomId)
                if (!meetingRoom) {
                    console.error('Meeting room not found:', message.meetingRoomId)
                    return
                }

                // Check if user has permission to send messages
                const player = this.state.players.get(client.sessionId)
                if (!player) {
                    console.error('Player not found:', client.sessionId)
                    return
                }
                
                console.log('🔍 [Server] Player info for chat message:', {
                    sessionId: client.sessionId,
                    playerName: player.name,
                    hasName: !!player.name
                })

                // Check room access permission
                if (!this.canAccessMeetingRoom(client.sessionId, meetingRoom)) {
                    console.error('User does not have permission to send messages to this room')
                    return
                }

                // Create new chat message
                const chatMessage = new MeetingRoomChatMessage()
                chatMessage.messageId = uuidv4()
                chatMessage.author = player.name
                chatMessage.content = message.content
                chatMessage.meetingRoomId = message.meetingRoomId
                chatMessage.createdAt = Date.now()

                // Add to meeting room chat messages
                this.state.meetingRoomState.meetingRoomChatMessages.push(chatMessage)

                console.log(`📢 [Server] Meeting room chat message added and broadcasted:`, {
                    messageId: chatMessage.messageId,
                    author: chatMessage.author,
                    content: chatMessage.content,
                    meetingRoomId: chatMessage.meetingRoomId,
                    timestamp: new Date(chatMessage.createdAt).toLocaleTimeString(),
                    connectedClients: this.clients.length
                })

                // Send individual message to all clients for immediate update
                this.broadcast('new-meeting-room-chat-message', {
                    messageId: chatMessage.messageId,
                    author: chatMessage.author,
                    content: chatMessage.content,
                    meetingRoomId: chatMessage.meetingRoomId,
                    createdAt: chatMessage.createdAt
                })
            }
        )

        // Get meeting room chat history
        this.onMessage(
            Message.GET_MEETING_ROOM_CHAT_HISTORY,
            (
                client,
                message: {
                    meetingRoomId: string
                }
            ) => {
                console.log('=== GET_MEETING_ROOM_CHAT_HISTORY received ===')
                console.log('Client:', client.sessionId)
                console.log('Meeting Room ID:', message.meetingRoomId)

                // Safety check
                if (!this.state.meetingRoomState) {
                    console.error('meetingRoomState is not initialized!')
                    return
                }

                // Check if meeting room exists and user has access
                const meetingRoom = this.state.meetingRoomState.meetingRooms.get(message.meetingRoomId)
                if (!meetingRoom) {
                    console.error('Meeting room not found:', message.meetingRoomId)
                    return
                }

                // Check room access permission
                if (!this.canAccessMeetingRoom(client.sessionId, meetingRoom)) {
                    console.error('User does not have permission to view chat history for this room')
                    return
                }

                // Filter messages for this meeting room
                const roomMessages = this.state.meetingRoomState.meetingRoomChatMessages.filter(
                    msg => msg.meetingRoomId === message.meetingRoomId
                )

                // Send chat history to client
                client.send('meeting-room-chat-history', {
                    meetingRoomId: message.meetingRoomId,
                    messages: roomMessages.map(msg => ({
                        messageId: msg.messageId,
                        author: msg.author,
                        content: msg.content,
                        createdAt: msg.createdAt,
                        meetingRoomId: msg.meetingRoomId
                    }))
                })

                console.log(`Sent ${roomMessages.length} chat messages for room ${message.meetingRoomId}`)
            }
        )

        // 勤務ステータス関連のメッセージハンドラー
        this.onMessage(Message.START_WORK, (client) => {
            const player = this.state.players.get(client.sessionId)
            if (player) {
                const currentTime = Date.now()
                player.workStatus = 'working'
                player.workStartTime = currentTime
                player.lastBreakTime = currentTime
                player.fatigueLevel = 0
                player.appearance.clothing = 'business'
                player.appearance.accessory = 'none'
                
                console.log(`🏢 [Server] ${player.name || client.sessionId} started work`)
                
                // 他のクライアントに通知
                this.broadcast('work-status-changed', {
                    playerId: client.sessionId,
                    workStatus: player.workStatus,
                    playerName: player.name
                })
            }
        })

        this.onMessage(Message.END_WORK, (client) => {
            const player = this.state.players.get(client.sessionId)
            if (player) {
                player.workStatus = 'off-duty'
                player.workStartTime = 0
                player.fatigueLevel = 0
                player.appearance.clothing = 'casual'
                player.appearance.accessory = 'none'
                
                console.log(`🏠 [Server] ${player.name || client.sessionId} ended work`)
                
                this.broadcast('work-status-changed', {
                    playerId: client.sessionId,
                    workStatus: player.workStatus,
                    playerName: player.name
                })
            }
        })

        this.onMessage(Message.START_BREAK, (client) => {
            const player = this.state.players.get(client.sessionId)
            if (player) {
                player.workStatus = 'break'
                player.lastBreakTime = Date.now()
                player.appearance.clothing = 'casual'
                player.appearance.accessory = 'coffee'
                
                console.log(`☕ [Server] ${player.name || client.sessionId} started break`)
                
                this.broadcast('work-status-changed', {
                    playerId: client.sessionId,
                    workStatus: player.workStatus,
                    playerName: player.name
                })
            }
        })

        this.onMessage(Message.END_BREAK, (client) => {
            const player = this.state.players.get(client.sessionId)
            if (player) {
                player.workStatus = 'working'
                player.appearance.clothing = 'business'
                player.appearance.accessory = 'documents'
                
                console.log(`💼 [Server] ${player.name || client.sessionId} ended break`)
                
                this.broadcast('work-status-changed', {
                    playerId: client.sessionId,
                    workStatus: player.workStatus,
                    playerName: player.name
                })
            }
        })

        this.onMessage(Message.UPDATE_WORK_STATUS, (client, message: { 
            workStatus: string,
            clothing?: string,
            accessory?: string 
        }) => {
            const player = this.state.players.get(client.sessionId)
            if (player) {
                player.workStatus = message.workStatus as any
                if (message.clothing) {
                    player.appearance.clothing = message.clothing as any
                }
                if (message.accessory) {
                    player.appearance.accessory = message.accessory as any
                }
                
                console.log(`🔄 [Server] ${player.name || client.sessionId} updated work status to ${message.workStatus}`)
                
                this.broadcast('work-status-changed', {
                    playerId: client.sessionId,
                    workStatus: player.workStatus,
                    playerName: player.name
                })
            }
        })
    }

    // Helper method to check meeting room access permission
    private canAccessMeetingRoom(userId: string, meetingRoom: MeetingRoom): boolean {
        if (meetingRoom.mode === 'open') {
            return true
        } else if (meetingRoom.mode === 'private') {
            return meetingRoom.hostUserId === userId || meetingRoom.invitedUsers.includes(userId)
        } else if (meetingRoom.mode === 'secret') {
            return meetingRoom.hostUserId === userId
        }
        return false
>>>>>>> Stashed changes
    }

    // HARD-CODED: Add 3 whiteboards in a room
    for (let i = 0; i < 3; i++) {
      this.state.whiteboards.set(String(i), new Whiteboard())
    }

    // when a player connect to a computer, add to the computer connectedUser array
    this.onMessage(Message.CONNECT_TO_COMPUTER, (client, message: { computerId: string }) => {
      this.dispatcher.dispatch(new ComputerAddUserCommand(), {
        client,
        computerId: message.computerId,
      })
    })

    // when a player disconnect from a computer, remove from the computer connectedUser array
    this.onMessage(Message.DISCONNECT_FROM_COMPUTER, (client, message: { computerId: string }) => {
      this.dispatcher.dispatch(new ComputerRemoveUserCommand(), {
        client,
        computerId: message.computerId,
      })
    })

    // when a player stop sharing screen
    this.onMessage(Message.STOP_SCREEN_SHARE, (client, message: { computerId: string }) => {
      const computer = this.state.computers.get(message.computerId)
      computer.connectedUser.forEach((id) => {
        this.clients.forEach((cli) => {
          if (cli.sessionId === id && cli.sessionId !== client.sessionId) {
            cli.send(Message.STOP_SCREEN_SHARE, client.sessionId)
          }
        })
      })
    })

    // when a player connect to a whiteboard, add to the whiteboard connectedUser array
    this.onMessage(Message.CONNECT_TO_WHITEBOARD, (client, message: { whiteboardId: string }) => {
      this.dispatcher.dispatch(new WhiteboardAddUserCommand(), {
        client,
        whiteboardId: message.whiteboardId,
      })
    })

    // when a player disconnect from a whiteboard, remove from the whiteboard connectedUser array
    this.onMessage(
      Message.DISCONNECT_FROM_WHITEBOARD,
      (client, message: { whiteboardId: string }) => {
        this.dispatcher.dispatch(new WhiteboardRemoveUserCommand(), {
          client,
          whiteboardId: message.whiteboardId,
        })
      }
    )

    // when receiving updatePlayer message, call the PlayerUpdateCommand
    this.onMessage(
      Message.UPDATE_PLAYER,
      (client, message: { x: number; y: number; anim: string }) => {
        this.dispatcher.dispatch(new PlayerUpdateCommand(), {
          client,
          x: message.x,
          y: message.y,
          anim: message.anim,
        })
      }
    )

    // when receiving updatePlayerName message, call the PlayerUpdateNameCommand
    this.onMessage(Message.UPDATE_PLAYER_NAME, (client, message: { name: string }) => {
      this.dispatcher.dispatch(new PlayerUpdateNameCommand(), {
        client,
        name: message.name,
      })
    })

    // when a player is ready to connect, call the PlayerReadyToConnectCommand
    this.onMessage(Message.READY_TO_CONNECT, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.readyToConnect = true
    })

    // when a player is ready to connect, call the PlayerReadyToConnectCommand
    this.onMessage(Message.VIDEO_CONNECTED, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.videoConnected = true
    })

    // when a player disconnect a stream, broadcast the signal to the other player connected to the stream
    this.onMessage(Message.DISCONNECT_STREAM, (client, message: { clientId: string }) => {
      this.clients.forEach((cli) => {
        if (cli.sessionId === message.clientId) {
          cli.send(Message.DISCONNECT_STREAM, client.sessionId)
        }
      })
    })

    // when a player send a chat message, update the message array and broadcast to all connected clients except the sender
    this.onMessage(Message.ADD_CHAT_MESSAGE, (client, message: { content: string }) => {
      // update the message array (so that players join later can also see the message)
      this.dispatcher.dispatch(new ChatMessageUpdateCommand(), {
        client,
        content: message.content,
      })

      // broadcast to all currently connected clients except the sender (to render in-game dialog on top of the character)
      this.broadcast(
        Message.ADD_CHAT_MESSAGE,
        { clientId: client.sessionId, content: message.content },
        { except: client }
      )
    })
  }

  async onAuth(client: Client, options: { password: string | null }) {
    if (this.password) {
      const validPassword = await bcrypt.compare(options.password, this.password)
      if (!validPassword) {
        throw new ServerError(403, 'Password is incorrect!')
      }
    }
    return true
  }

  onJoin(client: Client, options: any) {
    this.state.players.set(client.sessionId, new Player())
    client.send(Message.SEND_ROOM_DATA, {
      id: this.roomId,
      name: this.name,
      description: this.description,
    })
  }

  onLeave(client: Client, consented: boolean) {
    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId)
    }
    this.state.computers.forEach((computer) => {
      if (computer.connectedUser.has(client.sessionId)) {
        computer.connectedUser.delete(client.sessionId)
      }
    })
    this.state.whiteboards.forEach((whiteboard) => {
      if (whiteboard.connectedUser.has(client.sessionId)) {
        whiteboard.connectedUser.delete(client.sessionId)
      }
    })
  }

  onDispose() {
    this.state.whiteboards.forEach((whiteboard) => {
      if (whiteboardRoomIds.has(whiteboard.roomId)) whiteboardRoomIds.delete(whiteboard.roomId)
    })

    console.log('room', this.roomId, 'disposing...')
    this.dispatcher.stop()
  }
}
