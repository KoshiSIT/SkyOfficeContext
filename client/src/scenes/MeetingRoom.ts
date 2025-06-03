import Phaser from 'phaser'
import MyPlayer from '../characters/MyPlayer'
import store from '../stores'
import { MeetingRoom, MeetingRoomArea } from '../stores/MeetingRoomStore'

export class MeetingRoomManager {
  private scene: Phaser.Scene
  private myPlayer: MyPlayer
  // meeting rooms and areas
  private rooms: MeetingRoom[] = []
  private meetingRoomAreas: MeetingRoomArea[] = []
  private meetingRoomZones: Phaser.GameObjects.Zone[] = []
  private prevRooms: MeetingRoom[] = []

  //graphics for meeting room MeetingRoomAreas
  private meetAreaGraphics!: Phaser.GameObjects.Graphics
  private meetAreaOverlay!: Phaser.GameObjects.Graphics
  private meetingRoomColliders: Map<string, Phaser.Physics.Arcade.Collider> = new Map()

  constructor(scene: Phaser.Scene, myPlayer: MyPlayer) {
    this.scene = scene
    this.myPlayer = myPlayer
    this.initializeGraphics()
    this.seupStoreSubscription()
  }
  private initializeGraphics() {
    this.meetAreaGraphics = this.scene.add.graphics()
    this.meetAreaOverlay = this.scene.add.graphics()
  }

  private seupStoreSubscription() {
    this.meetingRoomAreas = store.getState().meetingRoom.meetingRoomAreas
    store.subscribe(() => {
      this.rooms = store.getState().meetingRoom.meetingRooms ?? []
      console.log('MeetingRoomManager: Rooms updated', this.rooms)
      this.meetingRoomAreas = store.getState().meetingRoom.meetingRoomAreas ?? []
      this.drawMeetingRoomAreas()
      this.createMeetingRoomZones()

      this.handleRoomUpdates()
      this.updatePrevRooms()
    })
  }

  checkPlayerInMeetingRoom(x: number, y: number): void {
    const area = this.meetingRoomAreas.find(
      (a) => x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height
    )

    const nextId = area ? area.meetingRoomId : null
    if (nextId !== this.myPlayer.currentMeetingRoomId) {
      this.handleMeetingRoomTransition(nextId)
    }
  }

