import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Layout from './components/layout/Layout.jsx'
import Servicios from './pages/Servicios.jsx'
import Blog from './pages/blog/Blog.jsx'
import BlogPost from './pages/blog/BlogPost.jsx'
import Keelwise from './pages/keelwise/Keelwise.jsx'
import KeelwiseGracias from './pages/keelwise/Gracias.jsx'
import Terminos from './pages/legal/Terminos.jsx'
import Privacidad from './pages/legal/Privacidad.jsx'
import Arrepentimiento from './pages/legal/Arrepentimiento.jsx'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-400-italic.css'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/keelwise" element={<Keelwise />} />
          <Route path="/keelwise/gracias" element={<KeelwiseGracias />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/arrepentimiento" element={<Arrepentimiento />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
)
