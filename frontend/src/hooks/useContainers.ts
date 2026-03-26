import { useEffect, useState } from 'react'

interface Container {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
}

export function useContainers() {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/containers')
      .then((r) => r.json())
      .then((data) => {
        setContainers(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  return { containers, loading, error }
}
