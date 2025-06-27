import { Client, Room } from 'colyseus.js'
import { IComputer, IOfficeState, IPlayer, IWhiteboard } from '../../../types/IOfficeState'
import { Message } from '../../../types/Messages'
import { IRoomData, RoomType } from '../../../types/Rooms'
import { ItemType } from '../../../types/Items'
import WebRTC from '../web/WebRTC'
import { phaserEvents, Event } from '../events/EventCenter'
import store from '../stores'
import { setSessionId, setPlayerNameMap, removePlayerNameMap } from '../stores/UserStore'
import {
  setLobbyJoined,
  setJoinedRoomData,
  setAvailableRooms,
  addAvailableRooms,
  removeAvailableRooms,
} from '../stores/RoomStore'
import {
<<<<<<< Updated upstream
  pushChatMessage,
  pushPlayerJoinedMessage,
  pushPlayerLeftMessage,
} from '../stores/ChatStore'
import { setWhiteboardUrls } from '../stores/WhiteboardStore'

export default class Network {
  private client: Client
  private room?: Room<IOfficeState>
  private lobby!: Room
  webRTC?: WebRTC
=======
    pushChatMessage,
    pushPlayerJoinedMessage,
    pushPlayerLeftMessage,
    pushMeetingRoomChatMessage,
    setMeetingRoomChatHistory,
} from '../stores/ChatStore'
import { setWhiteboardUrls } from '../stores/WhiteboardStore'

import {
    addMeetingRoomFromServer,
    removeMeetingRoomFromServer,
    addMeetingRoomAreaFromServer,
    removeMeetingRoomAreaFromServer,
} from '../stores/MeetingRoomStore'
import { updateOtherPlayerWorkStatus } from '../stores/WorkStore'
import { IMeetingRoomChatMessage } from '../../../types/IOfficeState'

export default class Network {
    private client: Client
    private room?: Room<IOfficeState>
    private lobby!: Room
    private chatListenerAttached = false
    webRTC?: WebRTC
>>>>>>> Stashed changes

  mySessionId!: string

  constructor() {
    const protocol = window.location.protocol.replace('http', 'ws')
    const endpoint =
      process.env.NODE_ENV === 'production'
        ? import.meta.env.VITE_SERVER_URL
        : `${protocol}//${window.location.hostname}:2567`
    this.client = new Client(endpoint)
    this.joinLobbyRoom().then(() => {
      store.dispatch(setLobbyJoined(true))
    })

    phaserEvents.on(Event.MY_PLAYER_NAME_CHANGE, this.updatePlayerName, this)
    phaserEvents.on(Event.MY_PLAYER_TEXTURE_CHANGE, this.updatePlayer, this)
    phaserEvents.on(Event.PLAYER_DISCONNECTED, this.playerStreamDisconnect, this)
  }

  /**
   * method to join Colyseus' built-in LobbyRoom, which automatically notifies
   * connected clients whenever rooms with "realtime listing" have updates
   */
  async joinLobbyRoom() {
    this.lobby = await this.client.joinOrCreate(RoomType.LOBBY)

    this.lobby.onMessage('rooms', (rooms) => {
      store.dispatch(setAvailableRooms(rooms))
    })

    this.lobby.onMessage('+', ([roomId, room]) => {
      store.dispatch(addAvailableRooms({ roomId, room }))
    })

    this.lobby.onMessage('-', (roomId) => {
      store.dispatch(removeAvailableRooms(roomId))
    })
  }

  // method to join the public lobby
  async joinOrCreatePublic() {
    this.room = await this.client.joinOrCreate(RoomType.PUBLIC)
    this.initialize()
  }

  // method to join a custom room
  async joinCustomById(roomId: string, password: string | null) {
    this.room = await this.client.joinById(roomId, { password })
    this.initialize()
  }

  // method to create a custom room
  async createCustom(roomData: IRoomData) {
    const { name, description, password, autoDispose } = roomData
    this.room = await this.client.create(RoomType.CUSTOM, {
      name,
      description,
      password,
      autoDispose,
    })
    this.initialize()
  }