  private handleMeetingRoomTransition(nextId: string | null): void {
    if (nextId) {
      const room = this.rooms.find((r) => r.id === nextId)
      if (room) {
        const myUserId = this.myPlayer.playerId

        if (room.mode === 'private') {
          if (
            (room.hostUserId !== myUserId && !Array.isArray(room.invitedUsers)) ||
            !room.invitedUsers.includes(myUserId)
          ) {
            console.log('[MeetingRoomManager] You are not invited to this private room')
            return
          } else {
            console.log('[MeetingRoomManager] You are entering a private room')
            this.myPlayer.currentMeetingRoomId = nextId
          }
        } else if (room.mode === 'secret') {
          if (room.hostUserId !== myUserId) {
            console.log('[MeetingRoomManager] You are not allowed to enter this secret room')
            return
          } else {
            console.log('[MeetingRoomManager] You are entering a secret room')
            this.myPlayer.currentMeetingRoomId = nextId
          }
        } else {
          console.log('[MeetingRoomManager] You are entering an open room')
          this.myPlayer.currentMeetingRoomId = nextId
        }

        // trigger meeting room enter event
        this.scene.events.emit('enter-meeting-room', nextId, room)
      }
    } else {
      console.log('[MeetingRoomManager] You are leaving the meeting room')
      const previousRoomId = this.myPlayer.currentMeetingRoomId
      this.myPlayer.currentMeetingRoomId = null

      // trigger meeting room leave event
      this.scene.events.emit('leave-meeting-room', previousRoomId)
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

  private createMeetingRoomZones(): void {
    // delete existing colliders and zones
    for (const collider of this.meetingRoomColliders.values()) {
      collider.destroy()
    }
    this.meetingRoomColliders.clear()

    for (const zone of this.meetingRoomZones) {
      zone.destroy()
    }
    this.meetingRoomZones = []

    // make zones for each meeting room area
    this.meetingRoomAreas.forEach((area) => {
      const centerX = area.x + area.width / 2
      const centerY = area.y + area.height / 2
      const zone = this.scene.add.zone(centerX, centerY, area.width, area.height)
      this.scene.physics.add.existing(zone, true)
      zone.setName(area.meetingRoomId)
      this.meetingRoomZones.push(zone)

      const room = this.rooms.find((r) => r.id === area.meetingRoomId)
      if (!room) return

      if (!this.canAccessMeetingRoom(room)) {
        const collider = this.scene.physics.add.collider(
          [this.myPlayer, this.myPlayer.playerContainer], // Assuming myPlayer has a playerContainer],
          zone
        )
        this.meetingRoomColliders.set(room.id, collider)
      }
    })

    console.log('[MeetingRoomManager] Created zones:', this.meetingRoomZones.length)
  }

  private drawMeetingRoomAreas(): void {
    this.meetAreaGraphics.clear()
    this.meetAreaOverlay.clear()

    this.meetAreaGraphics.setDepth(1000)
    this.meetAreaOverlay.setDepth(1001)

    for (const area of this.meetingRoomAreas) {
      const room = this.rooms.find((r) => r.id === area.meetingRoomId)

      if (room) {
        const canAccess = this.canAccessMeetingRoom(room)

        if (canAccess) {
          // can access green border
          this.meetAreaGraphics.lineStyle(3, 0x00ff00, 1)
          this.meetAreaGraphics.strokeRect(area.x, area.y, area.width, area.height)
        } else {
          // cannot access - red border
          this.meetAreaGraphics.lineStyle(3, 0xff0000, 1)
          this.meetAreaGraphics.strokeRect(area.x, area.y, area.width, area.height)

          this.meetAreaOverlay.fillStyle(0x808080, 0.6)
          this.meetAreaOverlay.fillRect(area.x, area.y, area.width, area.height)

          this.showRestrictedText(area)
        }
      } else {
        // If room not found, draw a red border
        this.meetAreaGraphics.lineStyle(3, 0xff0000, 1)
        this.meetAreaGraphics.strokeRect(area.x, area.y, area.width, area.height)
      }
    }

    console.log('[MeetingRoomManager] Drew room areas:', this.meetingRoomAreas.length)
  }
  private showRestrictedText(area: MeetingRoomArea): void {
    const centerX = area.x + area.width / 2
    const centerY = area.y + area.height / 2

    const restrictedText = this.scene.add.text(centerX, centerY, 'cannot access', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    })
    restrictedText.setOrigin(0.5)
    restrictedText.setDepth(1002)

    this.scene.time.delayedCall(3000, () => {
      if (restrictedText && restrictedText.active) {
        restrictedText.destroy()
      }
    })
  }

  private handleRoomUpdates(): void {
    for (const room of this.rooms) {
      const prevRoom = this.prevRooms.find((r) => r.id === room.id)
      if (!prevRoom) continue // if the room is new, skip

      //check your access permission changing
      const prevCanAccess = this.canAccessMeetingRoom(prevRoom)
      const nowCanAccess = this.canAccessMeetingRoom(room)
      if (prevCanAccess !== nowCanAccess) {
        this.onMeetingRoomPermissionChanged(room.id, nowCanAccess)
      }

      // check mode change from private/secret to open
      if ((prevRoom.mode === 'private' || prevRoom.mode === 'secret') && room.mode === 'open') {
        this.onMeetingRoomPermissionChanged(room.id, true)
      }
    }
  }

  private onMeetingRoomPermissionChanged(roomId: string, canAccess: boolean): void {
    const collider = this.meetingRoomColliders.get(roomId)
    console.log('[MeetingRoomManager] Permission changed:', roomId, canAccess)

    if (canAccess && collider) {
      collider.destroy()
      this.meetingRoomColliders.delete(roomId)
    } else if (!canAccess && !collider) {
      const zone = this.meetingRoomZones.find((z) => z.name === roomId)
      if (zone) {
        const newCollider = this.scene.physics.add.collider(
          [this.myPlayer, this.myPlayer.playerContainer],
          zone
        )
        this.meetingRoomColliders.set(roomId, newCollider)
      }
    }
  }
  private updatePrevRooms(): void {
    this.prevRooms = this.rooms.map((r) => ({ ...r }))
  }

  update(): void {}

  destroy(): void {
    for (const collider of this.meetingRoomColliders.values()) {
      collider.destroy()
    }

    this.meetingRoomColliders.clear()
    for (const zone of this.meetingRoomZones) {
      zone.destroy()
    }
    this.meetingRoomZones = []

    this.meetAreaGraphics?.destroy()
    this.meetAreaOverlay?.destroy()
  }
}
