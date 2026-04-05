'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocketContext } from '@/contexts/SocketContext'
import { CARD_VALUES, type Player } from '@/lib/types'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  const { room, connected, myId, joinRoom, vote, revealVotes, resetVotes, setStory } = useSocketContext()

  const [joined, setJoined] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [storyInput, setStoryInput] = useState('')
  const [nextStory, setNextStory] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const hasJoined = useRef(false)

  // Auto-join using stored credentials (room creator navigating from home page)
  useEffect(() => {
    if (!connected || hasJoined.current) return

    // Already in the room (e.g. creator just navigated from home) — skip joinRoom to avoid duplicate
    if (room && myId && room.players.some((p: Player) => p.id === myId)) {
      hasJoined.current = true
      const storedName = sessionStorage.getItem('playerName')
      if (storedName) setPlayerName(storedName)
      setJoined(true)
      return
    }

    const storedName = sessionStorage.getItem('playerName')
    const storedRoom = sessionStorage.getItem('roomId')
    if (storedName && storedRoom === roomId) {
      hasJoined.current = true
      setPlayerName(storedName)
      joinRoom(roomId, storedName)
        .then(() => setJoined(true))
        .catch(() => {
          hasJoined.current = false
          setJoinError('ルームへの再接続に失敗しました')
        })
    }
  }, [connected, roomId, joinRoom, room, myId])

  // Sync story input when room story changes
  useEffect(() => {
    if (room) setStoryInput(room.story)
  }, [room?.story])

  const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!playerName.trim()) return
    try {
      await joinRoom(roomId, playerName.trim())
      sessionStorage.setItem('playerName', playerName.trim())
      sessionStorage.setItem('roomId', roomId)
      hasJoined.current = true
      setJoined(true)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '参加に失敗しました')
    }
  }

  const me = room?.players.find((p: Player) => p.id === myId)
  const isHost = me?.isHost ?? false
  const allVoted = room?.players.every((p: Player) => p.vote !== null) ?? false

  const handleReveal = () => revealVotes()

  const handleReset = () => {
    resetVotes(nextStory)
    setNextStory('')
  }

  const handleStoryBlur = () => {
    if (storyInput !== room?.story) setStory(storyInput)
  }

  const getVoteStats = () => {
    if (!room || room.phase !== 'revealed') return null
    const votes = room.players.map((p: Player) => p.vote).filter((v: string | null): v is string => v !== null)
    const numeric = votes.map((v: string) => Number(v)).filter((n: number) => !isNaN(n) && votes[0] !== '?')
    if (numeric.length === 0) return null
    const avg = numeric.reduce((a: number, b: number) => a + b, 0) / numeric.length
    const min = Math.min(...numeric)
    const max = Math.max(...numeric)
    return { avg: avg.toFixed(1), min, max }
  }

  const stats = getVoteStats()

  if (!joined) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white text-center mb-2">ルームに参加</h2>
          <p className="text-purple-200 text-center text-sm mb-6">
            ルームID: <span className="font-mono font-bold text-white">{roomId}</span>
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
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
            {joinError && <p className="text-red-300 text-sm">{joinError}</p>}
            <button
              type="submit"
              disabled={!playerName.trim() || !connected}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all"
            >
              参加する
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full text-purple-300 hover:text-white text-sm transition-colors"
            >
              ← トップへ戻る
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">接続中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Planning Poker</h1>
            <p className="text-purple-300 text-sm">
              ルームID: <span className="font-mono font-bold text-white">{roomId}</span>
              <button
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="ml-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors text-purple-200"
              >
                コピー
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-purple-300 text-sm">{room.players.length}人参加中</span>
          </div>
        </div>

        {/* Story input */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
          <label className="block text-purple-200 text-sm mb-2">現在のストーリー / タスク</label>
          {isHost ? (
            <input
              type="text"
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              onBlur={handleStoryBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleStoryBlur()}
              placeholder="見積もるストーリーやタスクを入力..."
              className="w-full bg-white/20 text-white placeholder-white/40 border border-white/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          ) : (
            <p className="text-white px-1">{room.story || <span className="text-white/40 italic">ホストがストーリーを設定中...</span>}</p>
          )}
        </div>

        {/* Players grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {room.players.map((player: Player) => (
            <PlayerCard key={player.id} player={player} isMe={player.id === myId} phase={room.phase} />
          ))}
        </div>

        {/* Stats */}
        {room.phase === 'revealed' && stats && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20 flex justify-around text-center">
            <div>
              <p className="text-purple-300 text-xs mb-1">平均</p>
              <p className="text-white text-2xl font-bold">{stats.avg}</p>
            </div>
            <div>
              <p className="text-purple-300 text-xs mb-1">最小</p>
              <p className="text-white text-2xl font-bold">{stats.min}</p>
            </div>
            <div>
              <p className="text-purple-300 text-xs mb-1">最大</p>
              <p className="text-white text-2xl font-bold">{stats.max}</p>
            </div>
          </div>
        )}

        {/* Voting cards */}
        {room.phase === 'voting' && (
          <div>
            <p className="text-purple-200 text-sm text-center mb-3">カードを選んで投票</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {CARD_VALUES.map((val) => (
                <button
                  key={val}
                  onClick={() => vote(val)}
                  className={`w-14 h-20 rounded-xl font-bold text-xl transition-all duration-150 shadow-lg border-2
                    ${me?.vote === val
                      ? 'bg-indigo-400 border-indigo-300 text-white scale-110 shadow-indigo-500/50'
                      : 'bg-white/20 border-white/30 text-white hover:bg-white/30 hover:scale-105'
                    }`}
                >
                  {val}
                </button>
              ))}
            </div>

            {isHost && (
              <div className="flex justify-center">
                <button
                  onClick={handleReveal}
                  disabled={!allVoted}
                  className="bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105"
                >
                  {allVoted
                    ? '投票を公開する'
                    : `待機中... (${room.players.filter((p: Player) => p.vote !== null).length}/${room.players.length}人投票済み)`}
                </button>
              </div>
            )}
            {!isHost && (
              <p className="text-center text-purple-300 text-sm">
                {allVoted
                  ? 'ホストが公開するのを待っています...'
                  : `${room.players.filter((p: Player) => p.vote !== null).length}/${room.players.length}人投票済み`}
              </p>
            )}
          </div>
        )}

        {/* Revealed state */}
        {room.phase === 'revealed' && isHost && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-sm">
              <label className="block text-purple-200 text-sm mb-1">次のストーリー（任意）</label>
              <input
                type="text"
                value={nextStory}
                onChange={(e) => setNextStory(e.target.value)}
                placeholder="次のストーリーを入力..."
                className="w-full bg-white/20 text-white placeholder-white/40 border border-white/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={handleReset}
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105"
            >
              次のラウンドへ
            </button>
          </div>
        )}
        {room.phase === 'revealed' && !isHost && (
          <p className="text-center text-purple-300 text-sm">ホストが次のラウンドを開始するのを待っています...</p>
        )}
      </div>
    </main>
  )
}

function PlayerCard({ player, isMe, phase }: { player: Player; isMe: boolean; phase: 'voting' | 'revealed' }) {
  const hasVoted = player.vote !== null

  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border flex flex-col items-center gap-3 transition-all
      ${isMe ? 'border-indigo-400/60' : 'border-white/20'}`}>
      <div className="flex items-center gap-2">
        <span className="text-white font-medium text-sm truncate max-w-[80px]">{player.name}</span>
        {player.isHost && <span className="text-yellow-300 text-xs">👑</span>}
        {isMe && <span className="text-indigo-300 text-xs">(自分)</span>}
      </div>
      <div className={`w-12 h-16 rounded-lg flex items-center justify-center text-lg font-bold border-2 transition-all
        ${phase === 'revealed' && hasVoted
          ? 'bg-white text-indigo-900 border-indigo-300 shadow-lg'
          : hasVoted
            ? 'bg-indigo-500/60 border-indigo-400 text-white'
            : 'bg-white/10 border-white/20 text-white/30'
        }`}>
        {phase === 'revealed' ? (player.vote ?? '—') : (hasVoted ? '✓' : '?')}
      </div>
    </div>
  )
}
