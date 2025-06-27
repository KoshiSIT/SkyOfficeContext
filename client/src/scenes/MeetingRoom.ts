import Phaser from 'phaser'
import MyPlayer from '../characters/MyPlayer'
import store from '../stores'
import { MeetingRoom, MeetingRoomArea } from '../stores/MeetingRoomStore'
import { setCurrentMeetingRoomId, pushMeetingRoomUserJoinedMessage, pushMeetingRoomUserLeftMessage } from '../stores/ChatStore'

export class MeetingRoomManager {
<<<<<<< Updated upstream
  private scene: Phaser.Scene
  private myPlayer: MyPlayer
  // meeting rooms and areas
  private rooms: MeetingRoom[] = []
  private meetingRoomAreas: MeetingRoomArea[] = []
  private meetingRoomZones: Phaser.GameObjects.Zone[] = []
  private prevRooms: MeetingRoom[] = []
=======
    private scene: Phaser.Scene
    private myPlayer: MyPlayer
    // Meeting rooms and areas
    private rooms: MeetingRoom[] = []
    private canAccess: boolean = true
    private meetingRoomAreas: MeetingRoomArea[] = []
    private meetingRoomZones: Phaser.GameObjects.Zone[] = []
    private prevRooms: MeetingRoom[] = []
    private prevAreas: MeetingRoomArea[] = [] // Store previous areas for comparison
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
=======
>>>>>>> Stashed changes
    }
  }

