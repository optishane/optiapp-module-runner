import { useState } from 'react'
// import './App.css'
import HomePage from './components/HomePage/HomePage'
import './index.css';

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <HomePage />
    </div>
  )
}

export default App