  // set up all network listeners before the game starts
  initialize() {
    if (!this.room) return

    this.lobby.leave()
    this.mySessionId = this.room.sessionId
    store.dispatch(setSessionId(this.room.sessionId))
    this.webRTC = new WebRTC(this.mySessionId, this)

    // new instance added to the players MapSchema
    this.room.state.players.onAdd = (player: IPlayer, key: string) => {
      if (key === this.mySessionId) return

      // track changes on every child object inside the players MapSchema
      player.onChange = (changes) => {
        changes.forEach((change) => {
          const { field, value } = change
          phaserEvents.emit(Event.PLAYER_UPDATED, field, value, key)

          // when a new player finished setting up player name
          if (field === 'name' && value !== '') {
            phaserEvents.emit(Event.PLAYER_JOINED, player, key)
            store.dispatch(setPlayerNameMap({ id: key, name: value }))
            store.dispatch(pushPlayerJoinedMessage(value))
          }
        })
<<<<<<< Updated upstream
      }
=======

        phaserEvents.on(Event.MY_PLAYER_NAME_CHANGE, this.updatePlayerName, this)
        phaserEvents.on(Event.MY_PLAYER_TEXTURE_CHANGE, this.updatePlayer, this)
        phaserEvents.on(Event.PLAYER_DISCONNECTED, this.playerStreamDisconnect, this)
        
        // Make globally accessible for DevMode
        if (typeof window !== 'undefined') {
            (window as any).network = this
        }
>>>>>>> Stashed changes
    }

    // an instance removed from the players MapSchema
    this.room.state.players.onRemove = (player: IPlayer, key: string) => {
      phaserEvents.emit(Event.PLAYER_LEFT, key)
      this.webRTC?.deleteVideoStream(key)
      this.webRTC?.deleteOnCalledVideoStream(key)
      store.dispatch(pushPlayerLeftMessage(player.name))
      store.dispatch(removePlayerNameMap(key))
    }

    // new instance added to the computers MapSchema
    this.room.state.computers.onAdd = (computer: IComputer, key: string) => {
      // track changes on every child object's connectedUser
      computer.connectedUser.onAdd = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.COMPUTER)
      }
      computer.connectedUser.onRemove = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.COMPUTER)
      }
    }

    // new instance added to the whiteboards MapSchema
    this.room.state.whiteboards.onAdd = (whiteboard: IWhiteboard, key: string) => {
      store.dispatch(
        setWhiteboardUrls({
          whiteboardId: key,
          roomId: whiteboard.roomId,
        })
      )
      // track changes on every child object's connectedUser
      whiteboard.connectedUser.onAdd = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.WHITEBOARD)
      }
      whiteboard.connectedUser.onRemove = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.WHITEBOARD)
      }
    }

    // new instance added to the chatMessages ArraySchema
    this.room.state.chatMessages.onAdd = (item, index) => {
      store.dispatch(pushChatMessage(item))
    }

<<<<<<< Updated upstream
    // when the server sends room data
    this.room.onMessage(Message.SEND_ROOM_DATA, (content) => {
      store.dispatch(setJoinedRoomData(content))
    })

    // when a user sends a message
    this.room.onMessage(Message.ADD_CHAT_MESSAGE, ({ clientId, content }) => {
      phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, clientId, content)
    })

    // when a peer disconnects with myPeer
    this.room.onMessage(Message.DISCONNECT_STREAM, (clientId: string) => {
      this.webRTC?.deleteOnCalledVideoStream(clientId)
    })

    // when a computer user stops sharing screen
    this.room.onMessage(Message.STOP_SCREEN_SHARE, (clientId: string) => {
      const computerState = store.getState().computer
      computerState.shareScreenManager?.onUserLeft(clientId)
    })
  }

  // method to register event listener and call back function when a item user added
  onChatMessageAdded(callback: (playerId: string, content: string) => void, context?: any) {
    phaserEvents.on(Event.UPDATE_DIALOG_BUBBLE, callback, context)
  }

  // method to register event listener and call back function when a item user added
  onItemUserAdded(
    callback: (playerId: string, key: string, itemType: ItemType) => void,
    context?: any
  ) {
    phaserEvents.on(Event.ITEM_USER_ADDED, callback, context)
  }

  // method to register event listener and call back function when a item user removed
  onItemUserRemoved(
    callback: (playerId: string, key: string, itemType: ItemType) => void,
    context?: any
  ) {
    phaserEvents.on(Event.ITEM_USER_REMOVED, callback, context)
  }

  // method to register event listener and call back function when a player joined
  onPlayerJoined(callback: (Player: IPlayer, key: string) => void, context?: any) {
    phaserEvents.on(Event.PLAYER_JOINED, callback, context)
  }

  // method to register event listener and call back function when a player left
  onPlayerLeft(callback: (key: string) => void, context?: any) {
    phaserEvents.on(Event.PLAYER_LEFT, callback, context)
  }

  // method to register event listener and call back function when myPlayer is ready to connect
  onMyPlayerReady(callback: (key: string) => void, context?: any) {
    phaserEvents.on(Event.MY_PLAYER_READY, callback, context)
  }

  // method to register event listener and call back function when my video is connected
  onMyPlayerVideoConnected(callback: (key: string) => void, context?: any) {
    phaserEvents.on(Event.MY_PLAYER_VIDEO_CONNECTED, callback, context)
  }

  // method to register event listener and call back function when a player updated
  onPlayerUpdated(
    callback: (field: string, value: number | string, key: string) => void,
    context?: any
  ) {
    phaserEvents.on(Event.PLAYER_UPDATED, callback, context)
  }

  // method to send player updates to Colyseus server
  updatePlayer(currentX: number, currentY: number, currentAnim: string) {
    this.room?.send(Message.UPDATE_PLAYER, { x: currentX, y: currentY, anim: currentAnim })
  }

  // method to send player name to Colyseus server
  updatePlayerName(currentName: string) {
    this.room?.send(Message.UPDATE_PLAYER_NAME, { name: currentName })
  }

  // method to send ready-to-connect signal to Colyseus server
  readyToConnect() {
    this.room?.send(Message.READY_TO_CONNECT)
    phaserEvents.emit(Event.MY_PLAYER_READY)
  }

  // method to send ready-to-connect signal to Colyseus server
  videoConnected() {
    this.room?.send(Message.VIDEO_CONNECTED)
    phaserEvents.emit(Event.MY_PLAYER_VIDEO_CONNECTED)
  }

  // method to send stream-disconnection signal to Colyseus server
  playerStreamDisconnect(id: string) {
    this.room?.send(Message.DISCONNECT_STREAM, { clientId: id })
    this.webRTC?.deleteVideoStream(id)
  }

  connectToComputer(id: string) {
    this.room?.send(Message.CONNECT_TO_COMPUTER, { computerId: id })
  }

  disconnectFromComputer(id: string) {
    this.room?.send(Message.DISCONNECT_FROM_COMPUTER, { computerId: id })
  }

  connectToWhiteboard(id: string) {
    this.room?.send(Message.CONNECT_TO_WHITEBOARD, { whiteboardId: id })
  }

  disconnectFromWhiteboard(id: string) {
    this.room?.send(Message.DISCONNECT_FROM_WHITEBOARD, { whiteboardId: id })
  }

  onStopScreenShare(id: string) {
    this.room?.send(Message.STOP_SCREEN_SHARE, { computerId: id })
  }

  addChatMessage(content: string) {
    this.room?.send(Message.ADD_CHAT_MESSAGE, { content: content })
  }
