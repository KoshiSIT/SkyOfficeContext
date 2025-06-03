import Phaser from 'phaser'

// import { debugDraw } from '../utils/debug'
import { createCharacterAnims } from '../anims/CharacterAnims'

import Item from '../items/Item'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import '../characters/MyPlayer'
import '../characters/OtherPlayer'
import MyPlayer from '../characters/MyPlayer'
import OtherPlayer from '../characters/OtherPlayer'
import PlayerSelector from '../characters/PlayerSelector'
import Network from '../services/Network'
import { IPlayer } from '../../../types/IOfficeState'
import { PlayerBehavior } from '../../../types/PlayerBehavior'
import { ItemType } from '../../../types/Items'

import store from '../stores'
import { setFocused, setShowChat } from '../stores/ChatStore'
import { NavKeys, Keyboard } from '../../../types/KeyboardState'
import { createMeetingRoomWithArea } from '../utils/mRoom'

import { setCurrentMeetingRoomId, MeetingRoom, MeetingRoomArea } from '../stores/MeetingRoomStore'
import { argv0 } from 'process'

export default class Game extends Phaser.Scene {
  network!: Network
  private meetAreaGraphics!: Phaser.GameObjects.Graphics
  private meetAreaOverlay!: Phaser.GameObjects.Graphics
  private cursors!: NavKeys
  private keyE!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  private map!: Phaser.Tilemaps.Tilemap
  private rooms: MeetingRoom[] = []
  myPlayer!: MyPlayer
  private playerSelector!: Phaser.GameObjects.Zone
  private otherPlayers!: Phaser.Physics.Arcade.Group
  private otherPlayerMap = new Map<string, OtherPlayer>()
  computerMap = new Map<string, Computer>()
  private whiteboardMap = new Map<string, Whiteboard>()
  meetingRoomAreas: MeetingRoomArea[] = []
  private meetingRoomZones: Phaser.GameObjects.Zone[] = []
  private prevRooms: MeetingRoom[] = []

  constructor() {
    super('game')
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard.createCursorKeys(),
      ...(this.input.keyboard.addKeys('W,S,A,D') as Keyboard),
    }