<<<<<<< Updated upstream
  private handleMeetingRoomTransition(nextId: string | null): void {
    if (nextId) {
      const room = this.rooms.find((r) => r.id === nextId)
      if (room) {
=======
    private initializeGraphics() {
        this.meetAreaGraphics = this.scene.add.graphics()
        this.meetAreaOverlay = this.scene.add.graphics()
    }

    private setupStoreSubscription() {
        this.meetingRoomAreas = store.getState().meetingRoom.meetingRoomAreas
        this.rooms = store.getState().meetingRoom.meetingRooms ?? []

        // Initial rendering
        this.drawMeetingRoomAreas()
        this.createMeetingRoomZones()
        this.updatePrevStates()

        store.subscribe(() => {
            const newRooms = store.getState().meetingRoom.meetingRooms ?? []
            const newAreas = store.getState().meetingRoom.meetingRoomAreas ?? []

            // Recreate areas and zones only when areas have changed
            if (this.hasAreasChanged(newAreas)) {
                this.meetingRoomAreas = newAreas
                this.drawMeetingRoomAreas()
                this.createMeetingRoomZones()
            }

            // Update room processing only when rooms have changed
            if (this.hasRoomsChanged(newRooms)) {
                this.rooms = newRooms
                this.handleRoomUpdates() // Handle room state changes and update signals
                this.drawMeetingRoomAreas() // Redraw if access permissions have changed
            }

            this.updatePrevStates()
        })
    }

    // Check if areas have changed
    private hasAreasChanged(newAreas: MeetingRoomArea[]): boolean {
        if (this.prevAreas.length !== newAreas.length) {
            return true
        }

        for (let i = 0; i < newAreas.length; i++) {
            const newArea = newAreas[i]
            const prevArea = this.prevAreas[i]

            if (
                !prevArea ||
                newArea.meetingRoomId !== prevArea.meetingRoomId ||
                newArea.x !== prevArea.x ||
                newArea.y !== prevArea.y ||
                newArea.width !== prevArea.width ||
                newArea.height !== prevArea.height
            ) {
                return true
            }
        }

        return false
    }

    // Check if rooms have changed
    private hasRoomsChanged(newRooms: MeetingRoom[]): boolean {
        if (this.prevRooms.length !== newRooms.length) {
            return true
        }

        for (let i = 0; i < newRooms.length; i++) {
            const newRoom = newRooms[i]
            const prevRoom = this.prevRooms[i]

            if (
                !prevRoom ||
                newRoom.id !== prevRoom.id ||
                newRoom.mode !== prevRoom.mode ||
                newRoom.hostUserId !== prevRoom.hostUserId ||
                JSON.stringify(newRoom.invitedUsers) !== JSON.stringify(prevRoom.invitedUsers)
            ) {
                return true
            }
        }

        return false
    }

    // Get access permission for the area where the player is currently located
    private getCurrentAreaAccess(): boolean {
        const currentArea = this.meetingRoomAreas.find((area) => {
            const playerX = this.myPlayer.x
            const playerY = this.myPlayer.y
            return (
                playerX >= area.x &&
                playerX <= area.x + area.width &&
                playerY >= area.y &&
                playerY <= area.y + area.height
            )
        })

        if (!currentArea) {
            return true // Always accessible outside of areas
        }

        const room = this.rooms.find((r) => r.id === currentArea.meetingRoomId)
        if (!room) {
            return true // Accessible if room is not found
        }

        return this.canAccessMeetingRoom(room)
    }

    // Update canAccess state based on current area
    private updateCanAccessState(): void {
        const newCanAccess = this.getCurrentAreaAccess()
        console.log(`[MeetingRoomManager] Can access current area: ${newCanAccess}`)
        if (this.canAccess !== newCanAccess) {
            this.canAccess = newCanAccess
            this.scene.events.emit('meeting-room-access-changed', {
                canAccess: newCanAccess
            })
        }
    }

    checkPlayerInMeetingRoom(x: number, y: number): void {
        const area = this.meetingRoomAreas.find(
            (a) => x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height
        )

        const nextId = area ? area.meetingRoomId : null
        if (nextId !== this.myPlayer.currentMeetingRoomId) {
            this.handleMeetingRoomTransition(nextId)
            this.updateCanAccessState() // Update state on room transition
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

                // Update chat store with current meeting room
                store.dispatch(setCurrentMeetingRoomId(nextId))
                
                // Add user joined message to meeting room chat
                store.dispatch(pushMeetingRoomUserJoinedMessage({
                    meetingRoomId: nextId,
                    userName: this.myPlayer.name || this.myPlayer.playerId
                }))

                // Trigger meeting room enter event
                this.scene.events.emit('enter-meeting-room', nextId, room)
            }
        } else {
            console.log('[MeetingRoomManager] You are leaving the meeting room')
            const previousRoomId = this.myPlayer.currentMeetingRoomId
            
            if (previousRoomId) {
                // Add user left message to meeting room chat
                store.dispatch(pushMeetingRoomUserLeftMessage({
                    meetingRoomId: previousRoomId,
                    userName: this.myPlayer.name || this.myPlayer.playerId
                }))
            }
            
            this.myPlayer.currentMeetingRoomId = null
            
            // Update chat store - no longer in a meeting room
            store.dispatch(setCurrentMeetingRoomId(null))

            // Trigger meeting room leave event
            this.scene.events.emit('leave-meeting-room', previousRoomId)
        }
    }

    private canAccessMeetingRoom(room: MeetingRoom): boolean {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      } else {
        // If room not found, draw a red border
        this.meetAreaGraphics.lineStyle(3, 0xff0000, 1)
=======
        this.meetingRoomColliders.clear()

        for (const zone of this.meetingRoomZones) {
            zone.destroy()
        }
        this.meetingRoomZones = []
    }

    private drawMeetingRoomAreas(): void {
        // Don't draw if in visual edit mode
        if (this.isVisualEditMode) {
            console.log('🎯 [MeetingRoomManager] Skipping drawing - in visual edit mode')
            return
        }
        
        this.meetAreaGraphics.clear()
        this.meetAreaOverlay.clear()

        this.meetAreaGraphics.setDepth(1000)
        this.meetAreaOverlay.setDepth(1001)

        for (const area of this.meetingRoomAreas) {
            const room = this.rooms.find((r) => r.id === area.meetingRoomId)

            if (room) {
                this.drawMeetingRoomArea(area)
            }
        }
    }

    // Methods to hide/show room areas for visual editing mode
    private isVisualEditMode = false
    
    public hideRoomAreas(): void {
        console.log('🎯 [MeetingRoomManager] Hiding room areas for visual edit mode')
        this.isVisualEditMode = true
        this.meetAreaGraphics.setVisible(false)
        this.meetAreaOverlay.setVisible(false)
    }

    public showRoomAreas(): void {
        console.log('🎯 [MeetingRoomManager] Showing room areas - exiting visual edit mode')
        this.isVisualEditMode = false
        this.meetAreaGraphics.setVisible(true)
        this.meetAreaOverlay.setVisible(true)
        // Redraw after exiting visual edit mode
        this.drawMeetingRoomAreas()
    }

    private drawMeetingRoomArea(area: MeetingRoomArea): void {
        const room = this.rooms.find(r => r.id === area.meetingRoomId)
        if (!room) return
        
        const canAccess = this.canAccessMeetingRoom(room)
        
        if (canAccess) {
            // 緑の枠線（アクセス可能）
            this.meetAreaGraphics.lineStyle(3, 0x00ff00, 1)
        } else {
            // 赤の枠線（アクセス不可）
            this.meetAreaGraphics.lineStyle(3, 0xff0000, 1)
            this.showRestrictedText(area)
        }
        
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    this.meetingRoomColliders.clear()
    for (const zone of this.meetingRoomZones) {
      zone.destroy()
=======
    private handleRoomUpdates(): void {
        console.log('[MeetingRoomManager] handleRoomUpdates called')

        // Process each room for access permission changes
        for (const room of this.rooms) {
            const prevRoom = this.prevRooms.find((r) => r.id === room.id)
            if (!prevRoom) continue // If the room is new, skip

            // Check if access permission has changed
            const prevCanAccess = this.canAccessMeetingRoom(prevRoom)
            const nowCanAccess = this.canAccessMeetingRoom(room)

            if (prevCanAccess !== nowCanAccess) {
                console.log(
                    `[MeetingRoomManager] Access permission changed for room ${room.id}: ${prevCanAccess} → ${nowCanAccess}`
                )

                // Update state when room permission changes
                this.canAccess = nowCanAccess
                this.scene.events.emit('meeting-room-access-changed', {
                    roomId: room.id,
                    canAccess: nowCanAccess
                })

                this.onMeetingRoomPermissionChanged(room.id, nowCanAccess)
            }

            // Check mode change from private/secret to open
            if ((prevRoom.mode === 'private' || prevRoom.mode === 'secret') && room.mode === 'open') {
                console.log(`[MeetingRoomManager] Room ${room.id} changed to open mode`)
                this.canAccess = true
                this.scene.events.emit('meeting-room-access-changed', {
                    roomId: room.id,
                    canAccess: true
                })
                this.onMeetingRoomPermissionChanged(room.id, true)
            }
        }
>>>>>>> Stashed changes
    }
    this.meetingRoomZones = []

    this.meetAreaGraphics?.destroy()
    this.meetAreaOverlay?.destroy()
  }
}
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
