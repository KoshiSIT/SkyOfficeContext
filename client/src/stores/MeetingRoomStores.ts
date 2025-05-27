import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MeetingRoomMode = 'open' | private' | 'secret';

export interface MeetingRoom {
    id: string;
    name: string;
    mode: MeetingRoomMode;
    hostUserId: string;
    invitedUssers: string[];
    participants: string[];
}

export interface MeetingRoomArea{
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
    meetingRoomAreas: []
};


export const meetingRoomSlice = createSlice({
    name: 'meetingRoom',
    currentMeetingRoomId: null,
    reducers: {
        setMeetingRooms: (staet, action: PlayloadAction>MeetingRoom[]>) => {
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

    }
});

export const {
    setMeetingRooms,
    addMeetingRoom,
    updateMeetingRoom,
    removeMeetingRoom,
    setCurrentMeetingRoomId
    addMeetingRoomArea,
    updateMeetingRoomArea,
    removeMeetingRoomArea
} = meetingRoomSlice.actions;

export default meetingRoomSlice.reducer;

