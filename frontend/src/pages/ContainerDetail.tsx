import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>()
  const [lines, setLines] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    const ws = new WebSocket(`ws://localhost:8080/ws/logs/${id}`)
    ws.onmessage = (e) => {
      setLines((prev) => [...prev, e.data])
    }
    return () => ws.close()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <main>
      <h1>Logs — {id?.slice(0, 12)}</h1>
      <pre style={{ background: '#1a1d27', padding: '1rem', overflowY: 'auto', maxHeight: '80vh' }}>
        {lines.join('\n')}
        <div ref={bottomRef} />
      </pre>
    </main>
  )
}