=======
    // Method to join a custom room
    async joinCustomById(roomId: string, password: string | null) {
        this.room = await this.client.joinById(roomId, { password })
        this.initialize()
    }

    // Method to create a custom room
    async createCustom(roomData: IRoomData) {
        const { name, description, password, autoDispose } = roomData
        this.room = await this.client.create(RoomType.CUSTOM, {
            name,
            description,
            password,
            autoDispose,
        })
        this.initialize()
    }

    // Set up all network listeners before the game starts
    initialize() {
        if (!this.room) return

        this.lobby.leave()
        this.mySessionId = this.room.sessionId
        store.dispatch(setSessionId(this.room.sessionId))
        this.webRTC = new WebRTC(this.mySessionId, this)

        // New instance added to the players MapSchema
        this.room.state.players.onAdd = (player: IPlayer, key: string) => {
            if (key === this.mySessionId) return

            // Sync existing player work status (if name is already set)
            if (player.name) {
                const workStatus = (player as any).workStatus || 'off-duty'
                console.log('👥 [Network] Adding existing player work status (onAdd):', {
                    playerId: key,
                    playerName: player.name,
                    workStatus: workStatus
                })
                store.dispatch(updateOtherPlayerWorkStatus({
                    playerId: key,
                    playerName: player.name,
                    workStatus: workStatus
                }))
            }

            // Track changes on every child object inside the players MapSchema
            player.onChange = (changes) => {
                changes.forEach((change) => {
                    const { field, value } = change
                    phaserEvents.emit(Event.PLAYER_UPDATED, field, value, key)

                    // When a new player finished setting up player name
                    if (field === 'name' && value !== '') {
                        phaserEvents.emit(Event.PLAYER_JOINED, player, key)
                        store.dispatch(setPlayerNameMap({ id: key, name: value }))
                        store.dispatch(pushPlayerJoinedMessage(value))
                        
                        // Add initial work status for other players to store
                        const currentState = store.getState()
                        if (key !== currentState.user.sessionId) {
                            const workStatus = (player as any).workStatus || 'off-duty'
                            console.log('👥 [Network] Adding new player work status:', {
                                playerId: key,
                                playerName: value,
                                workStatus: workStatus
                            })
                            store.dispatch(updateOtherPlayerWorkStatus({
                                playerId: key,
                                playerName: value,
                                workStatus: workStatus
                            }))
                        }
                    }
                })
            }
        }

        // An instance removed from the players MapSchema
        this.room.state.players.onRemove = (player: IPlayer, key: string) => {
            phaserEvents.emit(Event.PLAYER_LEFT, key)
            this.webRTC?.deleteVideoStream(key)
            this.webRTC?.deleteOnCalledVideoStream(key)
            store.dispatch(pushPlayerLeftMessage(player.name))
            store.dispatch(removePlayerNameMap(key))
        }

        // New instance added to the computers MapSchema
        this.room.state.computers.onAdd = (computer: IComputer, key: string) => {
            // Track changes on every child object's connectedUser (with safety check)
            if (computer.connectedUser) {
                computer.connectedUser.onAdd = (item, index) => {
                    phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.COMPUTER)
                }
                computer.connectedUser.onRemove = (item, index) => {
                    phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.COMPUTER)
                }
            }
        }

        // New instance added to the whiteboards MapSchema
        this.room.state.whiteboards.onAdd = (whiteboard: IWhiteboard, key: string) => {
            store.dispatch(
                setWhiteboardUrls({
                    whiteboardId: key,
                    roomId: whiteboard.roomId,
                })
            )
            // Track changes on every child object's connectedUser (with safety check)
            if (whiteboard.connectedUser) {
                whiteboard.connectedUser.onAdd = (item, index) => {
                    phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.WHITEBOARD)
                }
                whiteboard.connectedUser.onRemove = (item, index) => {
                    phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.WHITEBOARD)
                }
            }
        }

        // New instance added to the chatMessages ArraySchema
        this.room.state.chatMessages.onAdd = (item, index) => {
            store.dispatch(pushChatMessage(item))
        }

        // When the server sends room data
        this.room.onMessage(Message.SEND_ROOM_DATA, (content) => {
            store.dispatch(setJoinedRoomData(content))
        })

        // When a user sends a message
        this.room.onMessage(Message.ADD_CHAT_MESSAGE, ({ clientId, content }) => {
            phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, clientId, content)
        })

        // When a peer disconnects with myPeer
        this.room.onMessage(Message.DISCONNECT_STREAM, (clientId: string) => {
            this.webRTC?.deleteOnCalledVideoStream(clientId)
        })

        // When a computer user stops sharing screen
        this.room.onMessage(Message.STOP_SCREEN_SHARE, (clientId: string) => {
            const computerState = store.getState().computer
            computerState.shareScreenManager?.onUserLeft(clientId)
        })

        // Meeting room chat message listeners
        this.room.onMessage('meeting-room-chat-history', (data: {
            meetingRoomId: string
            messages: IMeetingRoomChatMessage[]
        }) => {
            console.log('📚 [Network] Received chat history via onMessage:', {
                meetingRoomId: data.meetingRoomId,
                messageCount: data.messages.length
            })
            store.dispatch(setMeetingRoomChatHistory({
                meetingRoomId: data.meetingRoomId,
                messages: data.messages
            }))
        })

        this.room.onMessage('new-meeting-room-chat-message', (data: IMeetingRoomChatMessage) => {
            console.log('🆕 [Network] Received new meeting room message via onMessage:', {
                messageId: data.messageId,
                author: data.author,
                content: data.content,
                meetingRoomId: data.meetingRoomId,
                timestamp: new Date(data.createdAt).toLocaleTimeString()
            })
            store.dispatch(pushMeetingRoomChatMessage({
                meetingRoomId: data.meetingRoomId,
                message: data
            }))
        })

        // Monitor all messages (detailed log only in DevMode)
        this.room.onMessage('*', (type, data) => {
            if (store.getState().devMode?.isDevMode) {
                console.log('📨 [Network] Received message:', type, data)
            }
            
            // Special log for work status related messages
            if (typeof type === 'string' && (type.includes('work') || type.includes('status'))) {
                console.log('💼 [Network] Work-related message:', { type, data, timestamp: new Date().toISOString() })
            }
        })

        // Receive initial state when player joins
        this.room.onMessage('player-joined', (data: {
            playerId: string,
            playerName: string,
            workStatus?: string
        }) => {
            console.log('👋 [Network] Player joined:', data)
            
            // Add initial work status for other players to store
            if (data.playerId && data.playerName) {
                store.dispatch(updateOtherPlayerWorkStatus({
                    playerId: data.playerId,
                    playerName: data.playerName,
                    workStatus: (data.workStatus || 'off-duty') as any
                }))
            }
        })

        // Receive work status change notifications
        this.room.onMessage('work-status-changed', (data: {
            playerId: string,
            workStatus: string,
            playerName: string
        }) => {
            console.log('💼 [Network] Work status changed (received):', {
                playerId: data.playerId,
                workStatus: data.workStatus,
                playerName: data.playerName,
                timestamp: new Date().toISOString(),
                isDevMode: store.getState().devMode?.isDevMode
            })
            
            // Notify WorkStore of status change
            store.dispatch(updateOtherPlayerWorkStatus({
                playerId: data.playerId,
                playerName: data.playerName,
                workStatus: data.workStatus as any
            }))
            
            // Also emit Phaser event (for avatar appearance change)
            phaserEvents.emit('WORK_STATUS_CHANGED', data)
            
            // Detailed log in DevMode
            if (store.getState().devMode?.isDevMode) {
                console.log('🐛 [Network] Updated other players work status. Current state:', {
                    totalOtherPlayers: Object.keys(store.getState().work.otherPlayersWorkStatus).length,
                    allPlayers: store.getState().work.otherPlayersWorkStatus
                })
            }
        })

        this.room.onMessage('MEETING_ROOM_MANUAL_UPDATE', (data: any) => {
            // Log state before update
            const currentState = store.getState().meetingRoom
            // Update meeting room
            if (data.room) {
                store.dispatch(addMeetingRoomFromServer(data.room))
            }

            // Update meeting room area
            if (data.area) {
                store.dispatch(addMeetingRoomAreaFromServer(data.area))
            }

            // Log state after update
            setTimeout(() => {
                const updatedState = store.getState().meetingRoom
            }, 100)
        })

        // Set up meeting room chat message listeners first (before state listeners)
        this.setupMeetingRoomChatListeners()
        
        // Set up meeting room listeners with safety checks
        this.setupMeetingRoomListeners()
        
        // Also setup chat listeners when state changes
        this.room.onStateChange(() => {
            if (!this.chatListenerAttached && this.room?.state?.meetingRoomState?.meetingRoomChatMessages) {
                console.log('🔄 [Network] State changed, setting up chat listeners')
                this.setupMeetingRoomChatMessageListener()
            }
        })
    }

    // Safely set up meeting room listeners
    private setupMeetingRoomListeners() {
        // Check if meeting room state is immediately available
        if (
            this.room?.state?.meetingRoomState?.meetingRooms &&
            this.room?.state?.meetingRoomState?.meetingRoomAreas
        ) {
            this.attachMeetingRoomListeners()
            return
        }

        // Wait for meeting room state to be ready
        this.room?.onStateChange((state) => {
            if (state.meetingRoomState?.meetingRooms && state.meetingRoomState?.meetingRoomAreas) {
                this.attachMeetingRoomListeners()
            }
        })
    }

    // 修正されたattachMeetingRoomListenersメソッド
    private attachMeetingRoomListeners() {
        if (!this.room?.state?.meetingRoomState) {
            console.error('Cannot attach meeting room listeners: meetingRoomState not available')
            return
        }

        const meetingRooms = this.room.state.meetingRoomState.meetingRooms
        const meetingRoomAreas = this.room.state.meetingRoomState.meetingRoomAreas

        // 既存の meeting rooms を処理
        if (meetingRooms) {
            meetingRooms.forEach((room, key) => {
                if (
                    typeof key === 'string' &&
                    !key.startsWith('$') &&
                    key !== 'onAdd' &&
                    key !== 'onRemove'
                ) {
                    if (
                        room &&
                        typeof room === 'object' &&
                        !Array.isArray(room) &&
                        typeof room !== 'function'
                    ) {
                        this.handleMeetingRoomAdded(room, key)
                    }
                }
            })

            // 新しい meeting room の追加を監視
            meetingRooms.onAdd = (meetingRoom: any, key: string) => {
                this.handleMeetingRoomAdded(meetingRoom, key)
            }

            meetingRooms.onRemove = (meetingRoom: any, key: string) => {
                store.dispatch(removeMeetingRoomFromServer(key))
            }
        }

        // 既存の meeting room areas を処理
        if (meetingRoomAreas) {
            meetingRoomAreas.forEach((area, key) => {
                if (
                    typeof key === 'string' &&
                    !key.startsWith('$') &&
                    key !== 'onAdd' &&
                    key !== 'onRemove'
                ) {
                    if (
                        area &&
                        typeof area === 'object' &&
                        !Array.isArray(area) &&
                        typeof area !== 'function'
                    ) {
                        this.handleMeetingRoomAreaAdded(area, key)
                    }
                }
            })

            // 新しい meeting room area の追加を監視
            meetingRoomAreas.onAdd = (area: any, key: string) => {
                this.handleMeetingRoomAreaAdded(area, key)
            }

            meetingRoomAreas.onRemove = (area: any, key: string) => {
                store.dispatch(removeMeetingRoomAreaFromServer(key))
            }
        }
    }

    private handleMeetingRoomAdded(meetingRoom: any, key: string) {
        if (!meetingRoom || typeof meetingRoom !== 'object') {
            console.error('Invalid meeting room object:', meetingRoom)
            return
        }

        const roomData = {
            id: key,
            name: meetingRoom.name || '',
            mode: meetingRoom.mode || 'open',
            hostUserId: meetingRoom.hostUserId || '',
            invitedUsers: meetingRoom.invitedUsers
                ? (Array.from(meetingRoom.invitedUsers) as string[])
                : [],
            participants: meetingRoom.participants
                ? (Array.from(meetingRoom.participants) as string[])
                : [],
        }

        try {
            store.dispatch(addMeetingRoomFromServer(roomData))

            if (typeof meetingRoom.onChange === 'function' && !meetingRoom._changeListenerAttached) {
                meetingRoom.onChange = (changes: any[]) => {
                    changes.forEach((change) => { })

                    const updatedRoomData = {
                        id: key,
                        name: meetingRoom.name || '',
                        mode: meetingRoom.mode || 'open',
                        hostUserId: meetingRoom.hostUserId || '',
                        invitedUsers: meetingRoom.invitedUsers
                            ? (Array.from(meetingRoom.invitedUsers) as string[])
                            : [],
                        participants: meetingRoom.participants
                            ? (Array.from(meetingRoom.participants) as string[])
                            : [],
                    }

                    store.dispatch(addMeetingRoomFromServer(updatedRoomData))
                }

                meetingRoom._changeListenerAttached = true
            } else if (meetingRoom._changeListenerAttached) {
            }
        } catch (e) {
            console.error('Failed to dispatch addMeetingRoomFromServer:', e)
        }
    }

    private handleMeetingRoomAreaAdded(area: any, key: string) {
        if (!area || typeof area !== 'object') {
            console.error('Invalid area object:', area)
            return
        }

        const areaData = {
            meetingRoomId: area.meetingRoomId || key,
            x: area.x || 0,
            y: area.y || 0,
            width: area.width || 100,
            height: area.height || 100,
        }


        try {
            store.dispatch(addMeetingRoomAreaFromServer(areaData))

            if (typeof area.onChange === 'function' && !area._changeListenerAttached) {

                area.onChange = (changes: any[]) => {

                    // 変更された値を詳細にログ出力
                    changes.forEach((change) => {
                    })

                    const updatedAreaData = {
                        meetingRoomId: area.meetingRoomId || key,
                        x: area.x || 0,
                        y: area.y || 0,
                        width: area.width || 100,
                        height: area.height || 100,
                    }

                    store.dispatch(addMeetingRoomAreaFromServer(updatedAreaData))
                }

                area._changeListenerAttached = true
            } else if (area._changeListenerAttached) {
            }
        } catch (e) {
            console.error('Failed to dispatch addMeetingRoomAreaFromServer:', e)
        }
    }

    // 定期的な状態同期チェック（オプション）
    private setupPeriodicSync() {
        setInterval(() => {
            if (this.room?.state?.meetingRoomState) {
                const serverRooms = this.room.state.meetingRoomState.meetingRooms
                const serverAreas = this.room.state.meetingRoomState.meetingRoomAreas
                const clientState = store.getState().meetingRoom
                if (serverRooms && serverAreas) {
                    serverRooms.forEach((room, key) => {
                        if (!clientState.meetingRooms[key]) {
                            this.handleMeetingRoomAdded(room, key)
                        }
                    })

                    serverAreas.forEach((area, key) => {
                        if (!clientState.meetingRoomAreas[key]) {
                            this.handleMeetingRoomAreaAdded(area, key)
                        }
                    })
                }
            }
        }, 5000) // 5秒ごとにチェック
    }

    // Method to update meeting room mode
    updateMeetingRoomMode(roomId: string, newMode: 'open' | 'private' | 'secret') {

        const currentState = store.getState().meetingRoom
        const currentRoom = currentState.meetingRooms[roomId]

        if (!currentRoom) {
            console.error(`Cannot update room mode ${roomId}: not found`)
            return
        }

        const updatedRoomData = {
            id: roomId,
            name: currentRoom.name,
            mode: newMode,
            hostUserId: currentRoom.hostUserId,
            invitedUsers: currentRoom.invitedUsers,
        }

        this.room?.send(Message.UPDATE_MEETING_ROOM, updatedRoomData)
    }

    // Method to update meeting room area
    updateMeetingRoomArea(
        roomId: string,
        areaUpdates: {
            x?: number
            y?: number
            width?: number
            height?: number
        }
    ) {

        const currentState = store.getState().meetingRoom
        const currentRoom = currentState.meetingRooms[roomId]
        const currentArea = currentState.meetingRoomAreas.find(area => area.meetingRoomId === roomId)

        if (!currentRoom || !currentArea) {
            console.error(`Cannot update room area ${roomId}: not found`, {
                roomExists: !!currentRoom,
                areaExists: !!currentArea,
                availableRooms: Object.keys(currentState.meetingRooms),
                availableAreas: currentState.meetingRoomAreas.map(a => a.meetingRoomId)
            })
            return
        }

        const updatedRoomData = {
            id: roomId,
            name: currentRoom.name,
            mode: currentRoom.mode,
            hostUserId: currentRoom.hostUserId,
            invitedUsers: currentRoom.invitedUsers,
            area: {
                x: areaUpdates.x !== undefined ? areaUpdates.x : currentArea.x,
                y: areaUpdates.y !== undefined ? areaUpdates.y : currentArea.y,
                width: areaUpdates.width !== undefined ? areaUpdates.width : currentArea.width,
                height: areaUpdates.height !== undefined ? areaUpdates.height : currentArea.height,
            },
        }

        this.room?.send(Message.UPDATE_MEETING_ROOM, updatedRoomData)
    }

    // Method to register event listener and call back function when a item user added
    onChatMessageAdded(callback: (playerId: string, content: string) => void, context?: any) {
        phaserEvents.on(Event.UPDATE_DIALOG_BUBBLE, callback, context)
    }

    // Method to register event listener and call back function when a item user added
    onItemUserAdded(
        callback: (playerId: string, key: string, itemType: ItemType) => void,
        context?: any
    ) {
        phaserEvents.on(Event.ITEM_USER_ADDED, callback, context)
    }

    // Method to register event listener and call back function when a item user removed
    onItemUserRemoved(
        callback: (playerId: string, key: string, itemType: ItemType) => void,
        context?: any
    ) {
        phaserEvents.on(Event.ITEM_USER_REMOVED, callback, context)
    }

    // Method to register event listener and call back function when a player joined
    onPlayerJoined(callback: (Player: IPlayer, key: string) => void, context?: any) {
        phaserEvents.on(Event.PLAYER_JOINED, callback, context)
    }

    // Method to register event listener and call back function when a player left
    onPlayerLeft(callback: (key: string) => void, context?: any) {
        phaserEvents.on(Event.PLAYER_LEFT, callback, context)
    }

    // Method to register event listener and call back function when myPlayer is ready to connect
    onMyPlayerReady(callback: (key: string) => void, context?: any) {
        phaserEvents.on(Event.MY_PLAYER_READY, callback, context)
    }

    // Method to register event listener and call back function when my video is connected
    onMyPlayerVideoConnected(callback: (key: string) => void, context?: any) {
        phaserEvents.on(Event.MY_PLAYER_VIDEO_CONNECTED, callback, context)
    }

    // Method to register event listener and call back function when a player updated
    onPlayerUpdated(
        callback: (field: string, value: number | string, key: string) => void,
        context?: any
    ) {
        phaserEvents.on(Event.PLAYER_UPDATED, callback, context)
    }

    // Method to send player updates to Colyseus server
    updatePlayer(currentX: number, currentY: number, currentAnim: string) {
        this.room?.send(Message.UPDATE_PLAYER, { x: currentX, y: currentY, anim: currentAnim })
    }

    // Method to send player name to Colyseus server
    updatePlayerName(currentName: string) {
        this.room?.send(Message.UPDATE_PLAYER_NAME, { name: currentName })
    }

    // Method to send ready-to-connect signal to Colyseus server
    readyToConnect() {
        this.room?.send(Message.READY_TO_CONNECT)
        phaserEvents.emit(Event.MY_PLAYER_READY)
    }

    // Method to send ready-to-connect signal to Colyseus server
    videoConnected() {
        this.room?.send(Message.VIDEO_CONNECTED)
        phaserEvents.emit(Event.MY_PLAYER_VIDEO_CONNECTED)
    }

    // Method to send stream-disconnection signal to Colyseus server
    playerStreamDisconnect(id: string) {
        this.room?.send(Message.DISCONNECT_STREAM, { clientId: id })
        this.webRTC?.deleteVideoStream(id)
    }

    connectToComputer(id: string) {
        this.room?.send(Message.CONNECT_TO_COMPUTER, { computerId: id })
    }

    disconnectFromComputer(id: string) {
        this.room?.send(Message.DISCONNECT_FROM_COMPUTER, { computerId: id })
    }

    connectToWhiteboard(id: string) {
        this.room?.send(Message.CONNECT_TO_WHITEBOARD, { whiteboardId: id })
    }

    disconnectFromWhiteboard(id: string) {
        this.room?.send(Message.DISCONNECT_FROM_WHITEBOARD, { whiteboardId: id })
    }

    onStopScreenShare(id: string) {
        this.room?.send(Message.STOP_SCREEN_SHARE, { computerId: id })
    }

    addChatMessage(content: string) {
        this.room?.send(Message.ADD_CHAT_MESSAGE, { content: content })
    }

    createMeetingRoom(roomData: {
        id: string
        name: string
        mode: 'open' | 'private' | 'secret'
        hostUserId: string
        invitedUsers: string[]
        area: { x: number; y: number; width: number; height: number }
    }) {
        this.room?.send(Message.CREATE_MEETING_ROOM, roomData)
    }

    // Update meeting room
    updateMeetingRoom(roomData: {
        id: string
        name: string
        mode: 'open' | 'private' | 'secret'
        hostUserId: string
        invitedUsers: string[]
        area?: { x: number; y: number; width: number; height: number }
    }) {
        this.room?.send(Message.UPDATE_MEETING_ROOM, roomData)
    }

    // Delete meeting room
    deleteMeetingRoom(roomId: string) {
        this.room?.send(Message.DELETE_MEETING_ROOM, { id: roomId })
    }

    // Register event listener for meeting room area added
    onMeetingRoomAdded(callback: (meetingRoom: any, key: string) => void, context?: any) {
        phaserEvents.on(Event.MEETING_ROOM_ADDED, callback, context)
    }

    // Register event listener for meeting room area added
    onMeetingRoomRemoved(callback: (key: string) => void, context?: any) {
        phaserEvents.on(Event.MEETING_ROOM_REMOVED, callback, context)
    }

    // Meeting room chat methods
    sendMeetingRoomChatMessage(meetingRoomId: string, content: string) {
        console.log('🚀 [Network] Sending meeting room chat message to server:', {
            meetingRoomId,
            content,
            timestamp: new Date().toLocaleTimeString()
        })
        this.room?.send(Message.ADD_MEETING_ROOM_CHAT_MESSAGE, {
            meetingRoomId,
            content
        })
    }

    getMeetingRoomChatHistory(meetingRoomId: string) {
        this.room?.send(Message.GET_MEETING_ROOM_CHAT_HISTORY, {
            meetingRoomId
        })
    }

    // Work status related methods
    startWork() {
        console.log('🏢 [Network] Sending START_WORK', {
            connected: !!this.room,
            timestamp: new Date().toISOString()
        })
        this.room?.send(Message.START_WORK)
    }

    endWork() {
        console.log('🏠 [Network] Sending END_WORK', {
            connected: !!this.room,
            timestamp: new Date().toISOString()
        })
        this.room?.send(Message.END_WORK)
    }

    startBreak() {
        console.log('☕ [Network] Sending START_BREAK', {
            connected: !!this.room,
            timestamp: new Date().toISOString()
        })
        this.room?.send(Message.START_BREAK)
    }

    endBreak() {
        console.log('💼 [Network] Sending END_BREAK', {
            connected: !!this.room,
            timestamp: new Date().toISOString()
        })
        this.room?.send(Message.END_BREAK)
    }

    updateWorkStatus(workStatus: string, clothing?: string, accessory?: string) {
        console.log('🔄 [Network] Sending UPDATE_WORK_STATUS:', { workStatus, clothing, accessory })
        this.room?.send(Message.UPDATE_WORK_STATUS, {
            workStatus,
            clothing,
            accessory
        })
    }

    private setupMeetingRoomChatListeners() {
        console.log('🎧 [Network] Setting up meeting room chat listeners')
        if (!this.room) {
            console.error('❌ [Network] Cannot setup chat listeners: room is null')
            return
        }

        // Message listeners are now set up in the main joinOrCreateRoom method
        console.log('✅ [Network] Meeting room chat listeners are already registered')
        
        // Wait for meeting room state to be available (fallback for ArraySchema)
        this.setupMeetingRoomChatMessageListener()
    }

    private setupMeetingRoomChatMessageListener() {
        console.log('🔗 [Network] Attempting to setup chat message listener')
        
        if (this.room?.state?.meetingRoomState?.meetingRoomChatMessages) {
            console.log('✅ [Network] Meeting room chat messages array found, setting up listener')
            
            // Check if it's an ArraySchema and has onAdd method
            if (this.room.state.meetingRoomState.meetingRoomChatMessages.onAdd !== undefined) {
                this.room.state.meetingRoomState.meetingRoomChatMessages.onAdd = (message: IMeetingRoomChatMessage, index: number) => {
                    console.log('🆕 [Network] New meeting room message received via ArraySchema.onAdd:', {
                        messageId: message.messageId,
                        author: message.author,
                        content: message.content,
                        meetingRoomId: message.meetingRoomId,
                        timestamp: new Date(message.createdAt).toLocaleTimeString()
                    })
                    store.dispatch(pushMeetingRoomChatMessage({
                        meetingRoomId: message.meetingRoomId,
                        message
                    }))
                }
                this.chatListenerAttached = true
            } else {
                console.log('ℹ️ [Network] Using message-based approach for meeting room chat (onAdd not available)')
                // The chat messages are handled via onMessage listeners instead
                this.chatListenerAttached = true
            }
        } else {
            console.warn('⚠️ [Network] Meeting room chat messages not available yet, will retry')
            // Retry after state is available
            if (this.room && !this.chatListenerAttached) {
                const stateChangeHandler = () => {
                    if (this.room?.state?.meetingRoomState?.meetingRoomChatMessages && !this.chatListenerAttached) {
                        console.log('🔄 [Network] Retrying chat message listener setup after state change')
                        this.setupMeetingRoomChatMessageListener()
                        // Remove this handler after successful setup
                        // this.room.removeAllListeners('statechange')
                    }
                }
                this.room.onStateChange(stateChangeHandler)
            }
        }
    }
>>>>>>> Stashed changes
}