    // maybe we can have a dedicated method for adding keys if more keys are needed in the future
    this.keyE = this.input.keyboard.addKey('E')
    this.keyR = this.input.keyboard.addKey('R')
    this.input.keyboard.disableGlobalCapture()
    this.input.keyboard.on('keydown-ENTER', (event) => {
      store.dispatch(setShowChat(true))
      store.dispatch(setFocused(true))
    })
    this.input.keyboard.on('keydown-ESC', (event) => {
      store.dispatch(setShowChat(false))
    })
  }

  disableKeys() {
    this.input.keyboard.enabled = false
  }

  enableKeys() {
    this.input.keyboard.enabled = true
  }

  create(data: { network: Network }) {
    if (!data.network) {
      throw new Error('server instance missing')
    } else {
      this.network = data.network
    }

    createCharacterAnims(this.anims)

    this.map = this.make.tilemap({ key: 'tilemap' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')

    const groundLayer = this.map.createLayer('Ground', FloorAndGround)
    groundLayer.setCollisionByProperty({ collides: true })

    // debugDraw(groundLayer, this)

    this.myPlayer = this.add.myPlayer(705, 500, 'adam', this.network.mySessionId)
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    // import chair objects from Tiled map to Phaser
    const chairs = this.physics.add.staticGroup({ classType: Chair })
    const chairLayer = this.map.getObjectLayer('Chair')
    chairLayer.objects.forEach((chairObj) => {
      const item = this.addObjectFromTiled(chairs, chairObj, 'chairs', 'chair') as Chair
      // custom properties[0] is the object direction specified in Tiled
      item.itemDirection = chairObj.properties[0].value
    })

    // import computers objects from Tiled map to Phaser
    const computers = this.physics.add.staticGroup({ classType: Computer })
    const computerLayer = this.map.getObjectLayer('Computer')
    computerLayer.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(computers, obj, 'computers', 'computer') as Computer
      item.setDepth(item.y + item.height * 0.27)
      const id = `${i}`
      item.id = id
      this.computerMap.set(id, item)
    })

    // import whiteboards objects from Tiled map to Phaser
    const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    const whiteboardLayer = this.map.getObjectLayer('Whiteboard')
    whiteboardLayer.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(
        whiteboards,
        obj,
        'whiteboards',
        'whiteboard'
      ) as Whiteboard
      const id = `${i}`
      item.id = id
      this.whiteboardMap.set(id, item)
    })

    // import vending machine objects from Tiled map to Phaser
    const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    const vendingMachineLayer = this.map.getObjectLayer('VendingMachine')
    vendingMachineLayer.objects.forEach((obj, i) => {
      this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'vendingmachine')
    })

    // import other objects from Tiled map to Phaser
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false)
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)
    this.addGroupFromTiled('Basement', 'basement', 'Basement', true)

    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    this.cameras.main.zoom = 1.5
    this.cameras.main.startFollow(this.myPlayer, true)

    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer)
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], vendingMachines)

    this.physics.add.overlap(
      this.playerSelector,
      [chairs, computers, whiteboards, vendingMachines],
      this.handleItemSelectorOverlap,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.myPlayer,
      this.otherPlayers,
      this.handlePlayersOverlap,
      undefined,
      this
    )
    // **********************
    // Meeting room areas
    this.meetAreaGraphics = this.add.graphics()
    this.meetAreaOverlay = this.add.graphics()
    this.meetingRoomAreas = store.getState().meetingRoom.meetingRoomAreas


    store.subscribe(() => {
      this.rooms = store.getState().meetingRoom.meetingRooms ?? []
      console.log('Meeting rooms updated:', this.rooms)
      this.meetingRoomAreas = store.getState().meetingRoom.meetingRoomAreas
      this.drawMeetingRoomAreas()
      this.createMeetingRoomZones()
      for (const room of this.rooms) {
        const prevRoom = this.prevRooms.find((r) => r.id === room.id)
        if (!prevRoom) continue // if the room is new, skip

        // check if you can access the meeting room
        const prevCanAccess = this.canAccessMeetingRoom(prevRoom)
        const nowCanAccess = this.canAccessMeetingRoom(room)
        if (prevCanAccess !== nowCanAccess) {
          this.onMeetingRoomPermissionChanged(room.id, nowCanAccess)
        }

        // if the room mode changed, remove collider
        if ((prevRoom.mode === 'private' || prevRoom.mode === 'secret') && room.mode === 'open') {
          this.onMeetingRoomPermissionChanged(room.id, true) // collider削除
        }
      }
      // update prevRooms to current rooms
      this.prevRooms = this.rooms.map((r) => ({ ...r }))
    })

    const { room, area } = createMeetingRoomWithArea(
      'Meeting Room',
      'open',
      'hostUserId',
      192,
      482,
      448,
      296
    )

    //**********************
    // register network event listeners
    this.network.onPlayerJoined(this.handlePlayerJoined, this)
    this.network.onPlayerLeft(this.handlePlayerLeft, this)
    this.network.onMyPlayerReady(this.handleMyPlayerReady, this)
    this.network.onMyPlayerVideoConnected(this.handleMyVideoConnected, this)
    this.network.onPlayerUpdated(this.handlePlayerUpdated, this)
    this.network.onItemUserAdded(this.handleItemUserAdded, this)
    this.network.onItemUserRemoved(this.handleItemUserRemoved, this)
    this.network.onChatMessageAdded(this.handleChatMessageAdded, this)
  }

  private handleItemSelectorOverlap(playerSelector, selectionItem) {
    const currentItem = playerSelector.selectedItem as Item
    // currentItem is undefined if nothing was perviously selected
    if (currentItem) {
      // if the selection has not changed, do nothing
      if (currentItem === selectionItem || currentItem.depth >= selectionItem.depth) {
        return
      }
      // if selection changes, clear pervious dialog
      if (this.myPlayer.playerBehavior !== PlayerBehavior.SITTING) currentItem.clearDialogBox()
    }

    // set selected item and set up new dialog
    playerSelector.selectedItem = selectionItem
    selectionItem.onOverlapDialog()
  }

  private addObjectFromTiled(
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const actualX = object.x! + object.width! * 0.5
    const actualY = object.y! - object.height! * 0.5
    const obj = group
      .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
      .setDepth(actualY)
    return obj
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string,
    collidable: boolean
  ) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5
      const actualY = object.y! - object.height! * 0.5
      group
        .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
        .setDepth(actualY)
    })
    if (this.myPlayer && collidable)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group)
  }

  // function to add new player to the otherPlayer group
  private handlePlayerJoined(newPlayer: IPlayer, id: string) {
    const otherPlayer = this.add.otherPlayer(newPlayer.x, newPlayer.y, 'adam', id, newPlayer.name)
    this.otherPlayers.add(otherPlayer)
    this.otherPlayerMap.set(id, otherPlayer)
  }

  // function to remove the player who left from the otherPlayer group
  private handlePlayerLeft(id: string) {
    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id)
      if (!otherPlayer) return
      this.otherPlayers.remove(otherPlayer, true, true)
      this.otherPlayerMap.delete(id)
    }
  }

  private handleMyPlayerReady() {
    this.myPlayer.readyToConnect = true
  }

  private handleMyVideoConnected() {
    this.myPlayer.videoConnected = true
  }

  // function to update target position upon receiving player updates
  private handlePlayerUpdated(field: string, value: number | string, id: string) {
    const otherPlayer = this.otherPlayerMap.get(id)
    otherPlayer?.updateOtherPlayer(field, value)
  }

  private handlePlayersOverlap(myPlayer, otherPlayer) {
    otherPlayer.makeCall(myPlayer, this.network?.webRTC)
  }

  private handleItemUserAdded(playerId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) {
      const computer = this.computerMap.get(itemId)
      computer?.addCurrentUser(playerId)
    } else if (itemType === ItemType.WHITEBOARD) {
      const whiteboard = this.whiteboardMap.get(itemId)
      whiteboard?.addCurrentUser(playerId)
    }
  }

  private handleItemUserRemoved(playerId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) {
      const computer = this.computerMap.get(itemId)
      computer?.removeCurrentUser(playerId)
    } else if (itemType === ItemType.WHITEBOARD) {
      const whiteboard = this.whiteboardMap.get(itemId)
      whiteboard?.removeCurrentUser(playerId)
    }
  }

  private handleChatMessageAdded(playerId: string, content: string) {
    const otherPlayer = this.otherPlayerMap.get(playerId)
    otherPlayer?.updateDialogBubble(content)
  }
  private checkPlayerInMeetingRoom(x: number, y: number) {
    // console.log('checkPlayerInMeetingRoom', x, y, this.currentMeetingRoomId)
    const area = this.meetingRoomAreas.find(
      (a) => x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height
    )
    const nextId = area ? area.meetingRoomId : null
    if (nextId !== this.myPlayer.currentMeetingRoomId) {
      if (nextId) {
        const room = this.rooms.find((r) => r.id === nextId)
        // console.log('checkPlayerInMeetingRoom', nextId, room)
        if (room) {
          const myUserId = this.myPlayer.playerId
          if (room.mode === 'private') {
            if (
              (room.hostUserId !== myUserId && !Array.isArray(room.invitedUsers)) ||
              !room.invitedUsers.includes(myUserId)
            ) {
              console.log('You are not invited to this private room')
            } else {
              console.log('You are entering a private room')
              this.myPlayer.currentMeetingRoomId = nextId
            }
          } else if (room.mode === 'secret') {
            if (room.hostUserId !== myUserId) {
              console.log('You are not allowed to enter this secret room')
            }
          } else {
            console.log('You are entering an open room')
            this.myPlayer.currentMeetingRoomId = nextId
          }
        }
      } else {
        console.log('You are leaving the meeting room')
        this.myPlayer.currentMeetingRoomId = null
      }
    }
  }

  private canAccessMeetingRoom(room: MeetingRoom): boolean {
    const myUserId = this.myPlayer.playerId

    if (room.mode === 'private') {
      return (
        room.hostUserId === myUserId ||
        (Array.isArray(room.invitedUsers) && room.invitedUsers.includes(myUserId))
      )
    } else if (room.mode === 'secret') {
      return room.hostUserId === myUserId
    } else {
      return true // open room
    }
  }

  private meetingRoomColliders: Map<string, Phaser.Physics.Arcade.Collider> = new Map()

  private createMeetingRoomZones() {
    // delete existing colliders and zones
    for (const collider of this.meetingRoomColliders.values()) {
      collider.destroy()
    }
    this.meetingRoomColliders.clear()

    for (const zone of this.meetingRoomZones) {
      zone.destroy()
    }
    this.meetingRoomZones = []

    // create new zones and colliders
    this.meetingRoomAreas.forEach((area) => {
      const centerX = area.x + area.width / 2
      const centerY = area.y + area.height / 2
      const zone = this.add.zone(centerX, centerY, area.width, area.height)
      this.physics.add.existing(zone, true)
      zone.setName(area.meetingRoomId)
      this.meetingRoomZones.push(zone)

      const room = this.rooms.find((r) => r.id === area.meetingRoomId)
      if (!room) return

      if (!this.canAccessMeetingRoom(room)) {
        const collider = this.physics.add.collider(this.myPlayer, zone)
        this.meetingRoomColliders.set(room.id, collider)
      }
    })
  }
  private drawMeetingRoomAreas() {
    this.meetingRoomAreas = store.getState().meetingRoom.meetingRoomAreas

    this.meetAreaGraphics.clear()
    this.meetAreaOverlay.clear()

    this.meetAreaGraphics.setDepth(1000)
    this.meetAreaOverlay.setDepth(1001)

    for (const area of this.meetingRoomAreas) {
      const room = this.rooms.find((r) => r.id === area.meetingRoomId)

      if (room) {
        const canAccess = this.canAccessMeetingRoom(room)

        if (canAccess) {
          this.meetAreaGraphics.lineStyle(3, 0x00ff00, 1)
          this.meetAreaGraphics.strokeRect(area.x, area.y, area.width, area.height)
        } else {
          this.meetAreaGraphics.lineStyle(3, 0xff0000, 1)
          this.meetAreaGraphics.strokeRect(area.x, area.y, area.width, area.height)

          this.meetAreaOverlay.fillStyle(0x808080, 0.6)
          this.meetAreaOverlay.fillRect(area.x, area.y, area.width, area.height)

          const centerX = area.x + area.width / 2
          const centerY = area.y + area.height / 2

          const restrictedText = this.add.text(centerX, centerY, 'cannot access', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 },
          })
          restrictedText.setOrigin(0.5)
          restrictedText.setDepth(1002)

          this.time.delayedCall(3000, () => {
            if (restrictedText && restrictedText.active) {
              restrictedText.destroy()
            }
          })
        }
      } else {
        this.meetAreaGraphics.lineStyle(3, 0xff0000, 1)
        this.meetAreaGraphics.strokeRect(area.x, area.y, area.width, area.height)
      }
    }
  }
  // onMeetingRoomPermissionChanged で「canAccess === true」時は必ず削除
  private onMeetingRoomPermissionChanged(roomId: string, canAccess: boolean) {
    const collider = this.meetingRoomColliders.get(roomId)
    console.log('onMeetingRoomPermissionChanged', roomId, canAccess, collider)
    if (canAccess && collider) {
      console.log('before remove', collider.active)
      collider.destroy()
      console.log('after remove', collider.active)

      console.log('=== MeetingRoomColliders List ===')
      for (const [roomId, collider] of this.meetingRoomColliders.entries()) {
        console.log(roomId, collider, 'active:', collider.active)
      }
      this.meetingRoomColliders.delete(roomId)
    } else if (!canAccess && !collider) {
      const zone = this.meetingRoomZones.find((z) => z.name === roomId)
      if (zone) {
        const newCollider = this.physics.add.collider(this.myPlayer, zone)
        this.meetingRoomColliders.set(roomId, newCollider)
      }
    }
  }

  update(t: number, dt: number) {
    if (this.myPlayer && this.network) {
      this.myPlayer.prevX = this.myPlayer.x
      this.myPlayer.prevY = this.myPlayer.y
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.checkPlayerInMeetingRoom(this.myPlayer.x, this.myPlayer.y)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)
    }
  }
}
