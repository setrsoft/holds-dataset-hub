import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import { AddHoldPage } from './pages/AddHoldPage'
import { HomePage } from './pages/HomePage'
import { IdentifyPage } from './pages/IdentifyPage'

// Match Vite base (e.g. /holds-dataset-hub/ in production) so routes work when app is served from a subpath
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add-hold" element={<AddHoldPage />} />
          <Route path="/identify" element={<IdentifyPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
