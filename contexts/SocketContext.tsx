'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Room } from '@/lib/types'

interface SocketContextValue {
  connected: boolean
  room: Room | null
  myId: string | undefined
  createRoom: (playerName: string) => Promise<Room>
  joinRoom: (roomId: string, playerName: string) => Promise<Room>
  vote: (value: string) => void
  revealVotes: () => void
  resetVotes: (story: string) => void
  setStory: (story: string) => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [myId, setMyId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    const socket = socketUrl ? io(socketUrl) : io()
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setMyId(socket.id)
    })
    socket.on('disconnect', () => {
      setConnected(false)
      setMyId(undefined)
    })
    socket.on('room-updated', (updatedRoom: Room) => setRoom(updatedRoom))

    return () => {
      socket.disconnect()
    }
  }, [])

  const createRoom = useCallback((playerName: string): Promise<Room> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket) return reject(new Error('未接続'))
      socket.emit('create-room', { playerName }, (res: { room?: Room; error?: string }) => {
        if (res.error) reject(new Error(res.error))
        else { setRoom(res.room!); resolve(res.room!) }
      })
    })
  }, [])

  const joinRoom = useCallback((roomId: string, playerName: string): Promise<Room> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket) return reject(new Error('未接続'))
      socket.emit('join-room', { roomId, playerName }, (res: { room?: Room; error?: string }) => {
        if (res.error) reject(new Error(res.error))
        else { setRoom(res.room!); resolve(res.room!) }
      })
    })
  }, [])

  const vote = useCallback((value: string) => {
    socketRef.current?.emit('vote', { vote: value })
  }, [])

  const revealVotes = useCallback(() => {
    socketRef.current?.emit('reveal-votes')
  }, [])

  const resetVotes = useCallback((story: string) => {
    socketRef.current?.emit('reset-votes', { story })
  }, [])

  const setStory = useCallback((story: string) => {
    socketRef.current?.emit('set-story', { story })
  }, [])

  return (
    <SocketContext.Provider value={{ connected, room, myId, createRoom, joinRoom, vote, revealVotes, resetVotes, setStory }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider')
  return ctx
}
