import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MeetingRoomMode = 'open' | 'private' | 'secret';

export interface MeetingRoom {
    id: string;
    name: string;
    mode: MeetingRoomMode;
    hostUserId: string;
    invitedUsers: string[];
    participants: string[];
}

export interface MeetingRoomArea{
    meetingRoomId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface MeetingRoomState {
    meetingRooms : MeetingRoom[];
    currentMeetingRoomId: string | null;
    meetingRoomAreas: MeetingRoomArea[];
}

const initialState: MeetingRoomState = {
    meetingRooms: [],
    currentMeetingRoomId: null,
    meetingRoomAreas: [],
};


export const meetingRoomSlice = createSlice({
    name: 'meetingRoom',
    initialState,
    reducers: {
        setMeetingRooms: (state, action: PayloadAction<MeetingRoom[]>) => {
            state.meetingRooms = action.payload;
        },
        addMeetingRoom: (state, action: PayloadAction<MeetingRoom>) => {
            state.meetingRooms.push(action.payload);
        },

        updateMeetingRoom: (state, action: PayloadAction<MeetingRoom>) => {
            const index = state.meetingRooms.findIndex(room => room.id === action.payload.id);
            if (index !== -1) {
                state.meetingRooms[index] = action.payload;
            }
        },
        removeMeetingRoom: (state, action: PayloadAction<string>) => {
            state.meetingRooms = state.meetingRooms.filter(room => room.id !== action.payload);
        },

        setCurrentMeetingRoomId: (state, action: PayloadAction<string | null>) => {
            state.currentMeetingRoomId = action.payload;
        },
        addMeetingRoomArea: (state, action: PayloadAction<MeetingRoomArea>) => {
            state.meetingRoomAreas.push(action.payload);
        },
        updateMeetingRoomArea: (state, action: PayloadAction<MeetingRoomArea>) => {
            const idx = state.meetingRoomAreas.findIndex(area => area.meetingRoomId === action.payload.meetingRoomId);
            if (idx !== -1) state.meetingRoomAreas[idx] = action.payload;
        },
        removeMeetingRoomArea: (state, action: PayloadAction<string>) => {
            state.meetingRoomAreas = state.meetingRoomAreas.filter(area => area.meetingRoomId !== action.payload);
        },

        // Server-specific actions for network sync
        addMeetingRoomFromServer: (state, action: PayloadAction<MeetingRoom>) => {
            // Check if room already exists to avoid duplicates
            const exists = state.meetingRooms.find(room => room.id === action.payload.id);
            if (!exists) {
                state.meetingRooms.push(action.payload);
                console.log('📥 [MeetingRoomStore] Added room from server:', action.payload.id);
            }
        },
        removeMeetingRoomFromServer: (state, action: PayloadAction<string>) => {
            state.meetingRooms = state.meetingRooms.filter(room => room.id !== action.payload);
            console.log('📤 [MeetingRoomStore] Removed room from server:', action.payload);
        },
        addMeetingRoomAreaFromServer: (state, action: PayloadAction<MeetingRoomArea>) => {
            // Check if area already exists to avoid duplicates
            const exists = state.meetingRoomAreas.find(area => area.meetingRoomId === action.payload.meetingRoomId);
            if (!exists) {
                state.meetingRoomAreas.push(action.payload);
                console.log('📥 [MeetingRoomStore] Added area from server:', action.payload.meetingRoomId);
            }
        },
        removeMeetingRoomAreaFromServer: (state, action: PayloadAction<string>) => {
            state.meetingRoomAreas = state.meetingRoomAreas.filter(area => area.meetingRoomId !== action.payload);
            console.log('📤 [MeetingRoomStore] Removed area from server:', action.payload);
        },

    }
});

export const {
    setMeetingRooms,
    addMeetingRoom,
    updateMeetingRoom,
    removeMeetingRoom,
    setCurrentMeetingRoomId,
    addMeetingRoomArea,
    updateMeetingRoomArea,
    removeMeetingRoomArea,
    addMeetingRoomFromServer,
    removeMeetingRoomFromServer,
    addMeetingRoomAreaFromServer,
    removeMeetingRoomAreaFromServer,
} = meetingRoomSlice.actions;

export default meetingRoomSlice.reducer;

