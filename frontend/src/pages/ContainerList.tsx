import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Container {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
}

export default function ContainerList() {
  const [containers, setContainers] = useState<Container[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/containers')
      .then((r) => r.json())
      .then(setContainers)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p>Error: {error}</p>

  return (
    <main>
      <h1>Containers</h1>
      <ul>
        {containers.map((c) => (
          <li key={c.Id}>
            <Link to={`/containers/${c.Id}`}>
              {c.Names[0]} — {c.Image} — {c.State}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
