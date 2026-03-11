// src/components/SkeletonCard.jsx — reusable skeleton loader
import './SkeletonCard.css'

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="sk-card">
      <div className="sk-header">
        <div className="skel sk-circle" />
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
          <div className="skel sk-line" style={{width:'55%'}} />
          <div className="skel sk-line" style={{width:'35%',height:10}} />
        </div>
      </div>
      {Array.from({length:lines}).map((_,i)=>(
        <div key={i} className="skel sk-line" style={{width: i===lines-1?'65%':'100%', marginTop:8}} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="sk-list">
      {Array.from({length:count}).map((_,i)=><SkeletonCard key={i} lines={2}/>)}
    </div>
  )
}
