'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Room } from '@/lib/types'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = io()
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('room-updated', (updatedRoom: Room) => setRoom(updatedRoom))

    return () => {
      socket.disconnect()
    }
  }, [])

  const createRoom = (playerName: string): Promise<Room> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('create-room', { playerName }, (res: { room?: Room; error?: string }) => {
        if (res.error) reject(new Error(res.error))
        else { setRoom(res.room!); resolve(res.room!) }
      })
    })
  }

  const joinRoom = (roomId: string, playerName: string): Promise<Room> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('join-room', { roomId, playerName }, (res: { room?: Room; error?: string }) => {
        if (res.error) { setError(res.error); reject(new Error(res.error)) }
        else { setRoom(res.room!); resolve(res.room!) }
      })
    })
  }

  const vote = (value: string) => {
    socketRef.current?.emit('vote', { vote: value })
  }

  const revealVotes = () => {
    socketRef.current?.emit('reveal-votes')
  }

  const resetVotes = (story: string) => {
    socketRef.current?.emit('reset-votes', { story })
  }

  const setStory = (story: string) => {
    socketRef.current?.emit('set-story', { story })
  }

  const myId = socketRef.current?.id

  return { room, error, connected, myId, createRoom, joinRoom, vote, revealVotes, resetVotes, setStory }
}
