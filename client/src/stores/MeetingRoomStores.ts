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

interface MeetingRoomState {
    meetingRooms : MeetingRoom[];
    currentMeetingRoomId: string | null;
}

const initialState: MeetingRoomState = {
    meetingRooms: [],
    currentMeetingRoomId: null,
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

    }
});

export const {
    setMeetingRooms,
    addMeetingRoom,
    updateMeetingRoom,
    removeMeetingRoom,
    setCurrentMeetingRoomId
} = meetingRoomSlice.actions;

export default meetingRoomSlice.reducer;

