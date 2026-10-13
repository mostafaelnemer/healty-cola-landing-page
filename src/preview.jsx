import { createRoot } from 'react-dom/client'
import PreviewHost from './PreviewHost.jsx'
import { LandingPreview } from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(<PreviewHost site="cola" Landing={LandingPreview} />)
