'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSocketContext } from '@/contexts/SocketContext'

export default function Home() {
  const router = useRouter()
  const { createRoom, joinRoom } = useSocketContext()
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!playerName.trim()) return
    setLoading(true)
    setFormError(null)
    try {
      const room = await createRoom(playerName.trim())
      sessionStorage.setItem('playerName', playerName.trim())
      sessionStorage.setItem('roomId', room.id)
      router.push(`/room/${room.id}`)
    } catch {
      setFormError('ルームの作成に失敗しました')
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!playerName.trim() || !roomId.trim()) return
    setLoading(true)
    setFormError(null)
    try {
      const room = await joinRoom(roomId.trim().toUpperCase(), playerName.trim())
      router.push(`/room/${room.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '参加に失敗しました')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Planning Poker</h1>
        <p className="text-purple-200 text-center mb-8 text-sm">チームでアジャイル見積もりを行おう</p>

        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
            >
              ルームを作成する
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
            >
              ルームに参加する
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-1">あなたの名前</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前を入力..."
                maxLength={20}
                className="w-full bg-white/20 text-white placeholder-white/40 border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
            </div>
            {formError && (
              <p className="text-red-300 text-sm">{formError}</p>
            )}
            <button
              type="submit"
              disabled={loading || !playerName.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              {loading ? '作成中...' : 'ルームを作成'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('select'); setFormError(null) }}
              className="w-full text-purple-300 hover:text-white text-sm transition-colors"
            >
              ← 戻る
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-1">ルームID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="例: AB1C2D"
                maxLength={8}
                className="w-full bg-white/20 text-white placeholder-white/40 border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono text-lg tracking-widest"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-1">あなたの名前</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前を入力..."
                maxLength={20}
                className="w-full bg-white/20 text-white placeholder-white/40 border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            {formError && (
              <p className="text-red-300 text-sm">{formError}</p>
            )}
            <button
              type="submit"
              disabled={loading || !playerName.trim() || !roomId.trim()}
              className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              {loading ? '参加中...' : 'ルームに参加'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('select'); setFormError(null) }}
              className="w-full text-purple-300 hover:text-white text-sm transition-colors"
            >
              ← 戻る
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
