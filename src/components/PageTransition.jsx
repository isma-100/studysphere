// src/components/PageTransition.jsx
// Wraps page content in a smooth fade+slide animation
import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import './PageTransition.css'

export default function PageTransition({ children }) {
  const location = useLocation()
  const [display, setDisplay] = useState(children)
  const [phase,   setPhase]   = useState('in') // 'in' | 'out'
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname === prevPath.current) return
    prevPath.current = location.pathname
    setPhase('out')
    const t = setTimeout(() => {
      setDisplay(children)
      setPhase('in')
    }, 150)
    return () => clearTimeout(t)
  }, [location.pathname])

  useEffect(() => { setDisplay(children) }, [children])

  return (
    <div className={`pt-root pt-${phase}`}>
      {display}
    </div>
  )
}
