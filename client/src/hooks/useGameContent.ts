import { useAppSelector } from '../hooks'
import { canSendMessages } from '../utils/meetingRoomPermissions'

/**
 * メインゲームコンテンツで使用される状態とロジックを管理
 * App.tsxのゲーム関連ロジックを分離
 */
export const useGameContent = () => {
  const isDevMode = useAppSelector((state) => state.devMode.isDevMode)
  const currentMeetingRoomId = useAppSelector((state) => state.chat.currentMeetingRoomId)
  const meetingRooms = useAppSelector((state) => state.meetingRoom.meetingRooms)
  const sessionId = useAppSelector((state) => state.user.sessionId)

  const currentRoom = currentMeetingRoomId 
    ? meetingRooms.find(r => r.id === currentMeetingRoomId) 
    : null

  const userCanSendMessages = currentRoom 
    ? canSendMessages(sessionId, currentRoom) 
    : false

  return {
    isDevMode,
    currentMeetingRoomId,
    currentRoom,
    userCanSendMessages
  }
}