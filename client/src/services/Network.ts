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
  pushChatMessage,
  pushPlayerJoinedMessage,
  pushPlayerLeftMessage,
  pushMeetingRoomChatMessage,
  setMeetingRoomChatHistory,
} from '../stores/ChatStore'
import { setWhiteboardUrls } from '../stores/WhiteboardStore'

import { updateOtherPlayerWorkStatus } from '../stores/WorkStore'
import { 
  addMeetingRoomFromServer,
  removeMeetingRoomFromServer,
  addMeetingRoomAreaFromServer,
  removeMeetingRoomAreaFromServer
} from '../stores/MeetingRoomStore'
import { IMeetingRoomChatMessage } from '../../../types/IOfficeState'

export default class Network {
  private client: Client
  private room?: Room<IOfficeState>
  private lobby!: Room
  private chatListenerAttached = false
  webRTC?: WebRTC

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

      // track jointed player name
      store.dispatch(setPlayerNameMap({ id: key, name: player.name }))
      
      phaserEvents.emit(Event.PLAYER_JOINED, key, player)
      
      player.onChange = () => {
        phaserEvents.emit(Event.PLAYER_UPDATED, key, player)
        
        // Check for work status changes and update Redux
        if (player.name) {
          const currentWorkStatus = (player as any).workStatus
          if (currentWorkStatus) {
            console.log('👤 [Network] Player work status changed (onChange):', {
              playerId: key,
              playerName: player.name,
              workStatus: currentWorkStatus
            })
            store.dispatch(updateOtherPlayerWorkStatus({
              playerId: key,
              playerName: player.name,
              workStatus: currentWorkStatus
            }))
          }
        }
      }
    }

    // when a player leaves the room
    this.room.state.players.onRemove = (player: IPlayer, key: string) => {
      phaserEvents.emit(Event.PLAYER_LEFT, key, player)
      store.dispatch(removePlayerNameMap(key))
    }

    // when a computer is added to the room
    this.room.state.computers.onAdd = (computer: IComputer, key: string) => {
      phaserEvents.emit(Event.ITEM_ADDED, computer, key, ItemType.COMPUTER)
    }

    // when a computer is removed from the room
    this.room.state.computers.onRemove = (computer: IComputer, key: string) => {
      phaserEvents.emit(Event.ITEM_REMOVED, key, ItemType.COMPUTER)
    }

    // when a whiteboard is added to the room
    this.room.state.whiteboards.onAdd = (whiteboard: IWhiteboard, key: string) => {
      phaserEvents.emit(Event.ITEM_ADDED, whiteboard, key, ItemType.WHITEBOARD)
    }

    // when a whiteboard is removed from the room
    this.room.state.whiteboards.onRemove = (whiteboard: IWhiteboard, key: string) => {
      phaserEvents.emit(Event.ITEM_REMOVED, key, ItemType.WHITEBOARD)
    }

    // when an item is added to the room
    this.room.state.chatMessages.onAdd = (item: any, key: number) => {
      store.dispatch(pushChatMessage(item))
      phaserEvents.emit('chat-message-added', item, key)
    }

    // when an item is removed from the room
    this.room.state.chatMessages.onRemove = (item: any, key: number) => {
      console.log('message removed')
    }

    // when whiteboard urls are set (using string type instead of enum)
    this.room.onMessage('UPDATE_WHITEBOARD_URLS', (message: { whiteboardId: string; whiteboardUrls: string[] }) => {
      store.dispatch(setWhiteboardUrls(message))
    })

    phaserEvents.emit(Event.JOINED_ROOM)

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

  // Handle meeting room added safely
  private handleMeetingRoomAdded(meetingRoom: any, key: string) {
    try {
        const roomData = {
            id: meetingRoom.id || key,
            name: meetingRoom.name || 'Unnamed Room',
            mode: meetingRoom.mode || 'open',
            hostUserId: meetingRoom.hostUserId || '',
            invitedUsers: Array.isArray(meetingRoom.invitedUsers)
                ? meetingRoom.invitedUsers.slice()
                : [],
            participants: Array.isArray(meetingRoom.participants)
                ? meetingRoom.participants.slice()
                : [],
        }

        store.dispatch(addMeetingRoomFromServer(roomData))
        console.log('✅ [Network] Meeting room added:', roomData.id)
    } catch (error) {
        console.error('❌ [Network] Error handling meeting room added:', error)
    }
  }

  // Handle meeting room area added safely
  private handleMeetingRoomAreaAdded(area: any, key: string) {
    try {
        const areaData = {
            meetingRoomId: area.meetingRoomId || key,
            x: area.x || 0,
            y: area.y || 0,
            width: area.width || 100,
            height: area.height || 100,
        }

        store.dispatch(addMeetingRoomAreaFromServer(areaData))
        console.log('✅ [Network] Meeting room area added:', areaData.meetingRoomId)
    } catch (error) {
        console.error('❌ [Network] Error handling meeting room area added:', error)
    }
  }

  // Setup meeting room chat listeners
  private setupMeetingRoomChatListeners() {
    console.log('📞 [Network] Setting up meeting room chat listeners')
    
    // Listener for chat history
    this.room?.onMessage('meeting-room-chat-history', (message: {
        meetingRoomId: string
        messages: IMeetingRoomChatMessage[]
    }) => {
        console.log('📜 [Network] Received chat history:', {
            roomId: message.meetingRoomId,
            messageCount: message.messages.length
        })
        
        store.dispatch(setMeetingRoomChatHistory({
            meetingRoomId: message.meetingRoomId,
            messages: message.messages
        }))
    })

    // Listener for new chat messages
    this.room?.onMessage('new-meeting-room-chat-message', (message: IMeetingRoomChatMessage) => {
        console.log('💬 [Network] Received new chat message:', {
            messageId: message.messageId,
            author: message.author,
            content: message.content,
            meetingRoomId: message.meetingRoomId,
            timestamp: new Date(message.createdAt).toLocaleTimeString()
        })
        
        store.dispatch(pushMeetingRoomChatMessage({
            meetingRoomId: message.meetingRoomId,
            message: message
        }))
    })
  }

  // Setup meeting room chat message listener (for real-time updates)
  private setupMeetingRoomChatMessageListener() {
    if (!this.room?.state?.meetingRoomState?.meetingRoomChatMessages || this.chatListenerAttached) {
        return
    }

    console.log('🎧 [Network] Setting up meeting room chat message listener')
    
    this.room.state.meetingRoomState.meetingRoomChatMessages.onAdd = (message: any, index: number) => {
        console.log('💭 [Network] New meeting room chat message added to state:', {
            index,
            messageId: message.messageId,
            author: message.author,
            content: message.content,
            meetingRoomId: message.meetingRoomId,
            timestamp: new Date(message.createdAt).toLocaleTimeString()
        })
        
        // Dispatch to Redux store
        store.dispatch(pushMeetingRoomChatMessage({
            meetingRoomId: message.meetingRoomId,
            message: message as any
        }))
    }
    
    this.chatListenerAttached = true
  }

  // Get meeting room chat history
  getMeetingRoomChatHistory(meetingRoomId: string) {
    if (!this.room) {
        console.error('❌ [Network] Cannot get chat history: Room not connected')
        return
    }
    
    console.log('📂 [Network] Requesting meeting room chat history:', meetingRoomId)
    this.room.send(Message.GET_MEETING_ROOM_CHAT_HISTORY, { meetingRoomId })
  }

  // Send meeting room chat message
  sendMeetingRoomChatMessage(meetingRoomId: string, content: string) {
    if (!this.room) {
        console.error('❌ [Network] Cannot send message: Room not connected')
        return
    }
    
    console.log('📤 [Network] Sending meeting room chat message:', {
        meetingRoomId,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        timestamp: new Date().toLocaleTimeString()
    })
    
    this.room.send(Message.ADD_MEETING_ROOM_CHAT_MESSAGE, {
        meetingRoomId,
        content
    })
  }

  // method to connect to webRTC
  connectToPlayer(userId: string, stream: MediaStream) {
    this.webRTC?.connectToPlayer(userId, stream)
  }

  // method to disconnect from webRTC
  disconnectFromPlayer(userId: string) {
    this.webRTC?.disconnectFromPlayer(userId)
  }

  // Update player name
  updatePlayerName(name: string) {
    this.room?.send(Message.UPDATE_PLAYER_NAME, { name: name })
  }

  // Update player
  updatePlayer(currentPlayer: IPlayer): void
  updatePlayer(x: number, y: number, anim: string): void
  updatePlayer(currentPlayerOrX: IPlayer | number, y?: number, anim?: string) {
    if (typeof currentPlayerOrX === 'object') {
      // Called with IPlayer object
      this.room?.send(Message.UPDATE_PLAYER, currentPlayerOrX)
    } else {
      // Called with x, y, anim parameters
      this.room?.send(Message.UPDATE_PLAYER, { x: currentPlayerOrX, y: y!, anim: anim! })
    }
  }

  // Update player position and animation
  updatePlayerNameMapCallback(username: string) {
    this.room?.send(Message.UPDATE_PLAYER_NAME, { name: username })
  }

  // ready to connect handler
  readyToConnect() {
    this.room?.send(Message.READY_TO_CONNECT)
  }

  // video connected handler
  videoConnected() {
    this.room?.send(Message.VIDEO_CONNECTED)
  }

  // Update player position and animation
  connectToComputer(computerId: string) {
    this.room?.send(Message.CONNECT_TO_COMPUTER, { computerId: computerId })
  }

  // stop screen share
  disconnectFromComputer(computerId: string) {
    this.room?.send(Message.DISCONNECT_FROM_COMPUTER, { computerId: computerId })
  }

  // stop screen share
  stopScreenShare(computerId: string) {
    this.room?.send(Message.STOP_SCREEN_SHARE, { computerId: computerId })
  }

  // connect to whiteboard
  connectToWhiteboard(whiteboardId: string) {
    this.room?.send(Message.CONNECT_TO_WHITEBOARD, { whiteboardId: whiteboardId })
  }

  // disconnect from whiteboard
  disconnectFromWhiteboard(whiteboardId: string) {
    this.room?.send(Message.DISCONNECT_FROM_WHITEBOARD, { whiteboardId: whiteboardId })
  }

  // send chat message
  addChatMessage(content: string) {
    this.room?.send(Message.ADD_CHAT_MESSAGE, { content: content })
  }

  // send disconnect to stream
  disconnectStream(clientId: string) {
    this.room?.send(Message.DISCONNECT_STREAM, { clientId: clientId })
  }

  // Listener for player joining
  playerStreamDisconnect(userId: string) {
    this.webRTC?.disconnectFromPlayer(userId)
  }

  // 勤務ステータス関連のメッセージ送信メソッド
  startWork() {
    this.room?.send(Message.START_WORK)
  }

  endWork() {
    this.room?.send(Message.END_WORK)
  }

  startBreak() {
    this.room?.send(Message.START_BREAK)
  }

  endBreak() {
    this.room?.send(Message.END_BREAK)
  }

  updateWorkStatus(workStatus: string, clothing?: string, accessory?: string) {
    this.room?.send(Message.UPDATE_WORK_STATUS, {
      workStatus,
      clothing,
      accessory
    })
  }
}